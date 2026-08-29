/**
 * Generic key-exchange / encryption-strategy abstraction.
 *
 * The SDK never talks to a concrete cryptographic primitive (HKDF, AES-GCM,
 * `CryptoKey`, ...) directly. Instead every channel (chat / signaling) is
 * sealed and opened through an `EncryptionStrategy`, resolved and invoked by
 * a `KeyExchangeManager`. This keeps the SDK's core (`sdk.ts`) and wire
 * types (`socket.ts`) completely decoupled from *how* confidentiality (if
 * any) is achieved, so:
 *
 *  - the current invite-secret HKDF + AES-256-GCM behaviour can remain the
 *    secure default without leaking its key types (`CryptoKey`, `InviteKeys`)
 *    outside of its own strategy module,
 *  - an explicit, intentional "disabled" (no-encryption) strategy can be
 *    selected for local development/testing without special-casing the SDK,
 *  - third parties can register and select entirely custom strategies
 *    (a different KDF, a different AEAD, a hardware-backed key store, ...)
 *    through the same interface.
 */

/** Logical channel a strategy seals/opens data for. Kept separate so a strategy may derive/scope keys per channel (domain separation). */
export type EncryptionChannel = 'chat' | 'signaling';

/**
 * Wire-level envelope shape shared by every strategy. `strategy` and `v` are
 * always present in plaintext (never secret) so a receiver can reject an
 * incompatible mode/protocol version *before* attempting to interpret
 * `data` at all — there is never a silent fallback to a different strategy
 * or an earlier/later envelope version.
 *
 * `data` is fully opaque to everything except the strategy that produced it:
 * it might be `{ iv, ct }` for an AEAD strategy, the plaintext payload
 * itself for a disabled/no-op strategy, or anything else a custom strategy
 * needs.
 */
export interface EncryptionEnvelope {
    /** Protocol version, namespaced per-strategy (each strategy owns its own version sequence). */
    v: number;
    /** Stable id of the strategy that produced this envelope (see `EncryptionStrategy.id`). */
    strategy: string;
    /** Room/channel id the envelope is bound to. */
    room: string;
    /** Strategy-specific opaque payload. */
    data: unknown;
}

/**
 * A pluggable encryption/key-exchange strategy.
 *
 * `TSession` is intentionally generic and never exposed outside of the
 * strategy implementation + `KeyExchangeManager` — callers of the SDK only
 * ever see `EncryptionEnvelope`s and strategy ids/booleans.
 */
export interface EncryptionStrategy<TSession = unknown> {
    /** Stable, unique identifier embedded in every envelope this strategy produces. Used to register/select the strategy and to reject envelopes from an incompatible strategy on receipt. */
    readonly id: string;
    /** Optional human-readable description (logs/documentation only). */
    readonly description?: string;
    /**
     * Whether this strategy actually provides confidentiality. `false` for
     * an explicitly disabled/no-op strategy, so callers (e.g. `isEncrypted()`)
     * never report "encrypted" for plaintext traffic.
     */
    readonly encrypts: boolean;

    /**
     * Establish per-room session key material from the invitation secret.
     * What "session" means is entirely up to the strategy: HKDF-derived
     * AES keys, a no-op token for a disabled strategy, or anything a custom
     * strategy requires (e.g. a handshake result).
     */
    createSession(secret: string, roomId: string): Promise<TSession>;

    /** Seal an arbitrary JSON-serialisable payload for `channel` into a wire envelope. Must throw rather than seal without a valid `room`. */
    seal(session: TSession, channel: EncryptionChannel, room: string, payload: unknown): Promise<EncryptionEnvelope>;

    /**
     * Open/validate an envelope for `channel`. Must throw — never fall back
     * to plaintext or a best-effort parse — on any incompatibility: wrong
     * strategy/version, wrong room, malformed shape, or (for AEAD-style
     * strategies) a failed authentication tag.
     */
    open<T = unknown>(session: TSession, channel: EncryptionChannel, room: string, envelope: EncryptionEnvelope): Promise<T>;
}

/**
 * Drives a single `EncryptionStrategy` instance through its lifecycle for
 * one `ChatE2EE` instance: establish a session (`begin`), seal/open channel
 * traffic through the strategy, and tear the session down (`reset`).
 *
 * This is the *only* place `sdk.ts` touches encryption — it never imports a
 * concrete strategy, HKDF, or `CryptoKey` itself.
 */
export class KeyExchangeManager {
    private session?: unknown;
    private roomId?: string;

    constructor(private readonly strategy: EncryptionStrategy<unknown>) {}

    /** Stable id of the strategy currently in use. */
    public get strategyId(): string {
        return this.strategy.id;
    }

    /** Whether the configured strategy provides real confidentiality (false for a disabled/no-op strategy). */
    public get encrypts(): boolean {
        return this.strategy.encrypts;
    }

    /** True once `begin()` has resolved and `reset()` has not since been called. */
    public get isReady(): boolean {
        return this.session !== undefined && !!this.roomId;
    }

    /**
     * Establish a fresh session for `roomId` from the invitation `secret`
     * by delegating to the configured strategy. Replaces any previous
     * session outright (no key material from a previous room is retained).
     */
    public async begin(secret: string, roomId: string): Promise<void> {
        if (!roomId) {
            throw new Error('KeyExchangeManager.begin() requires a roomId.');
        }
        this.session = await this.strategy.createSession(secret, roomId);
        this.roomId = roomId;
    }

    /** Seal `payload` for `channel` using the active session. Throws if `begin()` has not completed. */
    public async seal(channel: EncryptionChannel, payload: unknown): Promise<EncryptionEnvelope> {
        this.assertReady();
        return this.strategy.seal(this.session, channel, this.roomId!, payload);
    }

    /**
     * Open `envelope` for `channel` using the active session. Rejects
     * outright (no fallback) if the envelope was produced by a different
     * strategy than the one this manager is configured with, before ever
     * delegating to the strategy itself.
     */
    public async open<T = unknown>(channel: EncryptionChannel, envelope: EncryptionEnvelope): Promise<T> {
        this.assertReady();
        if (!envelope || typeof envelope !== 'object') {
            throw new Error('Invalid envelope: expected an object.');
        }
        if (envelope.strategy !== this.strategy.id) {
            throw new Error(`Unsupported encryption strategy: expected "${this.strategy.id}", got "${String(envelope.strategy)}".`);
        }
        return this.strategy.open<T>(this.session, channel, this.roomId!, envelope);
    }

    /** Tear down the active session. Any subsequent `seal()`/`open()` throws until `begin()` is called again. */
    public reset(): void {
        this.session = undefined;
        this.roomId = undefined;
    }

    private assertReady(): void {
        if (!this.isReady) {
            throw new Error('KeyExchangeManager is not ready: call begin() with a valid invite secret first.');
        }
    }
}
