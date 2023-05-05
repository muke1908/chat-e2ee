export type LinkObjType = {
    hash: string;
    link: string;
    expired: boolean;
    deleted: boolean;
    pin: string;
    pinCreatedAt: number;
};
export interface IChatE2EE {
    linkDescription: LinkObjType;
    createLink(): Promise<LinkObjType>;
    setChannel(channelId: string): void;
    delete(): Promise<void>;
    getUsersInChannel(): Promise<any>;
    sendMessage({ userId, image, text }: {
        userId: string;
        image: string;
        text: string;
    }): Promise<any>;
    sharePublicKey({ publicKey, sender }: {
        publicKey: string;
        sender: string;
    }): Promise<void>;
    getPublicKey({ userId }: {
        userId: string;
    }): Promise<any>;
}
