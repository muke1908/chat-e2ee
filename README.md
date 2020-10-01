## chat-e2ee

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/muke1908/chat-e2ee) [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

The project is still in **development** phase.

Working prototype:  
https://chat-e2ee.herokuapp.com  
https://chate2ee.fun

---

This app will allow two mutually agreed users to have a chat in _end-to-end_ encrypted environment. The app itself doesn't track you or ask any infromation from you. Data is owned by **only you** and **only while chatting**. Your private key is generated on your device and never leaves your device. This is not a replacement of your usual chat application.

## Features

1. The end users **don't identify** themselves .
2. Data is **not** stored on any remote server, encrypted data is just relayed to other users, the data can't be decrypted by any 3rd user.  
3. Secure image sharing. [Read more](https://github.com/muke1908/chat-e2ee/wiki/Idea:-Secure-image-sharing)  
   **IMPORTANT:** The image sharing feature is imcomplete!! Images are stored to [imagebb](https://mukesh-biswas.imgbb.com/) server. (27/08/2020)
4. **No history** i.e. once chat is closed the data is not recoverable.
5. **Zero** information sharing -- no login/signup.

---

![Open Source Love](https://img.shields.io/badge/Open%20Source-with%20love-CRIMSON.svg) ![GitHub last commit](https://img.shields.io/github/last-commit/muke1908/chat-e2ee) [![Sonarcloud Status](https://sonarcloud.io/api/project_badges/measure?project=com.lapots.breed.judge:judge-rule-engine&metric=alert_status)](https://sonarcloud.io/dashboard?id=muke1908_chat-e2ee) [![](https://img.shields.io/github/issues/muke1908/chat-e2ee?style=flat)](https://github.com/muke1908/chat-e2ee/issues)

**Contribute:**

- [Frontend issues](https://github.com/muke1908/chat-e2ee/issues?q=is%3Aissue+is%3Aopen+label%3Afrontend)
- [Backend issues](https://github.com/muke1908/chat-e2ee/issues?q=is%3Aissue+is%3Aopen+label%3ABackend)
- [![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=muke1908_chat-e2ee&metric=code_smells)](https://sonarcloud.io/project/issues?id=muke1908_chat-e2ee&resolved=false&types=CODE_SMELL)

For installation instruction, go to [developer section](https://github.com/muke1908/chat-e2ee#for-developers).

**Contributor highlight:**

[![](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/images/0)](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/links/0)[![](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/images/1)](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/links/1)[![](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/images/2)](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/links/2)[![](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/images/3)](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/links/3)[![](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/images/4)](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/links/4)[![](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/images/5)](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/links/5)[![](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/images/6)](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/links/6)[![](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/images/7)](https://sourcerer.io/fame/muke1908/muke1908/chat-e2ee/links/7)

---

### How to initiate chat

1. Generate unique link.
2. Share the link with the person you want to chat with.
3. Once key exchange is complete, start chatting.
4. The messages are end-to-end encrypted hence, no one can decrypt your message other than you.

**How the encryption works**

1. Alice and Bob generate a public and private key pair.
2. Alice and Bob share their public keys with each other.
3. Alice encrypts her message with her private key and Bob's public key and sends it to Bob.
4. Bob receives the encrypted message and decrypts it with his private key and Alice's public key.

In this way, no one else can decrypt the message because your private key is never exposed to the internet.
More detailed explanation: https://www.youtube.com/watch?v=GSIDS_lvRv4&t=1s

> We are using NaCL & [TweetNaCL.js](https://github.com/dchest/tweetnacl-js/) library for asymmetric encryption. The NaCL project is being lead by [Daniel J.Bernstein](http://cr.yp.to/djb.html), one of the most prominent Computer Scientists of our era.

---

### Flow

![flow](https://i.imgur.com/2GrBQMz.jpg)

---

### For developers

FE: This project includes a light weight frontend UI - bootstrapped with [create-react-app](https://reactjs.org/docs/create-a-new-react-app.html). The FE client is located in `./client` folder.  
BE: The backend runs on express/nodejs. In production mode, express server exposes the API endpoints and serve the static frontend from `./client/build`.

### Installation

1. Fork the repo.
2. Run `npm install` in root dir.
3. Run `npm run dev` to spin up your client/server. This will run your react app in dev mode and server in watch mode by nodemon.

NOTE: by default `create-react-app` runs webpack-dev-server on port `3000`. The server is configured to run on `3001` port. So make sure that these ports are not blocked on your system.

**Important:** Check `.env.sample` to configure your `.env` file.

To start with docker read the [instructions](https://github.com/muke1908/chat-e2ee/tree/master/docker).   
For native build read the [instructions](https://github.com/muke1908/chat-e2ee/tree/master/native).

### Folder structure

- The FE client is located in `./client` which is coupled with the backend
- All the backend controllers goes to `./backend` folder
- Express instance is on `./app.js`
- Entry point is `./index.js`

### APIs
```endpoint: https://chate2ee.fun/api/<path>```

| url                              | method   | payload                         | filename                  | description                                   |
| -------------------------------- | -------- | ------------------------------ | ------------------------- | --------------------------------------------- |
| `/chat-link`                 | `POST`   | `{token}`                      | `/api/index.js`           | to generate unique link to start chat session |
| `/chat-link/status/:channel` | `GET`    |                                | `/api/index.js`           | to check if a channel is valid                |
| `/chat/message`              | `POST`   | `{ channel, sender, message }` | `/api/messaging/index.js` | to send a message to a specific channel       |
| `/chat-link/:channel`        | `DELETE` |                                | `/api/index.js`           | to delete a channel                           |

---

Please follow the convention for commit message.  
https://github.com/conventional-changelog/commitlint/#what-is-commitlint

Example:  
`git commit -m"feat: some relevant message"`

---

## Contributors ✨

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/muke1908"><img src="https://avatars3.githubusercontent.com/u/20297989?v=4" width="80px;" alt=""/><br /><sub><b>Mukesh</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=muke1908" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/gagan-aryan"><img src="https://avatars3.githubusercontent.com/u/62807661?v=4" width="80px;" alt=""/><br /><sub><b>Gagan Aryan</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=gagan-aryan" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/jradha11"><img src="https://avatars1.githubusercontent.com/u/59576984?v=4" width="80px;" alt=""/><br /><sub><b>Radha Jayaraman</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=jradha11" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/jessiematias"><img src="https://avatars1.githubusercontent.com/u/56523246?v=4" width="80px;" alt=""/><br /><sub><b>Jessie</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=jessiematias" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/zygisS22"><img src="https://avatars2.githubusercontent.com/u/54106114?v=4" width="80px;" alt=""/><br /><sub><b>zygisS22</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=zygisS22" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/lindsayjohnston"><img src="https://avatars0.githubusercontent.com/u/58899165?v=4" width="80px;" alt=""/><br /><sub><b>lindsayjohnston</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=lindsayjohnston" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/JulienZD"><img src="https://avatars0.githubusercontent.com/u/48630731?v=4" width="80px;" alt=""/><br /><sub><b>Julien</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=JulienZD" title="Documentation">📖</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/FabiSdr"><img src="https://avatars1.githubusercontent.com/u/62851653?v=4" width="80px;" alt=""/><br /><sub><b>FabiSdr</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=FabiSdr" title="Documentation">📖</a></td>
    <td align="center"><a href="https://audreykadjar.world/"><img src="https://avatars2.githubusercontent.com/u/38159391?v=4" width="80px;" alt=""/><br /><sub><b>AudreyKj</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=AudreyKj" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/DarkSouL11"><img src="https://avatars1.githubusercontent.com/u/8626394?v=4" width="80px;" alt=""/><br /><sub><b>Sundeep Babbur</b></sub></a><br /><a href="#infra-DarkSouL11" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/muke1908/chat-e2ee/commits?author=DarkSouL11" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/imlaxman"><img src="https://avatars3.githubusercontent.com/u/34925185?v=4" width="80px;" alt=""/><br /><sub><b>imlaxman</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=imlaxman" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/ARKEOLOGIST"><img src="https://avatars1.githubusercontent.com/u/34165124?v=4" width="80px;" alt=""/><br /><sub><b>Arkadyuti Bandyopadhyay</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=ARKEOLOGIST" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/nafees87n"><img src="https://avatars2.githubusercontent.com/u/56021937?v=4" width="80px;" alt=""/><br /><sub><b>Nafees Nehar</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=nafees87n" title="Code">💻</a></td>
    <td align="center"><a href="http://twsprogramming.com"><img src="https://avatars0.githubusercontent.com/u/25822696?v=4" width="80px;" alt=""/><br /><sub><b>Tyler Skulley</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=tskull01" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/drmartell"><img src="https://avatars3.githubusercontent.com/u/49651717?v=4" width="80px;" alt=""/><br /><sub><b>drmartell</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=drmartell" title="Code">💻</a></td>
    <td align="center"><a href="https://Narasimha1997.github.io"><img src="https://avatars2.githubusercontent.com/u/20423357?v=4" width="80px;" alt=""/><br /><sub><b>Narasimha Prasanna HN</b></sub></a><br /><a href="#infra-Narasimha1997" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="https://github.com/loneWarrior581"><img src="https://avatars2.githubusercontent.com/u/67538935?v=4" width="80px;" alt=""/><br /><sub><b>Uttkarsh singh</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=loneWarrior581" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Ryuuko"><img src="https://avatars2.githubusercontent.com/u/25223617?v=4" width="80px;" alt=""/><br /><sub><b>Tat Cheong Chu</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=Ryuuko" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/salonigoyal2309"><img src="https://avatars3.githubusercontent.com/u/48411357?v=4" width="80px;" alt=""/><br /><sub><b>Saloni Goyal</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=salonigoyal2309" title="Code">💻</a></td>
    <td align="center"><a href="http://celestialco.wordpress.com"><img src="https://avatars2.githubusercontent.com/u/25225850?v=4" width="80px;" alt=""/><br /><sub><b>Abhishek Agarwal</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=abhishek-aa" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/manny525"><img src="https://avatars1.githubusercontent.com/u/60325174?v=4" width="80px;" alt=""/><br /><sub><b>manny525</b></sub></a><br /><a href="https://github.com/muke1908/chat-e2ee/commits?author=manny525" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

> This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

---
**Cryptographic notice**  
This distribution includes cryptographic software. The country in which you currently reside may have restrictions on the import, possession, use, and/or re-export to another country, of encryption software. BEFORE using any encryption software, please check your country's laws, regulations and policies concerning the import, possession, or use, and re-export of encryption software, to see if this is permitted. See http://www.wassenaar.org/ for more information.

The U.S. Government Department of Commerce, Bureau of Industry and Security (BIS), has classified this software as Export Commodity Control Number (ECCN) 5D002.C.1, which includes information security software using or performing cryptographic functions with asymmetric algorithms. The form and manner of this distribution makes it eligible for export under the License Exception ENC Technology Software Unrestricted (TSU) exception (see the BIS Export Administration Regulations, Section 740.13) for both object code and source code.
