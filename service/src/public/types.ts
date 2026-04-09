import { SocketListenerType } from "../socket/socket";
import { E2ECall, PeerConnectionEventType, EncryptionApi } from "../webrtc";
import { ISymmetricEncryption } from "../cryptoAES";
import { IAsymmetricEncryption } from "../cryptoRSA";

export type { EncryptionApi };

export type LinkObjType = {
    hash: string,
    link: string,
    absoluteLink: string | undefined,
    expired: boolean,
    deleted: boolean,
    pin: string,
    pinCreatedAt: number
}

export interface ISendMessageReturn { id: string, timestamp: string };
export interface IGetPublicKeyReturn { publicKey: string, aesKey: string };
export type TypeUsersInChannel = { "uuid": string }[];

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
    encrypt({ image, text }: { image: string, text: string }): { send: () => Promise<ISendMessageReturn> };
    on(listener: SocketListenerType | PeerConnectionEventType, callback: (...args: any) => void): void;
    // webrtc call 
    startCall(options?: { encryptionApi?: EncryptionApi }): Promise<E2ECall>;
    endCall(): void;
    activeCall: E2ECall | null
}

export interface IUtils {
    decryptMessage(ciphertext: string, privateKey: string): Promise<string>,
    generateUUID(): string,
}

/**
 * Pluggable encryption strategy passed to createChatInstance().
 * Omit either field to keep the default implementation.
 */
export interface EncryptionStrategy {
    symmetric?: ISymmetricEncryption;
    asymmetric?: IAsymmetricEncryption;
}

export type { ISymmetricEncryption, IAsymmetricEncryption };

export type configType = {
    settings: {
        disableLog: boolean,
    },
    baseUrl?: string,
}
export type SetConfigType = (config: Partial<configType>) => void;

