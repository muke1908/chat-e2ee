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

### `createChatInstance(config?: Partial<ConfigType>): IChatE2EE`
Factory function to create a new chat session instance. Accepts an optional config to set `baseUrl`, `settings`, and a custom `encryptionProtocol` inline.

Custom encryption protocol allows you to implement your own symmetric encryption for WebRTC media streams. The interface `ISymmetricEncryptionProtocol` requires implementing `init()`, `getRemoteAesKey()`, `getRawAesKeyToExport()`, `setRemoteAesKey()`, `encryptData()`, and `decryptData()`. If omitted, `AesGcmEncryption` (AES-GCM 256 with ECDH X25519 key exchange) is used by default.

```javascript
import { createChatInstance, AesGcmEncryption } from '@chat-e2ee/service';
const chat = createChatInstance({
    baseUrl: 'https://your-api.example.com',
    settings: { disableLog: true },
    encryptionProtocol: new AesGcmEncryption(), // optional custom implementation
});
```

---

## Pluggable Encryption

The SDK supports pluggable symmetric encryption strategies via the `EncryptionFactory`. This allows you to swap the underlying encryption logic used for WebRTC media streams.

### Available Strategies

- **`AES-GCM`** (Default): Standard AES-256-GCM encryption where the key is generated locally and shared via the signaling channel.
- **`ECDH-X25519`**: Uses Ephemeral X25519 ECDH to derive a shared AES-256-GCM key. The secret key material never leaves the device.

### Switching Strategies

You can specify the encryption strategy when creating a chat instance:

```javascript
import { createChatInstance, EncryptionFactory } from '@chat-e2ee/service';

// Use the high-security ECDH-X25519 strategy
const strategy = EncryptionFactory.create({ symmetric: 'ECDH-X25519' });

const chat = createChatInstance({
    encryptionProtocol: strategy.symmetric
});
```

### Registering Custom Strategies

You can register your own implementation by implementing the `ISymmetricEncryption` interface:

```javascript
import { EncryptionFactory } from '@chat-e2ee/service';

class MySymmetricCipher {
    async init() { ... }
    async exportKey() { ... }
    async importRemoteKey(key) { ... }
    async encryptData(data) { ... }
    async decryptData(data, iv) { ... }
}

EncryptionFactory.registerSymmetric('MY-CIPHER', () => new MySymmetricCipher());

const chat = createChatInstance({
    encryptionProtocol: EncryptionFactory.create({ symmetric: 'MY-CIPHER' }).symmetric
});
```

---

### `ChatInstance` (IChatE2EE) Methods

#### `await init(): Promise<void>`
Initializes the instance:
- Generates RSA key pairs for message encryption.
- Generates ECDH key pairs for WebRTC encryption.
- Establishes the socket connection.
- Sets up WebRTC listeners.
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

