/**
 * Generic, application-agnostic encryption-strategy abstraction.
 *
 * The SDK never talks to a concrete cryptographic primitive (HKDF, AES-GCM,
 * `CryptoKey`, ...) directly. Instead, `ChatE2EE` owns two independent
 * `EncryptionStrategy` instances (one per logical channel it maintains
 * internally) and drives them itself — sealing/opening envelopes, JSON<->byte
 * serialization, routing, and replay/protocol validation all live in
 * `ChatE2EE`, never inside a strategy. A strategy itself knows nothing about
 * rooms, users, chat, signaling, WebRTC, application payloads, sessions, or
 * key exchange: it only ever sees an opaque `secret` string (already
 * domain-separated by whoever constructed it) and raw bytes to seal/open.
 *
 * This keeps:
 *
 *  - the AES-256-GCM secure default from leaking its key types (`CryptoKey`)
 *    outside of its own strategy module,
 *  - an explicit, intentional "disabled" (no-encryption) strategy selectable
 *    for local development/testing without special-casing the SDK,
 *  - third parties able to register and select entirely custom strategies
 *    (a different AEAD, a hardware-backed key store, ...) through the same
 *    interface, with no knowledge of how/why the SDK uses them.
 */

/**
 * Wire-level envelope shape shared by every strategy. `strategy` and
 * `version` are always present in plaintext (never secret) so a receiver can
 * reject an incompatible strategy/protocol version *before* attempting to
 * interpret `data` at all — there is never a silent fallback to a different
 * strategy or an earlier/later envelope version.
 *
 * `data` is fully opaque to everything except the strategy that produced it:
 * it might be `{ iv, ct }` for an AEAD strategy, the plaintext payload
 * itself for a disabled/no-op strategy, or anything else a custom strategy
 * needs. There is intentionally no `room`/channel/purpose field: a strategy
 * (and the envelope it produces) has no notion of rooms or logical channels
 * — that separation is achieved entirely outside the strategy layer, by
 * initializing distinct strategy instances with distinct, already
 * domain-separated secrets.
 */
export interface EncryptionEnvelope {
    /** Protocol version, namespaced per-strategy (each strategy owns its own version sequence). */
    version: number;
    /** Stable id of the strategy that produced this envelope (see `EncryptionStrategy.id`). */
    strategy: string;
    /** Strategy-specific opaque payload. */
    data: unknown;
}

/**
 * A pluggable, stateful encryption strategy.
 *
 * A strategy instance is single-use per logical purpose: it is constructed,
 * `initialize()`d once with an opaque secret, then used to `encrypt()`/
 * `decrypt()` raw bytes for as long as that secret is valid, and finally
 * `destroy()`ed. It carries no knowledge of *why* it was initialized with a
 * given secret, nor of anything the caller does with the bytes it
 * encrypts/decrypts.
 */
export interface EncryptionStrategy {
    /** Stable, unique identifier embedded in every envelope this strategy produces. Used to register/select the strategy and to reject envelopes from an incompatible strategy on receipt. */
    readonly id: string;
    /** Optional human-readable description (logs/documentation only). */
    readonly description?: string;
    /**
     * Whether this strategy actually provides confidentiality. `false` for
     * an explicitly disabled/no-op strategy, so callers never report
     * "encrypted" for plaintext traffic.
     */
    readonly encrypted: boolean;

    /**
     * Prepare this strategy instance to seal/open data using `secret`.
     * `secret` is an opaque string handed to the strategy already
     * domain-separated by the caller (e.g. distinct secrets for distinct
     * logical purposes) — the strategy must not assume anything about where
     * it came from beyond "sufficient, private entropy for this instance".
     */
    initialize(secret: string): Promise<void>;

    /** Seal raw bytes into a wire envelope. Must throw rather than seal before `initialize()` has completed. */
    encrypt(data: ArrayBuffer): Promise<EncryptionEnvelope>;

    /**
     * Open/validate an envelope, returning the original raw bytes. Must
     * throw — never fall back to plaintext or a best-effort parse — on any
     * incompatibility: wrong strategy/version, malformed shape, or (for
     * AEAD-style strategies) a failed authentication tag.
     */
    decrypt(envelope: EncryptionEnvelope): Promise<ArrayBuffer>;

    /** Synchronously tear down any key material/state held by this instance. Any subsequent `encrypt()`/`decrypt()` must throw until `initialize()` is called again. */
    destroy(): void;
}

/** Creates a fresh, independent `EncryptionStrategy` instance. Strategies are stateful, so a factory (never a shared instance) is what gets registered/resolved. */
export type EncryptionStrategyFactory = () => EncryptionStrategy;
