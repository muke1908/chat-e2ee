# SDK
@chat-e2ee/service  
This is a client-side SDK to interact with chat-e2ee service. It allows dev to build own chat client on top of chate2ee service.

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

**3. Set channel:**  
> Both user1, and user2 needs to setChannel in order to start a chat session. 
```
chatInstance.setChannel(linkDescription.hash, userId);
```
userId should be unique, you can `generateUUID()` to generate UUID  

**4. Exchange keys:**  
```
const { publicKey, privateKey } = cryptoUtils.generateKeypairs();
chatInstance.sharePublicKey({ publicKey });
const receiverPublicKey = chatInstance.getPublicKey();
```

**4. Send message:**  
```
const encryptedMessage = cryptoUtils.encryptMessage(message, publicKey);
chatInstance.sendMessage({ userId, image, message: encryptedMessage });
```

**4. Read message:**  
```
cryptoUtils.decryptMessage(message, privateKey);
```
