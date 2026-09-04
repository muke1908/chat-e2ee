<p align="center">
<img align="center" width="300" src="https://i.imgur.com/O3Wr6fK.png">  
</p>

# @chat-e2ee/service

`@chat-e2ee/service` is a client-side SDK designed to facilitate end-to-end encrypted (E2EE) real-time messaging. It enables developers to build secure chat applications on top of the chat-e2ee infrastructure using [Socket.io](https://socket.io/) for signaling and WebRTC for peer-to-peer communication.

[![npm version](https://img.shields.io/npm/v/@chat-e2ee/service.svg)](https://www.npmjs.com/package/@chat-e2ee/service)
[![size](https://img.shields.io/bundlephobia/minzip/@chat-e2ee/service.svg)](https://bundlephobia.com/package/@chat-e2ee/service)

## Installation

Install the package via npm:

```bash
npm i @chat-e2ee/service
```

---

## How it works

There is no key exchange handshake and no PIN. Instead:

1. The device that creates a room asks the server for a public room id, then generates a **256-bit secret entirely on the client** (`window.crypto.getRandomValues`). The secret is only ever carried in the invitation link's URL fragment — `#room=<public-room-id>&secret=<base64url-secret>` — which browsers never send as part of an HTTP request. It is never transmitted to, or stored on, the server.
2. Both participants call `setChannel(roomId, secret, userId)` with the same `roomId`/`secret`. `ChatE2EE` derives two opaque, domain-separated secrets from the invitation `secret` alone via HKDF-SHA256 — one for chat messages, one for WebRTC signaling — entirely *outside* the encryption strategy layer, and hands each one to its own independent **encryption strategy** instance (secure default, disabled, or a custom registered strategy). A compromise of one derived secret cannot be used to attack the other (domain separation). `roomId` is never folded into this derivation — it remains purely routing state, known to (and used by) the server to place both participants in the same room, with no cryptographic role. See [Encryption strategies](#encryption-strategies) below for how to select or supply a different strategy (including an explicit no-encryption mode).
3. Every chat message and WebRTC signal (offer/answer/ICE candidate/call control) is sealed into a versioned, strategy-tagged envelope (`{ version, strategy, data }`) before it ever reaches the socket. `ChatE2EE` — never the strategy itself — checks the protocol version and strategy id on receipt, and rejects (drops) anything that doesn't match the active strategy instance for that channel; there is no fallback to a different strategy or envelope version. The server only ever relays this opaque envelope between the two sockets in a room — it cannot read, modify, or replay it elsewhere. Any failure to open an envelope (wrong secret, unsupported version, unexpected strategy, tampered ciphertext) or a replayed/duplicate sequence number causes the message to be dropped outright; there is **no plaintext fallback** — not even when the configured strategy is the explicit "disabled" one (see below).
4. Audio call media itself relies on WebRTC's mandatory DTLS-SRTP transport encryption. There is no custom per-frame encryption layered on top, and therefore no encoded-transform capability gate — calls work in any standards-compliant WebRTC browser.

## Encryption strategies

The SDK never hard-codes a specific cryptographic primitive, and an `EncryptionStrategy` is entirely application-agnostic: it knows nothing about rooms, users, chat, signaling, WebRTC, payload shapes, sessions, or key exchange. `ChatE2EE` owns all of that — routing, JSON<->bytes serialization, and replay/protocol validation — around two independent strategy *instances* it creates and drives itself (one for chat, one for signaling), selected through a small global registry/factory. This means:

- the **secure default** (AES-256-GCM, keyed from an opaque secret `ChatE2EE` derives via HKDF-SHA256 before ever reaching the strategy) is just the strategy registered under `DEFAULT_ENCRYPTION_STRATEGY_ID`,
- an explicit, opt-in **`disabled`** strategy (`NO_ENCRYPTION_STRATEGY_ID`) is available for local development/testing — it relays payloads as versioned, base64url-encoded plaintext envelopes instead of ciphertext, but is never a silent fallback: it must be selected explicitly, and it still rejects incompatible/mismatched envelopes rather than guessing,
- anyone can **register a custom strategy factory** (a different AEAD, a hardware-backed key store, ...) and select it by id, or pass an ad-hoc factory function directly without registering it globally.

Strategies are **stateful** (each instance holds its own key material after `initialize()`), so the registry stores *factories*, never a shared instance — every lookup creates a brand new instance, and `ChatE2EE` always calls the resolved factory twice so its chat and signaling instances never share state.

```typescript
import {
    createChatInstance,
    registerEncryptionStrategy,
    DEFAULT_ENCRYPTION_STRATEGY_ID,
    NO_ENCRYPTION_STRATEGY_ID,
    type EncryptionStrategy,
    type EncryptionStrategyFactory,
} from '@chat-e2ee/service';

// 1) Default — secure AES-256-GCM (no config needed):
const secureChat = createChatInstance();

// 2) Explicitly disabled encryption (opt-in only, e.g. local dev):
const plaintextChat = createChatInstance({ encryption: { strategy: NO_ENCRYPTION_STRATEGY_ID } });

// 3) A custom strategy factory, registered globally and then selected by id:
const myStrategyFactory: EncryptionStrategyFactory = () => {
    let key /* whatever key material this strategy needs */;
    const strategy: EncryptionStrategy = {
        id: 'my-org:custom-strategy-v1',
        encrypted: true,
        async initialize(secret) { /* turn the opaque secret into usable key material */ },
        async encrypt(data) { /* return { version, strategy: this.id, data } */ return { version: 1, strategy: 'my-org:custom-strategy-v1', data: null }; },
        async decrypt(envelope) { /* validate + return the original bytes, or throw */ return new ArrayBuffer(0); },
        destroy() { /* release key material */ },
    };
    return strategy;
};
registerEncryptionStrategy('my-org:custom-strategy-v1', myStrategyFactory);
const customChat = createChatInstance({ encryption: { strategy: 'my-org:custom-strategy-v1' } });

// 4) Or supply a factory function directly, without registering it globally:
const adHocChat = createChatInstance({ encryption: { strategy: myStrategyFactory } });
```

An unknown strategy id throws immediately from `createChatInstance()` — there is no lazy/deferred failure once you try to use the channel. `chat.isEncrypted()` reflects both channel readiness *and* whether the configured strategy actually provides confidentiality (`encrypted: true`), so it always reports `false` when the disabled strategy is in use, even though the channel is otherwise fully functional.

### `EncryptionStrategy` contract

| Member | Description |
| :--- | :--- |
| `id: string` | Stable, unique id embedded in every envelope this strategy produces; used to register/select the strategy and to reject envelopes from an incompatible strategy on receipt. |
| `encrypted: boolean` | Whether this strategy provides real confidentiality (`false` for the disabled strategy). |
| `initialize(secret)` | Prepares the instance to seal/open data using an opaque, already domain-separated secret string. The strategy never sees where the secret came from. |
| `encrypt(data: ArrayBuffer)` | Seals raw bytes into `{ version, strategy, data }`. |
| `decrypt(envelope)` | Opens/validates an envelope, returning the original bytes. Must throw — never fall back — on any incompatibility (wrong strategy/version, failed auth tag, malformed shape). |
| `destroy()` | Synchronously releases any key material/state held by the instance. |

Registry helpers exported alongside `createChatInstance`: `registerEncryptionStrategy(id, factory, { override? })`, `unregisterEncryptionStrategy(id)`, `hasEncryptionStrategy(id)`, `listEncryptionStrategyIds()`, `getEncryptionStrategy(id)` (creates and returns a fresh instance; throws a descriptive error for an unknown id).

## Quick Start

### 1. Initialize the SDK

```javascript
import { createChatInstance } from '@chat-e2ee/service';

const chat = createChatInstance({
    baseUrl: 'https://your-api.example.com',
    settings: { disableLog: true },
});
await chat.init();
```

### 2. Create or join a room

```javascript
// Guest 1: create a room. `secret` is generated locally and must be shared
// out of band (e.g. via `link`/`absoluteLink`) — never send it to your own backend.
const { hash: roomId, secret, absoluteLink } = await chat.getLink();
const userId = 'user-1';
await chat.setChannel(roomId, secret, userId);

// share `absoluteLink` (or `roomId` + `secret` separately) with Guest 2 out of band

// Guest 2: join using the same roomId + secret parsed from the invitation link
await chat.setChannel(roomId, secret, 'user-2');
```

### 3. Send and receive messages

Messages are encrypted with the invite-derived chat key before they ever leave the device, and decrypted by the SDK before your `chat-message` callback ever sees them.

```javascript
// Sending
await chat.encrypt({ text: 'Hello, world!' }).send();

// Receiving — `msg.message` is already plaintext
chat.on('chat-message', (msg) => {
    console.log('Received:', msg.message);
});
```

---

## API Reference

### `setConfig(config: Partial<ConfigType>)`
Global configuration for the SDK.
- `settings.disableLog`: Boolean to toggle console logging (Default: `false`).
- `baseUrl`: Base URL of the chat-e2ee backend API (Default: `'http://localhost:3001'`).
- `webrtc.iceServers`: Custom STUN/TURN servers passed to `RTCPeerConnection`.
- `webrtc.iceTransportPolicy`: Use `'relay'` to force TURN-only connectivity, or `'all'` for normal host/srflx/relay gathering.
- `webrtc.diagnostics`: Enables periodic `getStats()` snapshots through `call-metrics`.
- `webrtc.selfHealing`: Enables automatic ICE restarts for disconnected/failed calls.

```javascript
import { setConfig } from '@chat-e2ee/service';

setConfig({
    baseUrl: 'https://your-api.example.com',
    settings: { disableLog: true },
});
```

### `createChatInstance(config?): IChatE2EE`
Factory function to create a new chat session instance — this remains the single entry point for creating instances, now with an optional `encryption` field to select/register the strategy used for that instance (see [Encryption strategies](#encryption-strategies)).

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `config` | `Partial<ConfigType>` | Optional. Sets `baseUrl`, `settings`, and `encryption.strategy` inline. |

```typescript
import { createChatInstance } from '@chat-e2ee/service';

const chat = createChatInstance({ baseUrl: 'https://your-api.example.com' });

// Selecting a non-default encryption strategy for this instance only:
const disabledChat = createChatInstance({ baseUrl: '...', encryption: { strategy: 'disabled' } });

// Supplying TURN and enabling diagnostics/self-healing for calls:
const turnChat = createChatInstance({
    webrtc: {
        iceServers: [{ urls: 'turn:turn.example.com', username: 'u', credential: 'p' }],
        iceTransportPolicy: 'relay',
        diagnostics: { enabled: true, intervalMs: 5000 },
        selfHealing: { enabled: true },
    },
});
```

---

### `ChatInstance` (IChatE2EE) Methods

#### `await init(): Promise<void>`
Establishes the socket connection and sets up internal WebRTC/signal listeners. No key material is generated up front — the configured encryption strategy's session is established per-room in `setChannel()`.

#### `await getLink(): Promise<LinkObjType>`
Asks the server for a new public room id, generates a fresh 256-bit invitation secret locally, and returns both together with a ready-to-share invitation link.

#### `await setChannel(roomId: string, secret: string, userId: string, userName?: string): Promise<void>`
Derives domain-separated chat/signaling secrets from `secret` (HKDF-SHA256), initializes the two independent encryption strategy instances with them (AES-256-GCM by default), and joins the room. `secret` is never sent to the server — only `roomId` and `userId` are.

#### `isEncrypted(): boolean`
Returns `true` once `setChannel()` has resolved *and* the configured strategy actually provides confidentiality. Always `false` when the explicit `disabled` strategy is selected, even though the channel is otherwise ready and functional. Unlike the old RSA handshake, this does not depend on the peer having joined yet.

#### `encrypt({ text, image }): { send: () => Promise<ISendMessageReturn> }`
Seals `text`/`image` into an envelope via the configured chat encryption strategy instance (AES-GCM AEAD by default) and delivers it over the socket. This is the only way to send a message — there is no unencrypted `sendMessage()` any more.

#### `await getUsersInChannel(): Promise<TypeUsersInChannel>`
Returns a list of users currently connected to the active channel.

#### `dispose(): void`
Closes socket connections, clears event listeners, and resets the instance state.

---

### Call & WebRTC API

#### `await startCall(): Promise<E2ECall>`
Initiates an audio call, signaled entirely over the encrypted signaling channel. Throws if WebRTC isn't supported (`typeof RTCPeerConnection === 'undefined'`) or a call is already active.

#### `await endCall(): void`
Terminates the active call session.

#### `await restartIce(): void`
Restarts ICE on the active call and sends a fresh ICE-restart offer. The same method is also available on `E2ECall`.

#### `activeCall: E2ECall | null`
Getter that returns the current active call object.

`E2ECall` also exposes `mute()`, `unmute()`, `setMuted(boolean)`, `switchInputDevice(deviceId)`, `setOutputDevice(deviceId)`, and `getStatsSnapshot()` for per-call audio and diagnostics control.

---

### Events
The SDK uses an event-driven architecture. Listen to events using `chat.on(eventName, callback)`.

| Event | Description | Data |
| :--- | :--- | :--- |
| `on-alice-join` | Fired when the second user joins the channel. | `null` |
| `on-alice-disconnect` | Fired when the other user leaves the channel. | `null` |
| `chat-message` | Fired once a message has been decrypted (and passed replay checks). | `{ sender, message, image, id, timestamp }` |
| `delivered` | Fired when your message is successfully received by the peer. | `id` |
| `limit-reached` | Fired if the channel already has 2 participants. | `null` |
| `call-added` | Fired when an incoming call is received. | `E2ECall` |
| `call-removed` | Fired when a call is disconnected/ended. | `null` |
| `call-metrics` | Fired periodically when `webrtc.diagnostics.enabled` is true, and available on demand with `getStatsSnapshot()`. | `{ bitrateKbps, rttMs, packetsLost, packetLossRatio, jitterMs, localAudioLevel, remoteAudioLevel, selectedCandidatePairId, localCandidateType, remoteCandidateType, ... }` |
| `ice-journey` | Fired for ICE gathering/connection transitions, local/remote candidates, selected pair changes, and ICE restarts. | `{ type, timestamp, candidateType, connectionState, iceConnectionState, selectedCandidatePairId, reason, ... }` |

A decryption failure or replayed/duplicate sequence number silently drops the message — `chat-message` is simply never fired for it.

---

### Utils

#### `utils.generateUUID(): string`
Helper function to generate a unique user or channel identifier.

---

## Data Types

### `LinkObjType`
```typescript
{
    hash: string;          // public room id
    secret: string;        // client-generated 256-bit secret, base64url — never sent to the server
    link: string;           // relative path + `#room=<hash>&secret=<secret>` fragment
    absoluteLink: string | undefined;
    expired: boolean;
    deleted: boolean;
}
```

### `E2ECall`
```typescript
{
    state: RTCPeerConnectionState;
    muted: boolean;
    endCall(): Promise<void>;
    restartIce(): Promise<void>;
    mute(): void;
    unmute(): void;
    setMuted(muted: boolean): void;
    switchInputDevice(deviceId: string): Promise<void>;
    setOutputDevice(deviceId: string): Promise<void>;
    getStatsSnapshot(): Promise<CallMetrics>;
    on(event: 'state-changed' | 'call-metrics' | 'ice-journey', cb: (...args: any[]) => void): void;
}
```

---

## Debugging
Filter browser console logs by `@chat-e2ee/service` to see internal operations. To disable logs, use `setConfig({ settings: { disableLog: true } })`.
