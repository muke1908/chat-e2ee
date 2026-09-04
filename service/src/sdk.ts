import { configContext, setConfig } from './configContext';
import type { EncryptionEnvelope, EncryptionStrategy } from './crypto/strategy';
import { resolveEncryptionStrategyFactory } from './crypto/registry';
import { deriveChannelSecrets } from './crypto/inviteCrypto';
import { ReplayGuard } from './utils/replayGuard';
import { deleteLink, getLink } from './api/links';
import { getUsersInChannel } from './api/messages';
import { configType, type IChatE2EE, type ISendMessageReturn, type LinkObjType, type TypeUsersInChannel } from './public/types';
import { SocketInstance, type RawChatMessage, type RawSignalMessage, type SubscriptionType } from './socket/socket';
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
export type { IE2ECall } from './webrtc/webrtcCall';

export const utils = {
    generateUUID
}

const logger = new Logger();
export const createChatInstance = (config?: Partial<configType>): IChatE2EE => {
    logger.log('Creating new instance');
    return new ChatE2EE(config);
}

/** Shape of a decrypted chat payload (see `handleRawChatMessage`). */
type ChatPlaintext = { seq: number, timestamp: number, text: string, image?: string };

/** JSON-serialize an arbitrary payload into raw bytes — the wire format `EncryptionStrategy.encrypt()` expects. */
const encodePayload = (payload: unknown): ArrayBuffer => new TextEncoder().encode(JSON.stringify(payload)).buffer as ArrayBuffer;

/** Deserialize raw bytes produced by `EncryptionStrategy.decrypt()` back into JSON. */
const decodePayload = <T>(bytes: ArrayBuffer): T => JSON.parse(new TextDecoder().decode(bytes)) as T;

class ChatE2EE implements IChatE2EE {
    private roomId?: string;
    private userId?: string;

    /**
     * Two independent `EncryptionStrategy` instances, one per logical
     * channel this SDK maintains (chat, WebRTC signaling) — created from
     * the same factory (secure default, disabled, or a custom registered
     * strategy) but never sharing in-memory state with each other. `ChatE2EE`
     * owns all routing, JSON<->byte serialization, and replay/protocol
     * validation around them; a strategy itself never sees a room id,
     * channel name, or anything else application-specific.
     */
    private chatStrategy: EncryptionStrategy;
    private signalingStrategy: EncryptionStrategy;
    /** True once `setChannel()` has initialized both strategy instances for the active room. */
    private channelReady = false;

    //To Do: Fix types
    private subscriptions: Map<string, Set<Function>> = new Map();
    private callSubscriptions: Map<string, Set<Function>> = new Map();
    private socket!: SocketInstance;

    private subscriptionLogger = logger.createChild('Subscription');
    private callLogger = logger.createChild('Call');
    private chatLogger = logger.createChild('Chat');
    private signalSeq = 0;
    private chatSeq = 0;
    private activeCallId?: string;
    private outgoingInviteTimeout?: ReturnType<typeof setTimeout>;
    private callLifecycleState: CallLifecycleState = 'idle';
    private lastSignalSeqByCall: Map<string, number> = new Map();
    private chatReplayGuard: ReplayGuard = new ReplayGuard();

    private initialized = false;


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
                if (state === 'failed' && this.shouldSelfHealFailed()) {
                    this.updateCallLifecycle('connecting');
                    return;
                }
                const reason: CallEndReason = state === 'failed' ? 'failed' : 'remote-end';
                this.endCall(reason);
            } else if (state === 'disconnected') {
                this.updateCallLifecycle(this.isSelfHealingEnabled() ? 'connecting' : 'ice-failed');
            }
        })
        call.on('call-metrics', (metrics) => {
            this.callSubscriptions.get("call-metrics")?.forEach((cb) => cb(metrics));
        });
        call.on('ice-journey', (event) => {
            this.callSubscriptions.get("ice-journey")?.forEach((cb) => cb(event));
        });
    }
    constructor(private readonly config: Partial<configType> = {}) {
        if (Object.keys(config).length > 0) {
            setConfig(config);
        }
        // Resolved once per instance (not persisted to the shared global
        // config) so multiple ChatE2EE instances can run different
        // strategies concurrently. Throws immediately for an unknown
        // strategy id — no lazy/deferred failure at setChannel() time.
        // The factory is called twice so the chat and signaling strategy
        // instances are always genuinely distinct, even though they share
        // the same underlying implementation.
        const strategyFactory = resolveEncryptionStrategyFactory(config?.encryption?.strategy);
        this.chatStrategy = strategyFactory();
        this.signalingStrategy = strategyFactory();
    }

    public async init(): Promise<void> {
        const initLogger = logger.createChild('Init');
        initLogger.log(`Started.`);

        this.createSocketSubcription();

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

    /**
     * Establishes the per-room encryption session via the configured
     * strategy (HKDF-SHA256/AES-GCM by default) and joins the room.
     * `secret` never leaves this device — only `roomId` and `userId` are
     * sent to the server.
     */
    public async setChannel(roomId: string, secret: string, userId: string, userName?: string): Promise<void> {
        this.checkInitialized();
        logger.log(`setChannel(), ${JSON.stringify({ roomId, userId, userName })}`);
        if (!roomId || !secret) {
            throw new Error('setChannel() requires both a roomId and an invitation secret.');
        }
        // Domain-separated opaque secrets are derived here, entirely outside
        // the strategy layer — each strategy instance only ever sees its
        // own secret, never the roomId or the fact that a sibling instance
        // exists for the other channel.
        const { chatSecret, signalingSecret } = await deriveChannelSecrets(secret);
        await this.chatStrategy.initialize(chatSecret);
        await this.signalingStrategy.initialize(signalingSecret);
        this.channelReady = true;
        this.roomId = roomId;
        this.userId = userId;
        // A fresh room join starts a fresh sequence-number space: forget any
        // sequence numbers remembered from a previous setChannel() call on
        // this instance, otherwise a peer restarting their own counter would
        // have every message rejected as a replay.
        this.chatSeq = 0;
        this.chatReplayGuard.clear();
        this.socket.joinChat({ userID: this.userId, channelID: this.roomId });
        return;
    }

    /**
     * True once the configured strategy's session is ready (i.e. as soon as
     * setChannel() has resolved) *and* the strategy actually provides
     * confidentiality. Always `false` for an explicitly disabled/no-op
     * strategy, even once its session is ready.
     */
    public isEncrypted(): boolean {
        this.checkInitialized();
        logger.log(`isEncrypted()`);
        return this.channelReady && this.chatStrategy.encrypted;
    }

    public async delete(): Promise<void> {
        logger.log(`delete()`);
        this.checkInitialized();
        await deleteLink({ channelID: this.roomId });
        this.clearChannelSecrets();
    }

    public async getUsersInChannel(): Promise<TypeUsersInChannel> {
        logger.log(`getUsersInChannel()`);
        this.checkInitialized();
        return getUsersInChannel({ channelID: this.roomId });
    }

    public encrypt({ image, text }: { image: string, text: string }): { send: () => Promise<ISendMessageReturn> } {
        logger.log(`encrypt()`);
        this.checkInitialized();

        return ({
            send: async () => {
                this.assertChannelReady();
                const seq = ++this.chatSeq;
                const payload: ChatPlaintext = {
                    seq,
                    timestamp: Date.now(),
                    text,
                    image,
                };
                const envelope = await this.chatStrategy.encrypt(encodePayload(payload));
                const { id, timestamp } = await this.socket.sendChatMessage(envelope);
                return { id: String(id), timestamp: String(timestamp) };
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
        this.clearChannelSecrets();
        this.initialized = false;
    }

    public async startCall(): Promise<E2ECall> {
        // isSupported() is a basic RTCPeerConnection feature-detection check
        // (see WebRTCCall.isSupported) — there is no encoded-transform
        // capability gate any more, since media relies solely on WebRTC's
        // standard DTLS-SRTP transport encryption.
        if(!WebRTCCall.isSupported()) {
            throw new Error('WebRTC is not supported in this environment.');
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
        this.endLocalCall('rejected', 'rejected');
    }

    public async cancelCall(): Promise<void> {
        if (!this.activeCallId) {
            return;
        }
        await this.sendControlSignal('call-cancel', 'cancelled');
        this.endLocalCall('cancelled', 'cancelled');
    }

    public async endCall(reason: CallEndReason = 'local-end'): Promise<void> {
        if (this.activeCallId) {
            await this.sendControlSignal('call-end', reason);
        }
        this.endLocalCall(reason);
    }

    public async restartIce(): Promise<void> {
        const call = this.callSignalRouter.activeCall;
        if (!call) {
            throw new Error('No active call to restart ICE.');
        }
        await call.restartIce();
    }

    /**
     * Decrypts an incoming chat envelope and fans it out to `chat-message`
     * subscribers. Any failure (unknown version, wrong room, bad auth tag)
     * or replayed/duplicate sequence number drops the message outright —
     * there is no plaintext fallback and no partial delivery.
     */
    private async handleRawChatMessage(msg: RawChatMessage): Promise<void> {
        this.assertChannelReady();
        this.assertEnvelopeMatchesStrategy(msg.envelope, this.chatStrategy);
        const payload = decodePayload<ChatPlaintext>(await this.chatStrategy.decrypt(msg.envelope));
        if (!this.chatReplayGuard.accept('chat', payload.seq)) {
            this.chatLogger.log(`Dropping replayed/duplicate chat message, seq=${payload.seq}`);
            return;
        }
        this.subscriptions.get('chat-message')?.forEach((cb) => cb({
            sender: msg.sender,
            message: payload.text,
            image: payload.image,
            id: msg.id,
            timestamp: msg.timestamp,
        }));
    }

    /**
     * Decrypts an incoming WebRTC signaling envelope before handing it to
     * the existing call-lifecycle/signal-routing logic. Any decryption
     * failure is treated as a signaling failure — the payload is dropped,
     * never interpreted as plaintext.
     */
    private async handleRawWebrtcSignal(msg: RawSignalMessage): Promise<void> {
        this.assertChannelReady();
        this.assertEnvelopeMatchesStrategy(msg.envelope, this.signalingStrategy);
        const payload = decodePayload<WebRtcSignalPayload>(await this.signalingStrategy.decrypt(msg.envelope));
        await this.handleCallSignal(payload);
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
                this.endLocalCall('rejected', 'rejected');
            }
            return;
        }

        if (data.type === 'call-cancel') {
            if (this.activeCallId && data.callId === this.activeCallId) {
                this.callSubscriptions.get("call-cancelled")?.forEach((cb) => cb({ callId: data.callId }));
                this.endLocalCall('cancelled', 'cancelled');
            }
            return;
        }

        if (data.type === 'call-timeout') {
            if (this.activeCallId && data.callId === this.activeCallId) {
                this.callSubscriptions.get("call-timeout")?.forEach((cb) => cb({ callId: data.callId }));
                this.endLocalCall('timeout', 'timeout');
            }
            return;
        }

        if (data.type === 'call-end') {
            if (this.activeCallId && data.callId === this.activeCallId) {
                this.callSubscriptions.get("call-ended")?.forEach((cb) => cb({ callId: data.callId, reason: data.reason }));
                this.endLocalCall('remote-end');
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
        this.assertChannelReady();
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
        await this.sendSignal(signal);
    }

    /** Seals a signaling payload through the configured strategy's signaling instance and relays it over the socket. */
    private async sendSignal(payload: WebRtcSignalPayload): Promise<void> {
        this.assertChannelReady();
        const envelope = await this.signalingStrategy.encrypt(encodePayload(payload));
        await this.socket.sendWebrtcSignal(envelope);
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
            this.endLocalCall('timeout', 'timeout');
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

    private endLocalCall(reason: CallEndReason, terminalState: CallLifecycleState = 'ended'): void {
        this.clearOutgoingInviteTimeout();
        this.updateCallLifecycle('ending', reason);
        this.callSignalRouter.activeCall?.endCall();
        this.callSignalRouter.reset();
        this.callSubscriptions.get("call-removed")?.forEach((cb) => cb());
        if (this.activeCallId) {
            this.lastSignalSeqByCall.delete(this.activeCallId);
        }
        if (terminalState !== 'ended') {
            this.updateCallLifecycle(terminalState, reason);
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
        this.socket = new SocketInstance(subscriptionContext, logger.createChild('Socket'), {
            onRawChatMessage: (msg) => {
                this.handleRawChatMessage(msg).catch((error) => {
                    this.chatLogger.log('Rejected chat message (dropped, no fallback):', error);
                });
            },
            onRawWebrtcSignal: (msg) => {
                this.handleRawWebrtcSignal(msg).catch((error) => {
                    this.callLogger.log('Rejected signaling message (dropped, no fallback):', error);
                    this.updateCallLifecycle('signaling-failed');
                });
            },
        });
    }

    private checkInitialized(): void {
        if(!this.initialized) {
            throw new Error('ChatE2EE is not initialized, call init()');
        }
    }

    /** Throws unless setChannel() has established a ready encryption session for an active room. */
    private assertChannelReady(): void {
        if (!this.roomId || !this.channelReady) {
            throw new Error('Channel is not ready: call setChannel() with a valid invite secret first.');
        }
    }

    /**
     * Protocol-validation duty `ChatE2EE` owns on behalf of every strategy:
     * reject a malformed or foreign-strategy envelope outright, before ever
     * calling into `strategy.decrypt()`. There is never a fallback to a
     * different strategy instance.
     */
    private assertEnvelopeMatchesStrategy(envelope: EncryptionEnvelope, strategy: EncryptionStrategy): void {
        if (!envelope || typeof envelope !== 'object') {
            throw new Error('Invalid envelope: expected an object.');
        }
        if (envelope.strategy !== strategy.id) {
            throw new Error(`Unsupported encryption strategy: expected "${strategy.id}", got "${String(envelope.strategy)}".`);
        }
    }

    private clearChannelSecrets(): void {
        // destroy() is synchronous, but a custom strategy's implementation
        // throwing must still not prevent local state from being cleared or
        // the sibling strategy from being torn down.
        try {
            this.chatStrategy.destroy();
        } catch {
            // ignore: best-effort teardown, see comment above.
        }
        try {
            this.signalingStrategy.destroy();
        } catch {
            // ignore: best-effort teardown, see comment above.
        }
        this.channelReady = false;
        this.roomId = undefined;
        this.userId = undefined;
        this.chatSeq = 0;
        this.signalSeq = 0;
        this.chatReplayGuard.clear();
        this.lastSignalSeqByCall.clear();
    }

    private createWebRtcCall(callId?: string): WebRTCCall {
        this.checkInitialized();
        const resolvedCallId = callId || generateUUID();
        const call = new WebRTCCall(
            (payload) => this.sendSignal(payload),
            this.callLogger,
            () => ({
                callId: resolvedCallId,
                seq: ++this.signalSeq,
                timestamp: Date.now(),
            }),
            this.config.webrtc || configContext().webrtc,
            (reason) => {
                this.callLogger.log(`Self-healing ICE restart requested after ${reason}`);
                call.restartIce(`auto-${reason}`).catch((error) => {
                    this.callLogger.log('Automatic ICE restart failed:', error);
                    this.endCall('failed');
                });
            },
        );
        this.setupCallSubs(call)
        return call;
    }

    private isSelfHealingEnabled(): boolean {
        return Boolean((this.config.webrtc || configContext().webrtc)?.selfHealing?.enabled);
    }

    private shouldSelfHealFailed(): boolean {
        const selfHealing = (this.config.webrtc || configContext().webrtc)?.selfHealing;
        return Boolean(selfHealing?.enabled && selfHealing.restartOnFailed !== false);
    }
}

export * from './public/types';
export type { CallLifecycleState, CallEndReason, CallLifecycleUpdate, WebRtcConfig, CallMetrics, IceJourneyEvent } from './webrtc/types';

// ---------------------------------------------------------------------------
// Encryption strategy public API
// ---------------------------------------------------------------------------
// The SDK does not couple to any specific encryption primitive. Every
// strategy (the AES-256-GCM secure default, the explicit "disabled" no-op,
// or a custom one) is registered/selected through this factory-style API,
// in keeping with the `createChatInstance()` factory pattern above.
export {
    registerEncryptionStrategy,
    unregisterEncryptionStrategy,
    hasEncryptionStrategy,
    listEncryptionStrategyIds,
    getEncryptionStrategy,
    DEFAULT_ENCRYPTION_STRATEGY_ID,
    NO_ENCRYPTION_STRATEGY_ID,
} from './crypto/registry';
export type { EncryptionStrategy, EncryptionStrategyFactory, EncryptionEnvelope } from './crypto/strategy';
