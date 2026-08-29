import { SocketListenerType } from "../socket/socket";
import { E2ECall, PeerConnectionEventType } from "../webrtc/webrtcCall";
import { CallEndReason } from "../webrtc/types";
import type { EncryptionStrategy } from "../crypto/strategy";

/**
 * Invitation link/room descriptor.
 *
 * `secret` is generated entirely on this device and is never sent to the
 * server — it only ever leaves via the URL fragment portion of `link` /
 * `absoluteLink` (`#room=<hash>&secret=<secret>`), which browsers do not
 * transmit as part of an HTTP request.
 */
export type LinkObjType = {
    hash: string,
    secret: string,
    link: string,
    absoluteLink: string | undefined,
    expired: boolean,
    deleted: boolean,
}

export interface ISendMessageReturn { id: string, timestamp: string };
export type TypeUsersInChannel = { "uuid": string }[];

/** Payload sent to the server when a user joins a chat channel. Contains no key material. */
export type chatJoinPayloadType = {
    channelID: string,
    userID: string,
}

export interface IChatE2EE {
    init(): Promise<void>;
    isEncrypted(): boolean;
    getLink(): Promise<LinkObjType>;
    /** Derive session keys from the invitation `secret` and join the room. `secret` is never transmitted. */
    setChannel(roomId: string, secret: string, userId: string, userName?: string): Promise<void>;
    delete(): Promise<void>;
    getUsersInChannel(): Promise<TypeUsersInChannel>;
    dispose(): void;
    /** Encrypts `text`/`image` with the invite-derived chat key. This is the only way to send a message. */
    encrypt({ image, text }: { image: string, text: string }): { send: () => Promise<ISendMessageReturn> };
    on(listener: SocketListenerType | PeerConnectionEventType, callback: (...args: any) => void): void;
    // webrtc call
    startCall(): Promise<E2ECall>;
    acceptCall(): Promise<void>;
    rejectCall(): Promise<void>;
    cancelCall(): Promise<void>;
    endCall(reason?: CallEndReason): Promise<void>;
    activeCall: E2ECall | null
}

export interface IUtils {
    generateUUID(): string,
}

/**
 * Which encryption strategy a `ChatE2EE` instance should use.
 *
 *  - omitted → the secure invite-secret HKDF + AES-256-GCM default.
 *  - a `string` → the id of a strategy registered via `registerEncryptionStrategy()`
 *    (built-in ids: the secure default and `'disabled'`).
 *  - an `EncryptionStrategy` instance → used directly for this instance only,
 *    without requiring global registration.
 */
export type EncryptionConfig = {
    strategy?: string | EncryptionStrategy<any>,
}

export type configType = {
    settings: {
        disableLog: boolean,
    },
    baseUrl?: string,
    encryption?: EncryptionConfig,
}
export type SetConfigType = (config: Partial<configType>) => void;
