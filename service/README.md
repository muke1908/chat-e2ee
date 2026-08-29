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
2. Both participants call `setChannel(roomId, secret, userId)` with the same `roomId`/`secret`. Each derives the same pair of non-extractable AES-256-GCM keys locally via **HKDF-SHA256** — one for chat messages, one for WebRTC signaling — so a compromise of one cannot be used to attack the other (domain separation).
3. Every chat message and WebRTC signal (offer/answer/ICE candidate/call control) is sealed into a versioned, room-bound AEAD envelope (`{ v, room, iv, ct }`) before it ever reaches the socket. The room id and protocol version are bound into the AEAD additional-authenticated-data, so an envelope sealed for one room/version can never be decrypted successfully in another. The server only ever relays this opaque envelope between the two sockets in a room — it cannot read, modify, or replay it elsewhere. Any decryption failure (wrong secret, wrong room, unsupported version, tampered ciphertext) or replayed/duplicate sequence number causes the message to be dropped outright; there is **no plaintext fallback**.
4. Audio call media itself relies on WebRTC's mandatory DTLS-SRTP transport encryption. There is no custom per-frame encryption layered on top, and therefore no encoded-transform capability gate — calls work in any standards-compliant WebRTC browser.

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

```javascript
import { setConfig } from '@chat-e2ee/service';

setConfig({
    baseUrl: 'https://your-api.example.com',
    settings: { disableLog: true },
});
```

### `createChatInstance(config?): IChatE2EE`
Factory function to create a new chat session instance.

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `config` | `Partial<ConfigType>` | Optional. Sets `baseUrl` and `settings` inline. |

```typescript
import { createChatInstance } from '@chat-e2ee/service';

const chat = createChatInstance({ baseUrl: 'https://your-api.example.com' });
```

---

### `ChatInstance` (IChatE2EE) Methods

#### `await init(): Promise<void>`
Establishes the socket connection and sets up internal WebRTC/signal listeners. No key material is generated up front — keys are derived per-room in `setChannel()`.

#### `await getLink(): Promise<LinkObjType>`
Asks the server for a new public room id, generates a fresh 256-bit invitation secret locally, and returns both together with a ready-to-share invitation link.

#### `await setChannel(roomId: string, secret: string, userId: string, userName?: string): Promise<void>`
Derives the signaling/chat AEAD keys from `secret` via HKDF-SHA256 and joins the room. `secret` is never sent to the server — only `roomId` and `userId` are.

#### `isEncrypted(): boolean`
Returns `true` once `setChannel()` has resolved (i.e. the invite-derived keys are ready). Unlike the old RSA handshake, this does not depend on the peer having joined yet.

#### `encrypt({ text, image }): { send: () => Promise<ISendMessageReturn> }`
Seals `text`/`image` into an AEAD envelope with the invite-derived chat key and delivers it over the socket. This is the only way to send a message — there is no unencrypted `sendMessage()` any more.

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

#### `activeCall: E2ECall | null`
Getter that returns the current active call object.

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
    endCall(): Promise<void>;
    on(event: 'state-changed', cb: (state: RTCPeerConnectionState) => void): void;
}
```

---

## Debugging
Filter browser console logs by `@chat-e2ee/service` to see internal operations. To disable logs, use `setConfig({ settings: { disableLog: true } })`.
