## Idea

Note: This is not a replacement of your usual chat application. 

This app will allow two mutually agreed users to have a conversation in _end-to-end_ encrypted environment. The app itself doesn't track you or ask any infromation from you. Data is owned by **only you** and **only while chatting**. Your private key is generated on your device and never leaves your device.

---

![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103) ![GitHub last commit](https://img.shields.io/github/last-commit/muke1908/chat-e2ee)
<a href="https://github.com/muke1908/chat-e2ee/graphs/contributors">
  <img src="https://contributors-img.web.app/image?repo=muke1908/chat-e2ee" />
</a>

### Contribute [![](https://img.shields.io/github/issues/muke1908/chat-e2ee?style=flat-square)](https://github.com/muke1908/chat-e2ee/issues)

- [Contribution guide](https://github.com/muke1908/chat-e2ee/blob/master/CONTRIBUTING.md)  
  **Issues**:
- [Frontend issues](https://github.com/muke1908/chat-e2ee/issues?q=is%3Aissue+is%3Aopen+label%3Afrontend)
- [Backend issues](https://github.com/muke1908/chat-e2ee/issues?q=is%3Aissue+is%3Aopen+label%3ABackend)

Master branch is deployed to https://chat-e2ee.herokuapp.com/

---

### Key Features:

1. The end users are not tracable.
2. Data is not stored on any remote server.
3. No saved history i.e. once chat is closed the data is not recoverable.
4. It doesn't ask any information from you -- no login/signup.

### How to initiate chat:

1. Generate unique link and passkey.
2. Share the link with the person you want to chat with.
3. Both users identify themselves.
4. The messages are end-to-end encrypted hence, no one can decrypt your message other than you.

**How the encryption works:**

1. Alice and Bob generate a public and private key pair.
2. Alice and Bob share their public keys with each other.
3. Alice encrypts her message with her private key and Bob's public key and sends it to Bob.
4. Bob receives the encrypted message and decrypts it with his private key and Alice's public key.

In this way, no one else can decrypt the message because your private key is never exposed to the internet.
More detailed explanation: https://www.youtube.com/watch?v=GSIDS_lvRv4&t=1s

> We are using NaCL & [TweetNaCL.js](https://github.com/dchest/tweetnacl-js/) library for asymmetric encryption. The NaCL project is being lead by [Daniel J.Bernstein](http://cr.yp.to/djb.html), one of the most prominent Computer Scientists of our era.


---

### Proposed flow:

![flow](https://i.imgur.com/2GrBQMz.jpg)

---

### For Developer

FE: This project includes a light weight frontend UI - bootstrapped with [create-react-app](https://reactjs.org/docs/create-a-new-react-app.html). The FE client is located in `./client` folder.  
BE: The backend runs on express/nodejs. In production mode, express server exposes the API endpoints and serve the static frontend from `./client/build`.

### Installation

1. Clone / Fork the repo.
2. Run `npm install` in root dir.  
3. Run `npm run dev` to spin up your client/server. This will run your react app in dev mode and server in watch mode by nodemon.

NOTE: by default `create-react-app` runs webpack-dev-server on port `3000`. The server is configured to run on `3001` port. So make sure that these ports are not blocked on your system.

Check `.env.sample` to configure your `.env` file.

### Folder structure:

- The FE client is located in `./client` which is coupled with the backend
- All the backend controllers goes to `./backend` folder
- Express instance is on `./app.js`
- Entry point is `./index.js`

### APIs

| url              | method | paylod                         | filename                  | description                                   |
| ---------------- | ------ | ------------------------------ | ------------------------- | --------------------------------------------- |
| `/api/getLink`   | `POST` | `{token}`                      | `/api/index.js`           | to generate unique link to start chat session |
| `/api/chat/send` | `POST` | `{ channel, sender, message }` | `/api/messaging/index.js` | to send a message to a specific channel       |

---

1st July, 2020  
Currently it's using [pubnub](https://pubnub.com) for real time communication. Utils are in `/backend/external/pubnub.js`.

**Messaging flow**:

- Client send encrypted message via REST
- Client receives message in realtime via PUBNUB subscription and decrypt locally to read.

---

Please follow the convention for commit message.  
https://github.com/conventional-changelog/commitlint/#what-is-commitlint

Example:  
`git commit -m"feat: some relevant message"`

---

External:  

**<a><img src="https://d2c805weuec6z7.cloudfront.net/Powered_By_PubNub.png" alt="Powered By PubNub" width="100"></a>**|**<a><img src="https://webassets.mongodb.com/_com_assets/cms/MongoDB_Logo_FullColorBlack_RGB-4td3yuxzjs.png" alt="Powered By Mongodb" width="100"></a>**
:-----:|:-----:
