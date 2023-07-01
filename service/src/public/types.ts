export const enum SOCKET_LISTENERS {
    'LIMIT_REACHED' = 'limit-reached',
    'DELIVERED' = 'delivered',
    'ON_ALICE_JOIN' = 'on-alice-join',
    'ON_ALICE_DISCONNECT' = 'on-alice-disconnect',
    'CHAT_MESSAGE' = 'chat-message'
}

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
export interface IGetPublicKeyReturn { publicKey: string};

export interface IChatE2EE {
    isEncrypted(): boolean;
    getLink(): Promise<LinkObjType>;
    setChannel(channelId: string, userId: string, publicKey: string): void;
    setPublicKey(key: string): void;
    delete(): Promise<void>;
    getUsersInChannel(): Promise<any>; //fix: return type
    sendMessage(args: { image: string, text: string }): Promise<ISendMessageReturn>;
    getPublicKey(): Promise<any>; //fix: return type
    dispose(): void;
    encrypt({ image, text }): { send: () => Promise<ISendMessageReturn> };
    on(listener: SOCKET_LISTENERS, callback): void
}

export interface ICryptoUtils {
    generateKeypairs(): Promise<{privateKey: string, publicKey: string}>,
    encryptMessage(plaintext: string, publicKey: string): Promise<string>,
    decryptMessage(ciphertext: string, privateKey: string): Promise<string>,
}

export type configType = {
    apiURL: string | null,
    socketURL: string | null,
    settings: {
        disableLog: boolean,
    }
}
export type SetConfigType = (config: Partial<configType>) => void;

export declare const createChatInstance: () => IChatE2EE;
export declare const generateUUID: () => string;
export declare const cryptoUtils: ICryptoUtils;
export declare const setConfig: SetConfigType;


