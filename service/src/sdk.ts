import { type ISymmetricEncryption } from './cryptoAES';
import { setConfig } from './configContext';
import { cryptoUtils } from './cryptoRSA';
import { type IAsymmetricEncryption } from './cryptoRSA';
import { EncryptionFactory } from './encryptionFactory';
import { deleteLink, getLink } from './api/links';
import { getUsersInChannel, sendMessage } from './api/messages';
import { configType, type EncryptionStrategy, type IChatE2EE, type ISendMessageReturn, type LinkObjType, type TypeUsersInChannel } from './public/types';
import { KeyExchangeManager } from './keyExchange/keyExchangeManager';
import { SocketInstance, type SubscriptionType } from './socket/socket';
import { Logger } from './utils/logger';
export { setConfig } from './configContext';
import { generateUUID } from './utils/uuid';
import { WebRTCCall, E2ECall, peerConnectionEvents, CallSignalRouter, type PeerConnectionEventType, type WebRtcSignalPayload } from './webrtc';
export type { IE2ECall } from './webrtc';

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

    private initialized = false;

    private symEncryption: ISymmetricEncryption;
    private asymEncryption: IAsymmetricEncryption;
    private keyExchange: KeyExchangeManager;

    private callSignalRouter: CallSignalRouter = new CallSignalRouter(
        () => this.createWebRtcCall(),
        (call) => {
            this.callSubscriptions.get("call-added")?.forEach((cb) => cb(this.activeCall));
        },
        this.callLogger,
    );

    private setupCallSubs(call: WebRTCCall): void {
        call.on('state-changed', (state) => {
            if(state === 'failed' || state === 'closed') {
                this.callLogger.log(`Ending call, RTCPeerConnectionState: ${state}`);
                this.endCall();
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
            this.callSignalRouter.handleSignal(data);
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

        const encryptedTextPromise = this.asymEncryption.encryptMessage(text, this.keyExchange.getReceiverPublicKey()!);
        return ({
            send: async () => {
                const encryptedText = await encryptedTextPromise;
                return this.sendMessage({ image, text: encryptedText })
            }
        })
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
        const webrtcCall = this.createWebRtcCall();
        this.callSignalRouter.attachCall(webrtcCall);
        await webrtcCall.startCall()
        const call = new E2ECall(webrtcCall);
        return call;
    }

    public async endCall(): Promise<void> {
        this.callSignalRouter.activeCall?.endCall();
        this.callSignalRouter.reset();
        this.callSubscriptions.get("call-removed")?.forEach((cb) => cb());   
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

    private createWebRtcCall(): WebRTCCall {
        this.checkInitialized();
        const call = new WebRTCCall(
            this.symEncryption,
            this.userId!,
            this.channelId!,
            this.callLogger,
        );
        this.setupCallSubs(call)
        return call;
    }
}

export * from './public/types';
export { EncryptionFactory, type EncryptionStrategyConfig, type BuiltinSymmetricStrategy, type BuiltinAsymmetricStrategy } from './encryptionFactory';