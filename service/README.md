# SDK
[![npm version](https://badge.fury.io/js/@chat-e2ee%2Fservice.svg)](https://badge.fury.io/js/@chat-e2ee%2Fservice)  
This is a client-side SDK to interact with chat-e2ee service. It allows dev to build own chat client on top of chate2ee service.

```
npm i @chat-e2ee/service
```

### Usage:

`@chat-e2ee/service` exports following modules:  
 - createChatInstance - Chat ops  
 - generateUUID - util func to generate UUID  
 - cryptoUtils - Encryption util  

**1. Import SDK:**  
> Both users needs to import the sdk.
```
import { createChatInstance, generateUUID, cryptoUtils } from '@chat-e2ee/service';
const chatInstance = createChatInstance()
```

**2. Create a link:**  
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
**4. Set encryption key:**  
> Receiver will use sender's public key to encrypt message. Only sender can decrypt the message using sender's private key.  
```
const { publicKey, privateKey } = cryptoUtils.generateKeypairs();

const receiverPublicKey = chatInstance.getPublicKey();
chatInstance.setPublicKey(receiverPublicKey);
```

**3. Set channel:**  
> Both user1, and user2 needs to setChannel in order to start a chat session. Get your publicKey from step 1.  
```
chatInstance.setChannel(linkDescription.hash, userId, publickKey);
```
userId should be unique, you can `generateUUID()` to generate UUID  

**5. Send message:**  
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

**6. Read message:**  
> The private key you have received at step 4
listen to incoming messages: 
```
chate2ee.on('chat-message', (msg) => {
    const msgInPlainText = cryptoUtils.decryptMessage(msg.message, privateKey);
    console.log(msgInPlainText)
})
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
  
