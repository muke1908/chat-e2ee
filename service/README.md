# SDK
This is a client-side SDK to interact with chat-e2ee service. It allows dev to build own chat client on top of chate2ee service.  

[![npm version](https://img.shields.io/npm/v/@chat-e2ee/service.svg)](https://www.npmjs.com/package/@chat-e2ee/service)
  [![size](https://img.shields.io/bundlephobia/minzip/@chat-e2ee/service.svg)](https://bundlephobia.com/package/@chat-e2ee/service)
```
npm i @chat-e2ee/service
```

### Usage:

`@chat-e2ee/service` exports following modules:  
 - createChatInstance - Chat ops  
 - generateUUID - util func to generate UUID  
 - cryptoUtils - Encryption util  

### Example:  
Import the SDK.
```
import { createChatInstance, generateUUID, cryptoUtils } from '@chat-e2ee/service';
const chatInstance = createChatInstance();
```


First you have to set up a channel. To setup a channel you need to generate a hash, userid, and your publickey. 

```
cosnt { publicKey, privateKey } = cryptoUtils.generateKeypairs();
const userId = generateUUID();
const { hash } = await chatInstance.getLink();

chatInstance.setChannel(hash, userId, publickKey);
```
Once you setup channel, user2 can join the channel by passing same hash to setChannel. But different userid and publickey.
When user2 joins the channel you can request user2's publicKey. 

```
const receiverPublicKey = await chatInstance.getPublicKey();
receiverPublicKey && chatInstance.setPublicKey(receiverPublicKey);

// set listener
chatInstance.on('on-alice-join', async () => {
    const receiverPublicKey = await chatInstance.getPublicKey();
    chatInstance.setPublicKey(receiverPublicKey);
});
```
Now you are ready to send message. 
```
await chatInstance.encrypt('some message').send();
```

Setup listener to receive message from user2
```
chatInstance.on('chat-message', async () => {
    const msgInPlainText = await cryptoUtils.decryptMessage(msg.message, privateKey);
    console.log(msgInPlainText);
});
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
1 - Custom encryption / No encryption:  
> Simply call .sendMessage() with encrypted or plain text. 
```
chatInstance.sendMessage({ image, message: <message> });
```

2 - Using cryptoUtils from @chat-e2ee/service  
> To get keys follow previous step
```
const encryptedMessage = cryptoUtils.encryptMessage(message, publicKey);
chatInstance.sendMessage({ image, message: encryptedMessage });
```

3 - Auto encryption by @chat-e2ee/service  
> @chat-e2ee/service will encrypt message with publicKey before sending to network. To use this, you have to call `.setPublicKey` once you receive the public key at step 2.  
It will throw if public key is not set.

```
chatInstance.encrypt({ image, text }).send();
```

---
### Listeners: 

```
chate2ee.on(events, callback);
```

**Events:**  
`on-alice-join` - reveiver joined the link  
`chat-message` - new message received  
```
chate2ee.on('chat-message', (msg) => {
    console.log('message received',msg)
})
```
msg object: 
```
{
    channel: string,
    sender: string,
    message: string,
    id: number,
    timestamp: number,
    image?: string
}
```
`on-alice-disconnect` - receiver left/disconnected from the link  
`limit-reached` - 2 users already join a link  
`delivered` - a message is delivered to receiver  callback returns the ID of the message that's delivered.  
```
chate2ee.on('delivered', (id) => {
    console.log('delivered',id)
})
```
  
