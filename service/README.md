<p align="center">
<img align="center" width="300" src="https://i.imgur.com/O3Wr6fK.png">  
</p>

# @chat-e2ee/service

`@chat-e2ee/service` is a powerful client-side SDK designed to facilitate end-to-end encrypted (E2EE) real-time messaging. It enables developers to build secure chat applications on top of the chat-e2ee infrastructure using [Socket.io](https://socket.io/) for signaling and WebRTC for peer-to-peer communication.

[![npm version](https://img.shields.io/npm/v/@chat-e2ee/service.svg)](https://www.npmjs.com/package/@chat-e2ee/service)
[![size](https://img.shields.io/bundlephobia/minzip/@chat-e2ee/service.svg)](https://bundlephobia.com/package/@chat-e2ee/service)

## Installation

Install the package via npm:

```bash
npm i @chat-e2ee/service
```

---

## Quick Start

### 1. Initialize the SDK
Create an instance and initialize it to generate encryption keys and prepare the socket connection.

```javascript
import { createChatInstance } from '@chat-e2ee/service';

const chat = createChatInstance({
    baseUrl: 'https://your-api.example.com',
    settings: { disableLog: true },
});
await chat.init();
```

### 2. Setup a Channel
Create or join a secure communication channel.

```javascript
// Guest 1: Create a channel
const { hash } = await chat.getLink();
const userId = 'user-1'; 
await chat.setChannel(hash, userId);

// Guest 2: Join the channel using the same hash
await chat.setChannel(hash, 'user-2');
```

### 3. Send and Receive Messages
Messages are encrypted before leaving the client and must be decrypted upon receipt.

```javascript
import { utils } from '@chat-e2ee/service';

// Sending an encrypted message
await chat.encrypt({ text: 'Hello, world!' }).send();

// Listening for incoming messages and decrypting them
const { privateKey } = chat.getKeyPair();

chat.on('chat-message', async (msg) => {
    const plainText = await utils.decryptMessage(msg.message, privateKey);
    console.log('Decrypted Message:', plainText);
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

### `createChatInstance(config?, encryptionStrategy?): IChatE2EE`
Factory function to create a new chat session instance.

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `config` | `Partial<ConfigType>` | Optional. Sets `baseUrl` and `settings` inline. |
| `encryptionStrategy` | `EncryptionStrategy` | Optional. Plug in custom symmetric / asymmetric ciphers. Use `EncryptionFactory.create()` to produce this value (see [Pluggable Encryption](#pluggable-encryption)). |

```typescript
import { createChatInstance, EncryptionFactory } from '@chat-e2ee/service';

// Default — AES-256-GCM + RSA-OAEP
const chat = createChatInstance({ baseUrl: 'https://your-api.example.com' });

// Explicit strategy via factory
const chat = createChatInstance(config, EncryptionFactory.create({ symmetric: 'AES-GCM' }));
```

---

## Pluggable Encryption

The SDK ships with two built-in ciphers:

| Layer | Default | Purpose |
| :--- | :--- | :--- |
| Asymmetric | `RSA-OAEP` (2048-bit, SHA-256) | Key-pair generation, message encryption, symmetric key wrapping |
| Symmetric | `AES-GCM` (256-bit) | Frame-by-frame WebRTC audio/video encryption |

Both are swappable at construction time via `EncryptionFactory`.

### EncryptionFactory

`EncryptionFactory` is a registry-based singleton. Register a cipher once under a name, then reference it by that name anywhere.

#### Built-in strategies

| Name | Type |
| :--- | :--- |
| `'AES-GCM'` | symmetric |
| `'RSA-OAEP'` | asymmetric |

#### `EncryptionFactory.create(config?)`

Returns an `EncryptionStrategy` ready to pass to `createChatInstance`. Omit either field to keep its built-in default.

```typescript
// Both defaults
EncryptionFactory.create()

// Override one layer, keep the other default
EncryptionFactory.create({ symmetric: 'ChaCha20' })
EncryptionFactory.create({ asymmetric: 'X25519' })

// Override both
EncryptionFactory.create({ symmetric: 'ChaCha20', asymmetric: 'X25519' })
```

Requesting an unregistered name throws immediately:
> `Unknown symmetric strategy: "ChaCha20". Register it first with EncryptionFactory.registerSymmetric().`

#### `EncryptionFactory.registerSymmetric(name, factory)`
#### `EncryptionFactory.registerAsymmetric(name, factory)`

Register a custom implementation under a name. Both methods return `this` for chaining.

```typescript
EncryptionFactory
    .registerSymmetric('ChaCha20', () => new ChaCha20Encryption())
    .registerAsymmetric('X25519',  () => new X25519Exchange());
```

### Implementing a custom strategy

#### `ISymmetricEncryption`

```typescript
import type { ISymmetricEncryption } from '@chat-e2ee/service';

class ChaCha20Encryption implements ISymmetricEncryption {
    async init(): Promise<void> { /* generate local key */ }
    async encryptData(data: ArrayBuffer): Promise<{ encryptedData: Uint8Array<ArrayBuffer>; iv: Uint8Array<ArrayBuffer> }> { /* … */ }
    async decryptData(data: BufferSource, iv: BufferSource): Promise<ArrayBuffer> { /* … */ }
    async exportKey(): Promise<string> { /* serialise local key for transmission */ }
    async importRemoteKey(key: string): Promise<void> { /* import peer's key */ }
}
```

#### `IAsymmetricEncryption`

```typescript
import type { IAsymmetricEncryption } from '@chat-e2ee/service';

class X25519Exchange implements IAsymmetricEncryption {
    async generateKeypairs(): Promise<{ privateKey: string; publicKey: string }> { /* … */ }
    async encryptMessage(plaintext: string, publicKey: string): Promise<string> { /* … */ }
    async decryptMessage(ciphertext: string, privateKey: string): Promise<string> { /* … */ }
}
```

#### Full example

```typescript
import { createChatInstance, EncryptionFactory } from '@chat-e2ee/service';

// 1. Register at app startup
EncryptionFactory
    .registerSymmetric('ChaCha20', () => new ChaCha20Encryption())
    .registerAsymmetric('X25519',  () => new X25519Exchange());

// 2. Use by name
const chat = createChatInstance(config, EncryptionFactory.create({
    symmetric:  'ChaCha20',
    asymmetric: 'X25519',
}));

await chat.init();
```

---

### `ChatInstance` (IChatE2EE) Methods

#### `await init(): Promise<void>`
Initializes the instance:
- Generates RSA and AES key pairs.
- Establishes the socket connection.
- Sets up WebRTC listeners.

#### `await getLink(): Promise<LinkObjType>`
Requests a new channel link from the server.
Returns an object containing `hash`, `link`, `absoluteLink`, `pin`, etc.

#### `await setChannel(hash: string, userId: string, userName?: string): Promise<void>`
Joins a specific channel. Automatically shares the public key with the other peer once they join.

#### `isEncrypted(): boolean`
Returns `true` if the receiver's public key is present and communication is fully encrypted.

#### `async sendMessage({ text, image }): Promise<ISendMessageReturn>`
Sends a message without automatic encryption. Use this if you are handling encryption manually or sending plain text.

#### `encrypt({ text, image }): { send: () => Promise<ISendMessageReturn> }`
Encrypts the `text` content with the receiver's public key and returns an object with a `.send()` method.

#### `await getUsersInChannel(): Promise<TypeUsersInChannel>`
Returns a list of users currently connected to the active channel.

#### `getKeyPair(): { privateKey: string, publicKey: string }`
Returns the current session's RSA keys.

#### `dispose(): void`
Closes socket connections, clears event listeners, and resets the instance state.

---

### Call & WebRTC API

#### `await startCall(): Promise<E2ECall>`
Initiates an end-to-end encrypted audio call. Throws an error if WebRTC insertable streams are not supported or a call is already active.

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
| `chat-message` | Fired when a new message is received. | `MessageObject` |
| `delivered` | Fired when your message is successfully received by the peer. | `messageId` |
| `limit-reached` | Fired if the channel already has 2 participants. | `null` |
| `call-added` | Fired when an incoming call is received. | `E2ECall` |
| `call-removed` | Fired when a call is disconnected/ended. | `null` |

#### Message Object Structure:
```typescript
{
    channel: string;
    sender: string;
    message: string; // Ciphertext if encrypted
    id: number;
    timestamp: number;
    image?: string; // Optional base64 image
}
```

---

### Utils

#### `utils.generateUUID(): string`
Helper function to generate a unique user or channel identifier.

#### `async utils.decryptMessage(ciphertext: string, privateKey: string): Promise<string>`
Helper to decrypt incoming messages using the session's private key.

---

## Data Types

### `LinkObjType`
```typescript
{
    hash: string;
    link: string;
    absoluteLink: string | undefined;
    expired: boolean;
    deleted: boolean;
    pin: string;
    pinCreatedAt: number;
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

