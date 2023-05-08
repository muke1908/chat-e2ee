export type LinkObjType = {
    hash: string,
    link: string,
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
}