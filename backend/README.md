### APIs
```endpoint: /api/<path>```

| url                              | method   | payload                         | filename                  | description                                   |
| -------------------------------- | -------- | ------------------------------ | ------------------------- | --------------------------------------------- |
| `/chat-link`                 | `POST`   | `{token}`                      | `/api/index.js`           | to generate unique link to start chat session |
| `/chat-link/status/:channel` | `GET`    |                                | `/api/index.js`           | to check if a channel is valid                |
| `/chat/message`              | `POST`   | `{ channel, sender, message }` | `/api/messaging/index.js` | to send a message to a specific channel       |
| `/chat-link/:channel`        | `DELETE` |                                | `/api/index.js`           | to delete a channel                           |

---
