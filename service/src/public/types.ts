import { SocketListenerTypeInternal } from "../socket/socket";
import { E2ECall } from "../webrtc";

export type SocketListenerType = Omit<SocketListenerTypeInternal, "webrtc-session-description">;
export type LinkObjType = {
    hash: string,
    link: string,
    absoluteLink: string | undefined,
    expired: boolean,
    deleted: boolean,
    pin: string,
    pinCreatedAt:number
}

export interface ISendMessageReturn { id: string, timestamp: string };
export interface IGetPublicKeyReturn { publicKey: string, aesKey: string};
export type TypeUsersInChannel = { "uuid":string }[];

export interface IChatE2EE {
    init(): Promise<void>;
    getKeyPair(): { privateKey: string, publicKey: string };
    isEncrypted(): boolean;
    getLink(): Promise<LinkObjType>;
    setChannel(channelId: string, userId: string, userName?: string): void;
    delete(): Promise<void>;
    getUsersInChannel(): Promise<TypeUsersInChannel>;
    sendMessage(args: { image: string, text: string }): Promise<ISendMessageReturn>;
    dispose(): void;
    encrypt({ image, text }): { send: () => Promise<ISendMessageReturn> };
    on(listener: SocketListenerType, callback: (...args: any) => void): void;
    // webrtc call 
    startCall(): Promise<E2ECall>;
    endCall(): void;
    onPCStateChanged(cb: (state: RTCPeerConnectionState) => void) : void;
    onCallAdded(cb: (call: E2ECall) => void): void,
    onCallRemoved(cb: () => void): void
    activeCall: E2ECall | null
}

export interface IUtils {
    decryptMessage(ciphertext: string, privateKey: string): Promise<string>,
    generateUUID(): string,
}

export type configType = {
    apiURL: string | null,
    socketURL: string | null,
    settings: {
        disableLog: boolean,
    }
}
export type SetConfigType = (config: Partial<configType>) => void;

