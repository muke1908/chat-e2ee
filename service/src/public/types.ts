export type LinkObjType = {
    hash: string,
    link: string,
    expired: boolean,
    deleted: boolean,
    pin: string,
    pinCreatedAt:number
}

export interface IChatE2EE {
    getLink(): Promise<LinkObjType>;
    setChannel(channelId: string): void;
    delete(): Promise<void>;
    getUsersInChannel(): Promise<any>; //fix: return type
    sendMessage({ userId, image, text }: { userId: string, image: string, text: string }): Promise<any> //fix: return type
    sharePublicKey({ publicKey, sender }: { publicKey: string, sender: string }): Promise<void>; //fix: return type
    getPublicKey({ userId }: { userId: string }): Promise<any>; //fix: return type
}