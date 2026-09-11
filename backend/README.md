### APIs
```endpoint: /api/<path>```

| url                              | method   | payload                         | filename                        | description                                   |
| -------------------------------- | -------- | ------------------------------- | -------------------------------- | --------------------------------------------- |
| `/chat-link`                      | `POST`   |                                  | `/api/chatHash/index.ts`         | generate a new public room id (no PIN)        |
| `/chat-link/status/:channel`      | `GET`    |                                  | `/api/chatHash/index.ts`         | check if a channel is valid                   |
| `/chat-link/:channel`             | `DELETE` |                                  | `/api/chatHash/index.ts`         | delete a channel                              |
| `/chat/get-users-in-channel`      | `GET`    | query: `channel`, optional `countOnly=true` | `/api/messaging/index.ts` | legacy `[{uuid}]` list, or minimal `{count}` for presence checks |

---

### Metadata inventory and privacy limits

This inventory covers the bundled client, SDK HTTP helpers and socket transport,
backend relay, and WebRTC signaling. “Visible” below means visible to the server
or TLS terminator. With **HTTPS/WSS**, passive network observers cannot read the
JSON fields/event names; they still see endpoints, connection timing and traffic
sizes. Without TLS, application metadata is exposed to the network too.

| Surface | Before | After / reason retained |
| --- | --- | --- |
| Room creation/status/deletion | Public UUIDv4 room ID (`hash`), `expired`/`deleted` state; room ID in status/delete URLs | Unchanged. Room IDs are already opaque, random UUIDv4 values, not counters; routing and lifecycle checks need them. The server also knows room creation/expiry times. |
| Participant HTTP lookup | `channel` query, response `[{uuid}]`, even when callers only needed presence | Bundled UI and SDK call preconditions request `countOnly=true` and receive only `{count}`. Explicit legacy list calls remain supported. |
| Socket join | `{channelID,userID}` normally, but arbitrary runtime extras were forwarded | SDK explicitly selects only those two fields. IDs remain for routing/participant tracking and compatibility. No username or invitation secret is needed. |
| SDK join/channel logs; server invalid-room log | Room/user IDs and optional display name, or the entire runtime join object | Operation/error names only; these paths no longer copy identifiers into diagnostic logs. |
| Chat upload | `{envelope}`; arbitrary extra outer envelope fields could pass through | SDK selects only `{version,strategy,data}` within `{envelope}`. Custom strategy `data` remains untouched. |
| Chat delivery and acknowledgment | Delivery `{id,timestamp,sender,envelope}`; ack `{id,timestamp}` | Unchanged public contract. Sender IDs and server timestamps remain visible. Numeric message IDs currently equal server time and are not opaque. |
| Signaling upload/delivery | `{envelope}` on distinct `webrtc-signal` / `webrtc-session-description` events | Same envelope-header minimization as chat. Call IDs, detailed types (invite/accept/reject/cancel/timeout/end, offer/answer/ICE), SDP, candidates, reasons, sequence and payload timestamps are already **inside encryption**, not plaintext headers. |
| Envelope contents | Secure default `{version,strategy,data:{iv,ct}}` | Unchanged required protocol/strategy dispatch, public random IV, ciphertext and authentication tag. Ciphertext length remains visible. Custom strategies own their data format/privacy; disabled mode is encoded plaintext. |
| Chat plaintext | Text/image, sequence and client timestamp | Already encrypted with the secure strategy; unchanged. |
| Receipts/presence/errors | `received:{id}`, `delivered:id`; null join/disconnect/capacity payloads; error/status acknowledgments; initial `message:"ping!"` | Unchanged event contracts. Activity/presence and receipt correlation remain observable; shortening names would not hide event classes. |
| Transport/media | Socket.IO session IDs/handshake, IP addresses, connection lifetime, traffic sizes/timing; WebRTC connectivity/media traffic | Unchanged. These are outside message encryption. |

**Compatibility boundaries.** Old clients still receive the original identity
list unless they request a count. New SDKs accept the legacy list from old
servers that ignore `countOnly`, without a second request; the metadata reduction
therefore requires an updated server. The legacy endpoint still exposes IDs to
callers who explicitly request them; this change is minimization, not access
control. Server relay contracts remain unchanged and strategy `data` stays
opaque. Header projection prevents accidental SDK runtime extras, not metadata
deliberately placed inside custom strategy data or sent by non-SDK clients.

**Remaining limits.** This relay must associate sockets with rooms and track
presence to deliver to the other participant. The compatibility API exposes
sender IDs, receipt IDs and timestamps; these are retained for existing
consumers, not claimed to be cryptographically necessary. Use fresh random
participant IDs per room/session, never account IDs, emails or reusable names.
Opaque room IDs prevent easy guessing but do not hide membership from the
relay. HTTP access logs can still contain room IDs; operators should avoid
retaining URLs, identifiers and payloads in proxy/application telemetry.

Even encrypted SDP/ICE does not hide connectivity from the remote peer or
STUN infrastructure. WebRTC uses DTLS-SRTP for media; direct connections can
reveal peer IP addresses. TURN/relay-only operation would require additional
infrastructure and move trust to that relay. Traffic correlation, message
frequency, length classes and call duration are not hidden by E2EE. Hiding them
would require architectural changes, not merely shorter event names.

**Optional padding (not enabled).** A future opt-in, mutually supported
strategy/version could pad serialized plaintext *inside authenticated
encryption*, with validated length framing on decryption. Size buckets hide
exact lengths but reveal buckets; fixed-size messages cost more bandwidth and
may require chunking. Account for base64/envelope overhead within the existing
32 KiB application and 64 KiB transport limits. Never pad IVs or ciphertext
ad hoc or silently change the current plaintext schema. Padding alone does
not hide addresses, timing, presence or frequency; cover traffic/batching
would add bandwidth, latency and browser background-scheduling constraints.

Regression coverage: SDK socket tests enforce exact join/envelope/receipt
fields, SDK tests check encrypted content and identifier-free join logging,
backend listener tests pin relay/ack shapes, and HTTP/helper tests cover
count-only responses, zero/one/two participants and legacy compatibility.

### Socket.io events

Chat messages and WebRTC signaling are **not** sent over REST any more — they
are relayed over the socket connection established at `chat-join`, using the
identity (`userID`/`channelID`) bound to that socket, never a client-supplied
`sender`/`channel` field. Every payload the server relays for these two
events is an **opaque, versioned envelope** (`{ version, strategy, data }`); the
server never decrypts or inspects its contents.

| event (client → server) | payload                | ack                                    | description                                        |
| ------------------------ | ----------------------- | --------------------------------------- | --------------------------------------------------- |
| `chat-join`               | `{ userID, channelID }` | —                                       | join a room (max 2 participants); no key material   |
| `chat-message`            | `{ envelope }`          | `{ id, timestamp }` or `{ error }`      | relay an opaque chat envelope to the other peer      |
| `webrtc-signal`           | `{ envelope }`          | `{ status: 'ok' }` or `{ error }`       | relay an opaque WebRTC signaling envelope            |
| `received`                | `{ id }`                | —                                       | acknowledge delivery of a chat message               |

| event (server → client)          | payload                                          | description                              |
| ---------------------------------- | -------------------------------------------------- | ----------------------------------------- |
| `on-alice-join`                     | `null`                                             | the other participant joined              |
| `on-alice-disconnect`               | `null`                                             | the other participant disconnected        |
| `chat-message`                      | `{ id, timestamp, sender, envelope }`              | an incoming chat envelope                 |
| `webrtc-session-description`        | `{ envelope }`                                     | an incoming WebRTC signaling envelope     |
| `delivered`                         | `id`                                               | your message was delivered                |
| `limit-reached`                     | `null`                                             | the room already has 2 participants       |

Both `chat-message` and `webrtc-signal` are rate-limited per socket (token
bucket) and size-checked (rejecting oversized payloads) before being
relayed; `initSocket()` also caps the transport-level packet size via
Socket.IO's `maxHttpBufferSize`.

---
