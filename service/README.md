# SDK
@chat-e2ee/service  
This is a client-side SDK to interact with chat-e2ee service. It allows dev to build own chat client on top of chate2ee service.

### Usage:

**1. Import SDK:**  
> Both users needs to import the sdk.
```
import { getChatInstance } from '@chat-e2ee/service';
const chatInstance = getChatInstance()
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
chatInstance.setChannel(linkDescription.hash);
```

**4. Send message:** 
```
chatInstance.sendMessage({ userId, image, text });
```
