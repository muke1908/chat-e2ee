<p align="center">
<img align="center" width="300" src="https://i.imgur.com/O3Wr6fK.png">  
</p>
  
  
This is a client-side SDK to interact with chat-e2ee service. It allows dev to build own chat client on top of chate2ee service. It uses [socket.io](https://socket.io/) for websocket connection & webRTC technology to establish peer-to-peer connection.    

[![npm version](https://img.shields.io/npm/v/@chat-e2ee/service.svg)](https://www.npmjs.com/package/@chat-e2ee/service)
  [![size](https://img.shields.io/bundlephobia/minzip/@chat-e2ee/service.svg)](https://bundlephobia.com/package/@chat-e2ee/service)
```
npm i @chat-e2ee/service
```

`@chat-e2ee/service` exports the following modules:  
 - createChatInstance - core chat ops.
 - utils
   - generateUUID - util func to generate UUID.  
   - decryptMessage - to decrypt encrypted messages.  
 - setConfig - configuration - set URLs i.e. API endpoints, debugging etc.

### Example and flow:  
#### 1. Import and initialize the SDK:
```
import { createChatInstance, utils, setConfig } from '@chat-e2ee/service';
const chatInstance = createChatInstance(config);
await chatInstance.init();
```
Note that the config is optional.

#### 2. Setup a channel:
First, you have to set up a channel. To set up a channel you need to generate a hash, user ID. 

```
const userId = utils.generateUUID(); // you can use your own user id.
const { hash } = await chatInstance.getLink();

await chatInstance.setChannel(hash, userId);
```
Once you set up a channel, user2 can join the channel by passing the same hash to `setChannel` with their own `userid`.
Note that userid should be unique.


#### 3. Send a message:
When both users have joined the channel, you are ready to send a message. 
```
await chatInstance.encrypt('some message').send();
```

#### 4. Receive messages:
Setup listener to receive messages from user2 and use your private key to decrypt messages.
```
const { privateKey } = chatInstance.getKeyPair();
chatInstance.on('chat-message', async () => {
    const msgInPlainText = await utils.decryptMessage(msg.message, privateKey);
    console.log(msgInPlainText);
});
```


#### 4. Audio call:

```
// start a call
const call = await chatInstance.startCall();

// end the call
call.endCall();

// call state change
call.on('state-changed', () => {
    console.log('Call state changed', call.state)
})
```


---
### Event listeners: 

```
chate2ee.on(events, callback);
```

**List of events:**  

`on-alice-join` - reveiver joined the link  
`chat-message` - new message received  
`on-alice-disconnect` - receiver left/disconnected from the link  
`limit-reached` - 2 users already join a link  
`delivered` - a message is delivered to the receiver  callback returns the ID of the message that's delivered.  
`call-added` - a new incoming call.  
`call-removed` - an active call is removed/disconnected.  

New message:  

```
chate2ee.on('chat-message', (msg) => {
    console.log('New message received',msg)
})

// message object:
{
    channel: string,
    sender: string,
    message: string,
    id: number,
    timestamp: number,
    image?: string
}

```

Delivered notification: 
```
chate2ee.on('delivered', (id) => {
    console.log('delivered',id)
})
```

New call:  

```
chate2ee.on('call-added', (call) => {
    console.log('New call received', call)
})

// call object:
{
    state: RTCPeerConnectionState, // state of the active call
    endCall(): Promise<void> // end the active call
}
```

Call removed:  
```
chate2ee.on('call-removed', () => {
    console.log('Call removed')
})
```
---

**chatInstance.getLink():**  
> One user needs to create a link and share it with other user.  
Each instance is unique to each link. To create a separate link, another instance needs to be created.
```
const linkDescription = chatInstance.getLink();
```
linkDescription contains basic info:
```
{
    hash: string;
    link: string;
    expired: boolean;
    deleted: boolean;
    pin: string;
    pinCreatedAt: number;
}
```

**Send message:**  
1 - Auto encryption by @chat-e2ee/service  
> @chat-e2ee/service will encrypt message with publicKey before sending to network.

```
chatInstance.encrypt({ image, text }).send();
```

2 - Custom encryption / No encryption:  
> Simply call .sendMessage() with encrypted or plain text. 
```
chatInstance.sendMessage({ image, message: <message> });
```

---

### Config:
Call setConfig with config object to override default config parameters.

`config` follows: 
```
{
    apiURL: string | null,
    socketURL: string | null,
    settings: {
        disableLog: boolean,
    }
}
```
Note that `@chat-e2ee/service` will make request to `/` in local env and to [hosted server](https://chat-e2ee-2.azurewebsites.net) in production env by default. If you want to use a custom server, use `setConfig({ apiURL, socketURL });`

---
### Debugging: 
Open the browser console and filter your logs by @chat-e2ee/service  

<img width="722" alt="Screenshot 2023-06-06 at 10 11 49" src="https://github.com/muke1908/chat-e2ee/assets/20297989/78a6b894-0ffa-45d3-a572-417e92494d93">

to disable logging set the `settings.disableLog` to `true` in configContext: 
```
setConfig({
    settings: {
        disableLog: boolean
    }
})
```
