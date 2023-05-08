import getLink from './getLink';
import deleteLink from './deleteLink';
import getUsersInChannel from './getUsersInChannel';
import sendMessage from './sendMessage';
import { sharePublicKey, getPublicKey} from './publicKey';
import { IChatE2EE, IGetPublicKeyReturn, ISendMessageReturn, LinkObjType } from './public/types';
import { cryptoUtils } from './crypto';
import { SocketInstance, SOCKET_LISTENERS, SubscriptionContextType } from './socket/socket';
import { Logger } from './utils/logger';

export { cryptoUtils } from './crypto';

const logger = new Logger();
export const createChatInstance = (): IChatE2EE => {
    logger.log('Creating new instance');
    return new ChatE2EE();
}

export type chatJoinPayloadType = {
    channelID: string,
    userID: string,
    publicKey: string
}

class ChatE2EE implements IChatE2EE{
    private linkObjPromise: Promise<LinkObjType> = null;
    private channelId?: string;
    private userId?: string;
    private publicKey?: string;

    private subscriptions = new Map();
    private socket: SocketInstance;
    constructor() {
        this.init();
        const subscriptionContext: SubscriptionContextType = () => this.subscriptions;
        this.socket = new SocketInstance(subscriptionContext, logger.createChild('Socket'));
        logger.log('Initialized');
    }

    public async getLink(): Promise<LinkObjType> {
        logger.log('getLink()');
        return this.linkObjPromise;
    }

    public async setChannel(channelId: string, userId: string, publicKey: string): Promise<void> {
        logger.log(`setChannel(), ${JSON.stringify({channelId, userId })}, publicKey removed from log`);
        this.channelId = channelId;
        this.userId = userId;
        if(publicKey !== this.publicKey) {
            logger.log("Public key changed");
            await sharePublicKey({ publicKey, sender: this.userId, channelId: this.channelId });
        }
        this.socket.joinChat({ publicKey, userID: this.userId, channelID: this.channelId })
        return;
    }

    public isEncrypted(): boolean {
        logger.log(`isEncrypted()`);
        return !!this.publicKey;
    }

    public setPublicKey(key: string): void {        
        logger.log(`setPublicKey()`);
        this.publicKey = key;
    }

    public async delete(): Promise<void> {
        logger.log(`delete()`);
        return deleteLink({ channelID: this.channelId });
    }

    public async getUsersInChannel(): Promise<any> {
        logger.log(`getUsersInChannel()`);
        return getUsersInChannel({ channelID: this.channelId });
    }

    public async sendMessage({ image, text }): Promise<ISendMessageReturn> {
        logger.log(`sendMessage()`);
        return sendMessage({ channelID: this.channelId, userId: this.userId, image, text })
    }

    public async getPublicKey(): Promise<IGetPublicKeyReturn> {
        logger.log(`getPublicKey()`);
        return getPublicKey({ userId: this.userId, channelId: this.channelId });
    }

    public encrypt({ image, text }): { send: () => Promise<ISendMessageReturn> } {        
        logger.log(`encrypt()`);
        if(!this.publicKey) {
            throw new Error('Public key is not set, call setPublicKey(key)');
        }

        const encryptedTextPromise = cryptoUtils.encryptMessage(text, this.publicKey);
        return ({
            send: async () => {
                const encryptedText = await encryptedTextPromise;
                return this.sendMessage({image, text: encryptedText})
            }
        })
    }

    public on(listener: SOCKET_LISTENERS, callback) {
        const sub = this.subscriptions.get(listener);
        if(sub) {
            if(sub.has(callback)) {
                logger.log(`Skpping, subscription: ${listener}`);
                return;
            }
            logger.log(`Subscription added: ${listener}`);
            sub.add(callback);
        }else {
            logger.log(`Subscription added: ${listener}`);
            this.subscriptions.set(listener, new Set([callback]));
        }
    }

    public dispose(): void {
        logger.log('dispose()');
        this.socket.dispose();
        this.subscriptions.clear();
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
  