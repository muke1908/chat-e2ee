import getLink from './getLink';
import deleteLink from './deleteLink';
import getUsersInChannel from './getUsersInChannel';
import sendMessage from './sendMessage';
import { sharePublicKey, getPublicKey} from './publicKey';
import { IChatE2EE, LinkObjType } from './public/types';

export const createChatInstance = (): IChatE2EE => {
    return new ChatE2EE();
} 



class ChatE2EE implements IChatE2EE{
    private linkObjPromise: Promise<LinkObjType> = null;
    private channelId?: string;

    constructor() {
        this.init();
    }

    public async getLink(): Promise<LinkObjType> {
        return this.linkObjPromise;
    }

    public setChannel(channelId: string): void {
        this.channelId = channelId;
    }

    public async delete(): Promise<void> {
        return deleteLink({ channelID: this.channelId });
    }

    public async getUsersInChannel(): Promise<any> {
        return getUsersInChannel({ channelID: this.channelId });
    }

    public async sendMessage({ userId, image, text }): Promise<any> {
        return sendMessage({ channelID: this.channelId, userId, image, text })
    }

    public async sharePublicKey({ publicKey, sender }): Promise<void> {
        return sharePublicKey({ publicKey, sender, channelId: this.channelId });
    }

    public async getPublicKey({ userId }): Promise<any> {
        return getPublicKey({ userId, channelId: this.channelId });
    }

    private init() {
        this.linkObjPromise = getLink();
    }
}