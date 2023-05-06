import getLink from './getLink';
import deleteLink from './deleteLink';
import getUsersInChannel from './getUsersInChannel';
import sendMessage from './sendMessage';
import { sharePublicKey, getPublicKey} from './publicKey';
import { IChatE2EE, IGetPublicKeyReturn, ISendMessageReturn, LinkObjType } from './public/types';

export { cryptoUtils } from './crypto';


export const createChatInstance = (): IChatE2EE => {
    return new ChatE2EE();
}

class ChatE2EE implements IChatE2EE{
    private linkObjPromise: Promise<LinkObjType> = null;
    private channelId?: string;
    private userId?: string;

    constructor() {
        this.init();
    }

    public async getLink(): Promise<LinkObjType> {
        return this.linkObjPromise;
    }

    public setChannel(channelId: string, userId: string): void {
        this.channelId = channelId;
        this.userId = userId;
    }

    public async delete(): Promise<void> {
        return deleteLink({ channelID: this.channelId });
    }

    public async getUsersInChannel(): Promise<any> {
        return getUsersInChannel({ channelID: this.channelId });
    }

    public async sendMessage({ image, text }): Promise<ISendMessageReturn> {
        return sendMessage({ channelID: this.channelId, userId: this.userId, image, text })
    }

    public async sharePublicKey({ publicKey }) {
        return sharePublicKey({ publicKey, sender: this.userId, channelId: this.channelId });
    }

    public async getPublicKey(): Promise<IGetPublicKeyReturn> {
        return getPublicKey({ userId: this.userId, channelId: this.channelId });
    }

    private init() {
        this.linkObjPromise = getLink();
    }
}

export const generateUUID = () => {
    let uuid = '', i, random;
  
    // generate random hexadecimal digits and concatenate them
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) {
        uuid += '-';
      }
      uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
    }
  
    return uuid;
}
  