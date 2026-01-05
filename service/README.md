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


const chat = createChatInstance();
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

### `createChatInstance(): IChatE2EE`
Factory function to create a new chat session instance.

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

