import { type ISymmetricEncryption } from './crypto/cryptoAES';
import { setConfig } from './configContext';
import { cryptoUtils } from './crypto/cryptoRSA';
import { type IAsymmetricEncryption } from './crypto/cryptoRSA';
import { EncryptionFactory } from './crypto/encryptionFactory';
import { deleteLink, getLink } from './api/links';
import { getUsersInChannel, sendMessage } from './api/messages';
import { configType, type EncryptionStrategy, type IChatE2EE, type ISendMessageReturn, type LinkObjType, type TypeUsersInChannel } from './public/types';
import { KeyExchangeManager } from './keyExchange/keyExchangeManager';
import { SocketInstance, type SubscriptionType } from './socket/socket';
import { Logger } from './utils/logger';
export { setConfig } from './configContext';
import { generateUUID } from './utils/uuid';
import {
    WebRTCCall,
    E2ECall,
    peerConnectionEvents,
    CallSignalRouter,
    type PeerConnectionEventType,
    type WebRtcSignalPayload,
} from './webrtc/webrtcCall';
import { type CallControlSignal, type CallEndReason, type CallLifecycleState, type CallLifecycleUpdate } from './webrtc/types';
import { webrtcSession } from './api/webrtcSession';
export type { IE2ECall } from './webrtc/webrtcCall';

export const utils = {
    decryptMessage: (ciphertext: string, privateKey: string) => cryptoUtils.decryptMessage(ciphertext, privateKey),
    generateUUID
}

const logger = new Logger();
export const createChatInstance = (config?: Partial<configType>, encryptionStrategy?: EncryptionStrategy): IChatE2EE => {
    logger.log('Creating new instance');
    return new ChatE2EE(config, encryptionStrategy);
}

class ChatE2EE implements IChatE2EE {
    private channelId?: string;
    private userId?: string;

    private privateKey?: string;
    private publicKey?: string;

    //To Do: Fix types
    private subscriptions: Map<string, Set<Function>> = new Map();
    private callSubscriptions: Map<string, Set<Function>> = new Map();
    private socket!: SocketInstance;

    private subscriptionLogger = logger.createChild('Subscription');
    private callLogger = logger.createChild('Call');
    private keyExchangeLogger = logger.createChild('KeyExchange');
    private signalSeq = 0;
    private activeCallId?: string;
    private outgoingInviteTimeout?: ReturnType<typeof setTimeout>;
    private callLifecycleState: CallLifecycleState = 'idle';
    private lastSignalSeqByCall: Map<string, number> = new Map();

    private initialized = false;

    private symEncryption: ISymmetricEncryption;
    private asymEncryption: IAsymmetricEncryption;
    private keyExchange: KeyExchangeManager;

    private callSignalRouter: CallSignalRouter = new CallSignalRouter(
        () => this.createWebRtcCall(this.activeCallId || this.callSignalRouter.pendingCallId),
        () => {
            this.callSubscriptions.get("call-added")?.forEach((cb) => cb(this.activeCall));
        },
        (callId) => {
            this.activeCallId = callId;
            if (this.callLifecycleState !== 'incoming') {
                this.updateCallLifecycle('incoming');
                this.callSubscriptions.get("call-invite")?.forEach((cb) => cb({ callId }));
            }
        },
        this.callLogger,
    );

    private setupCallSubs(call: WebRTCCall): void {
        call.on('state-changed', (state) => {
            if (state === 'connecting') {
                this.updateCallLifecycle('connecting');
            }
            if (state === 'connected') {
                this.clearOutgoingInviteTimeout();
                this.updateCallLifecycle('connected');
            }
            if(state === 'failed' || state === 'closed') {
                this.callLogger.log(`Ending call, RTCPeerConnectionState: ${state}`);
                const reason: CallEndReason = state === 'failed' ? 'failed' : 'remote-end';
                this.endCall(reason);
            } else if (state === 'disconnected') {
                this.updateCallLifecycle('ice-failed');
            }
        })
    }
    constructor(config?: Partial<configType>, encryptionStrategy?: EncryptionStrategy) {
        config && setConfig(config);
        const defaults = EncryptionFactory.create();
        this.symEncryption = encryptionStrategy?.symmetric ?? defaults.symmetric;
        this.asymEncryption = encryptionStrategy?.asymmetric ?? defaults.asymmetric;
        this.keyExchange = new KeyExchangeManager(
            this.symEncryption,
            this.asymEncryption,
            () => ({
                userId: this.userId,
                channelId: this.channelId,
                publicKey: this.publicKey,
                privateKey: this.privateKey,
            }),
            this.keyExchangeLogger,
        );
    }

    public async init(): Promise<void> {
        const initLogger = logger.createChild('Init');
        const evetLogger = logger.createChild('Events');
        initLogger.log(`Started.`);

        this.createSocketSubcription();
        const { privateKey, publicKey } = await this.asymEncryption.generateKeypairs();

        this.privateKey = privateKey;
        this.publicKey = publicKey;

        this.on('on-alice-join', async () => {
            evetLogger.log("Receiver connected.");
            // Now that the receiver has joined, sync their RSA public key and,
            // if now known, share our AES key encrypted with it.
            await this.keyExchange.syncWithReceiver(initLogger);
        })

        this.on("on-alice-disconnect", () => {
            evetLogger.log("Receiver disconnected");
            this.keyExchange.onReceiverDisconnected();
        });

        this.on('webrtc-session-description', (data: WebRtcSignalPayload) => {
            this.handleCallSignal(data).catch((error) => {
                this.callLogger.log('Failed to handle call signal', error);
                this.updateCallLifecycle('signaling-failed');
            });
        });


        initLogger.log(`Initializing symmetric Encryption for webrtc`);
        await this.symEncryption.init();
        initLogger.log(`Initialized symmetric Encryption for webrtc`);
        initLogger.log(`Finished.`);
        this.initialized = true;
    }

    public get activeCall(): E2ECall | null {
        const call = this.callSignalRouter.activeCall;
        if(!call) {
            return null;
        }
        return new E2ECall(call);
    }

    public async getLink(): Promise<LinkObjType> {
        logger.log('getLink()');
        return getLink();
    }

    public async setChannel(channelId: string, userId: string, userName?: string): Promise<void> {
        this.checkInitialized();
        logger.log(`setChannel(), ${JSON.stringify({ channelId, userId,userName })}`);
        this.channelId = channelId;
        this.userId = userId;

        // Share RSA public key (without AES key until we have receiver's RSA public key)
        await this.keyExchange.shareOwnPublicKey();
        this.socket.joinChat({ publicKey: this.publicKey!, userID: this.userId!, channelID: this.channelId!})
        // If the receiver's RSA public key is now known, share AES key encrypted with it
        await this.keyExchange.syncWithReceiver(logger);
        return;
    }

    public isEncrypted(): boolean {
        this.checkInitialized();
        logger.log(`isEncrypted()`);
        return this.keyExchange.hasReceiverPublicKey;
    }

    public async delete(): Promise<void> {
        logger.log(`delete()`);
        this.checkInitialized();
        await deleteLink({ channelID: this.channelId });
    }

    public async getUsersInChannel(): Promise<TypeUsersInChannel> {
        logger.log(`getUsersInChannel()`);
        this.checkInitialized();
        await this.keyExchange.refreshReceiverPublicKey(logger.createChild('getUsersInChannel'));
        return getUsersInChannel({ channelID: this.channelId });
    }

    public async sendMessage({ image, text }: { image: string, text: string }): Promise<ISendMessageReturn> {
        logger.log(`sendMessage()`);
        this.checkInitialized();
        return sendMessage({ channelID: this.channelId, userId: this.userId, image, text })
    }

    public encrypt({ image, text }: { image: string, text: string }): { send: () => Promise<ISendMessageReturn> } {
        logger.log(`encrypt()`);
        this.checkInitialized();

        return ({
            send: async () => {
                const receiverPublicKey = await this.resolveReceiverPublicKey();
                const encryptedText = await this.asymEncryption.encryptMessage(text, receiverPublicKey);
                return this.sendMessage({ image, text: encryptedText })
            }
        })
    }

    /**
     * Returns the receiver's public key, refreshing it once if it isn't known yet.
     * Encrypting without it produces a confusing WebCrypto `DataError`, so fail
     * with an actionable message instead.
     */
    private async resolveReceiverPublicKey(): Promise<string> {
        if (!this.keyExchange.hasReceiverPublicKey) {
            await this.keyExchange.refreshReceiverPublicKey(logger.createChild('encrypt'));
        }

        const receiverPublicKey = this.keyExchange.getReceiverPublicKey();
        if (!receiverPublicKey) {
            throw new Error('Cannot encrypt message: the receiver has not shared their public key yet.');
        }

        return receiverPublicKey;
    }

    public on(listener: string, callback: (...args: any[]) => void): void {
        const loggerWithInvocationId = this.subscriptionLogger.withInvocationId();
        let subscriptions = this.subscriptions;
        
        if(peerConnectionEvents.includes(listener as PeerConnectionEventType)) {
            subscriptions = this.callSubscriptions;
        }
        
        const sub = subscriptions.get(listener);
        if (sub) {
            if (sub.has(callback)) {
                loggerWithInvocationId.log(`Skipping, subscription: ${listener}`);
                return;
            }
            loggerWithInvocationId.log(`Created +1 : ${listener}`);
            sub.add(callback);
        } else {
            loggerWithInvocationId.log(`Created: ${listener}`);
            subscriptions.set(listener, new Set([callback]));
        }
    }

    public dispose(): void {
        this.checkInitialized();
        logger.log('dispose()');
        this.socket.dispose();
        this.subscriptions.clear();
        this.initialized = false;
    }

    public getKeyPair(): { privateKey: string, publicKey: string } {
        this.checkInitialized();
        return {
            privateKey: this.privateKey!,
            publicKey: this.publicKey!
        }
    }

    public async startCall(): Promise<E2ECall> {
        if(!WebRTCCall.isSupported()) {
            throw new Error('createEncodedStreams not supported.');
        }
        if(this.callSignalRouter.activeCall) {
            throw new Error('Call already active');
        }
        await this.assertCallPreconditions();
        this.activeCallId = generateUUID();
        this.signalSeq = 0;
        const webrtcCall = this.createWebRtcCall(this.activeCallId);
        this.callSignalRouter.attachCall(webrtcCall, this.activeCallId);
        this.updateCallLifecycle('initiating');
        await this.sendControlSignal('call-invite');
        this.updateCallLifecycle('ringing');
        this.scheduleOutgoingInviteTimeout();
        const call = new E2ECall(webrtcCall);
        return call;
    }

    public async acceptCall(): Promise<void> {
        if (!this.activeCallId) {
            throw new Error('Missing call identifier for incoming call.');
        }
        await this.sendControlSignal('call-accept');
        const call = this.callSignalRouter.acceptPendingOffer(this.activeCallId);
        if (call) {
            this.callSubscriptions.get("call-added")?.forEach((cb) => cb(this.activeCall));
        }
        this.updateCallLifecycle('connecting');
    }

    public async rejectCall(): Promise<void> {
        const pendingCallId = this.callSignalRouter.pendingCallId;
        if (!pendingCallId) {
            return;
        }
        this.activeCallId = pendingCallId;
        await this.sendControlSignal('call-reject', 'rejected');
        this.callSignalRouter.rejectPendingOffer();
        this.updateCallLifecycle('rejected', 'rejected');
        this.updateCallLifecycle('ended', 'rejected');
        this.activeCallId = undefined;
    }

    public async cancelCall(): Promise<void> {
        if (!this.activeCallId) {
            return;
        }
        await this.sendControlSignal('call-cancel', 'cancelled');
        this.endLocalCall('cancelled');
    }

    public async endCall(reason: CallEndReason = 'local-end'): Promise<void> {
        if (this.activeCallId) {
            await this.sendControlSignal('call-end', reason);
        }
        this.endLocalCall(reason);
    }

    private async handleCallSignal(data: WebRtcSignalPayload): Promise<void> {
        if (this.isStaleSignal(data)) {
            return;
        }
        if (data.type === 'call-invite') {
            if (this.callSignalRouter.activeCall || this.callSignalRouter.pendingCallId) {
                this.activeCallId = data.callId;
                await this.sendControlSignal('call-reject', 'rejected');
                return;
            }
            this.activeCallId = data.callId;
            this.updateCallLifecycle('incoming');
            this.callSubscriptions.get("call-invite")?.forEach((cb) => cb({ callId: data.callId }));
            return;
        }

        if (data.type === 'call-accept') {
            if (!this.activeCallId || data.callId !== this.activeCallId) {
                return;
            }
            this.clearOutgoingInviteTimeout();
            this.updateCallLifecycle('connecting');
            await this.callSignalRouter.activeCall?.startCall();
            return;
        }

        if (data.type === 'call-reject') {
            if (this.activeCallId && data.callId === this.activeCallId) {
                this.callSubscriptions.get("call-rejected")?.forEach((cb) => cb({ callId: data.callId }));
                this.endLocalCall('rejected');
                this.updateCallLifecycle('rejected', 'rejected');
            }
            return;
        }

        if (data.type === 'call-cancel') {
            if (this.activeCallId && data.callId === this.activeCallId) {
                this.callSubscriptions.get("call-cancelled")?.forEach((cb) => cb({ callId: data.callId }));
                this.endLocalCall('cancelled');
                this.updateCallLifecycle('cancelled', 'cancelled');
            }
            return;
        }

        if (data.type === 'call-timeout') {
            if (this.activeCallId && data.callId === this.activeCallId) {
                this.callSubscriptions.get("call-timeout")?.forEach((cb) => cb({ callId: data.callId }));
                this.endLocalCall('timeout');
                this.updateCallLifecycle('timeout', 'timeout');
            }
            return;
        }

        if (data.type === 'call-end') {
            if (this.activeCallId && data.callId === this.activeCallId) {
                this.callSubscriptions.get("call-ended")?.forEach((cb) => cb({ callId: data.callId, reason: data.reason }));
                this.endLocalCall('remote-end');
                this.updateCallLifecycle('ended', 'remote-end');
            }
            return;
        }

        this.callSignalRouter.handleSignal(data);
    }

    private async assertCallPreconditions(): Promise<void> {
        const users = await this.getUsersInChannel();
        if (!users || users.length < 2) {
            this.updateCallLifecycle('no-peer');
            throw new Error('No user available to accept call');
        }
        await this.resolveReceiverPublicKey();
    }

    private async sendControlSignal(type: CallControlSignal['type'], reason?: CallEndReason): Promise<void> {
        if (!this.activeCallId) {
            throw new Error('Cannot send control signal without active call ID.');
        }
        const signal: CallControlSignal = {
            type,
            callId: this.activeCallId,
            seq: ++this.signalSeq,
            timestamp: Date.now(),
            ...(reason ? { reason } : {}),
        };
        await webrtcSession({
            signal,
            sender: this.userId!,
            channelId: this.channelId!,
        });
    }

    private scheduleOutgoingInviteTimeout(): void {
        this.clearOutgoingInviteTimeout();
        this.outgoingInviteTimeout = setTimeout(async () => {
            if (this.callLifecycleState !== 'ringing' || !this.activeCallId) {
                return;
            }
            try {
                await this.sendControlSignal('call-timeout', 'timeout');
            } catch (error) {
                this.callLogger.log('Unable to send timeout signal', error);
            }
            this.callSubscriptions.get("call-timeout")?.forEach((cb) => cb({ callId: this.activeCallId }));
            this.endLocalCall('timeout');
            this.updateCallLifecycle('timeout', 'timeout');
        }, 30_000);
    }

    private clearOutgoingInviteTimeout(): void {
        if (this.outgoingInviteTimeout) {
            clearTimeout(this.outgoingInviteTimeout);
            this.outgoingInviteTimeout = undefined;
        }
    }

    private updateCallLifecycle(state: CallLifecycleState, reason?: CallEndReason): void {
        this.callLifecycleState = state;
        const payload: CallLifecycleUpdate = {
            state,
            callId: this.activeCallId,
            ...(reason ? { reason } : {}),
        };
        this.callSubscriptions.get("call-state-changed")?.forEach((cb) => cb(payload));
    }

    private endLocalCall(reason: CallEndReason): void {
        this.clearOutgoingInviteTimeout();
        this.updateCallLifecycle('ending', reason);
        this.callSignalRouter.activeCall?.endCall();
        this.callSignalRouter.reset();
        this.callSubscriptions.get("call-removed")?.forEach((cb) => cb());
        if (this.activeCallId) {
            this.lastSignalSeqByCall.delete(this.activeCallId);
        }
        this.activeCallId = undefined;
        this.updateCallLifecycle('ended', reason);
    }

    private isStaleSignal(signal: WebRtcSignalPayload): boolean {
        const last = this.lastSignalSeqByCall.get(signal.callId);
        if (typeof last === 'number' && signal.seq <= last) {
            this.callLogger.log(`Skipping stale signal ${signal.type} for call=${signal.callId}, seq=${signal.seq}`);
            return true;
        }
        this.lastSignalSeqByCall.set(signal.callId, signal.seq);
        return false;
    }

    private createSocketSubcription(): void {
        const subscriptionContext = () => this.subscriptions as SubscriptionType;
        this.socket = new SocketInstance(subscriptionContext, logger.createChild('Socket'));
    }

    private checkInitialized(): void {
        if(!this.initialized) {
            throw new Error('ChatE2EE is not initialized, call init()');
        }
    }

    private createWebRtcCall(callId?: string): WebRTCCall {
        this.checkInitialized();
        const resolvedCallId = callId || generateUUID();
        const call = new WebRTCCall(
            this.symEncryption,
            this.userId!,
            this.channelId!,
            this.callLogger,
            () => ({
                callId: resolvedCallId,
                seq: ++this.signalSeq,
                timestamp: Date.now(),
            }),
        );
        this.setupCallSubs(call)
        return call;
    }
}

export * from './public/types';
export { EncryptionFactory, type EncryptionStrategyConfig, type BuiltinSymmetricStrategy, type BuiltinAsymmetricStrategy } from './crypto/encryptionFactory';
export type { CallLifecycleState, CallEndReason, CallLifecycleUpdate } from './webrtc/types';