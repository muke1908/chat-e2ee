## Idea

Note: This is not a replacement of your usual chat application. This will allow two mututally agreed users to have a conversation with most privacy and annonimity. The app itself doesn't track you or ask any infromation from you.

Your data is owned by **only you** and **only while chatting**.

### Key Features: 
1. The end users are not tracable.
2. Data are not stored on any remote server.
3. No saved history i.e. once chat is closed the data is not recoverable. 
4. It doesn't ask any information from you -- no login/singup.


### How to initiate chat:  
1. Generate unique link and passkey.
2. Share the link one you want to chat with.  
3. Both users identify themselves.
4. The mesaages are end-to-end encrypted hence, no one can decrypt your message other than you.

**How the encryption works:**
1. Alice and Bob generate public and private key pair. 
2. Alice and bob share their public key.
3. You encrypt your message with your private key Bob's public key and send it to Bob.
4. Bob get's encrypted message and decrypt it with Bob's private key and Alice's public key.

In this way, no one else can decrypt the message because your private key is never exposed to internet. 


**Encryption Library:** https://github.com/dchest/tweetnacl-js/

---

### Proposed flow:
![flow](https://i.imgur.com/2GrBQMz.jpg)
