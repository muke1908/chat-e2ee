import { setConfig } from './configContext';
import { cryptoUtils as _cryptoUtils } from './crypto';
import deleteLink from './deleteLink';
import getLink from './getLink';
import getUsersInChannel from './getUsersInChannel';
import { configType, IChatE2EE, ISendMessageReturn, LinkObjType, SocketListenerType, TypeUsersInChannel } from './public/types';
import { getPublicKey, sharePublicKey } from './publicKey';
import sendMessage from './sendMessage';
import { SocketInstance, SubscriptionContextType } from './socket/socket';
import { Logger } from './utils/logger';
export { setConfig } from './configContext';
import { generateUUID } from './utils/uuid';

export const utils = {
    decryptMessage: (ciphertext: string, privateKey: string) => _cryptoUtils.decryptMessage(ciphertext, privateKey),
    generateUUID
}

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

class ChatE2EE implements IChatE2EE {
    private channelId?: string;
    private userId?: string;
    private userName?: string;

    private privateKey?: string;
    private publicKey?: string;

    private receiverPublicKey?: string;

    private subscriptions = new Map();
    private socket: SocketInstance;

    private subscriptionLogger = logger.createChild('Subscription');

    private initialized = false;

    constructor(config?: Partial<configType>) {
        config && setConfig(config);
    }

    public async init(): Promise<void> {
        const initLogger = logger.createChild('Init');
        initLogger.log(`Started.`);

        this.createSocketSubcription();
        const { privateKey, publicKey } = await _cryptoUtils.generateKeypairs();
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.on('on-alice-join', () => {
            initLogger.log("Receiver connected.");
            this.getPublicKey(initLogger);
        })

        this.on("on-alice-disconnect", () => {
            initLogger.log("Receiver disconnected");
            this.receiverPublicKey = null;
        });

        initLogger.log(`Finished.`);
        this.initialized = true;
    }

    public async getLink(): Promise<LinkObjType> {
        logger.log('getLink()');
        return getLink();
    }

    public async setChannel(channelId: string, userId: string, userName?: string): Promise<void> {
        this.checkInitialized();
        logger.log(`setChannel(), ${JSON.stringify({ channelId, userId,userName })}`);
        this.channelId = channelId;
        this.userId = userId;
        this.userName = userName;
        await sharePublicKey({ publicKey: this.publicKey, sender: this.userId, channelId: this.channelId});
        this.socket.joinChat({ publicKey: this.publicKey, userID: this.userId, channelID: this.channelId})
        await this.getPublicKey(logger);
        return;
    }

    public isEncrypted(): boolean {
        this.checkInitialized();
        logger.log(`isEncrypted()`);
        return !!this.receiverPublicKey;
    }

    public async delete(): Promise<void> {
        logger.log(`delete()`);
        this.checkInitialized();
        return deleteLink({ channelID: this.channelId });
    }

    public async getUsersInChannel(): Promise<TypeUsersInChannel> {
        logger.log(`getUsersInChannel()`);
        this.checkInitialized();
        await this.getPublicKey(logger.createChild('getUsersInChannel'));
        return getUsersInChannel({ channelID: this.channelId });
    }

    public async sendMessage({ image, text }): Promise<ISendMessageReturn> {
        logger.log(`sendMessage()`);
        this.checkInitialized();
        return sendMessage({ channelID: this.channelId, userId: this.userId, image, text })
    }

    public encrypt({ image, text }): { send: () => Promise<ISendMessageReturn> } {
        logger.log(`encrypt()`);
        this.checkInitialized();

        const encryptedTextPromise = _cryptoUtils.encryptMessage(text, this.receiverPublicKey);
        return ({
            send: async () => {
                const encryptedText = await encryptedTextPromise;
                return this.sendMessage({ image, text: encryptedText })
            }
        })
    }

    public on(listener: SocketListenerType, callback): void {
        const loggerWithCount = this.subscriptionLogger.count();
        const sub = this.subscriptions.get(listener);
        if (sub) {
            if (sub.has(callback)) {
                loggerWithCount.log(`Skpping, subscription: ${listener}`);
                return;
            }
            loggerWithCount.log(`Created +1 : ${listener}`);
            sub.add(callback);
        } else {
            loggerWithCount.log(`Created: ${listener}`);
            this.subscriptions.set(listener, new Set([callback]));
        }
    }

    public dispose(): void {
        this.checkInitialized();
        logger.log('dispose()');
        this.socket.dispose();
        this.subscriptions.clear();
        this.initialized = false;
    }

    public getKeyPair(): { privateKey: string, publicKey: string } {
        this.checkInitialized();
        return {
            privateKey: this.privateKey,
            publicKey: this.publicKey
        }
    }

    //get receiver public key
    private async getPublicKey(logger: Logger): Promise<void> {
        logger.log(`getPublicKey()`);
        const receiverPublicKey = await getPublicKey({ userId: this.userId, channelId: this.channelId });
        logger.log(`setPublicKey() - ${!!receiverPublicKey?.publicKey}`);
        this.receiverPublicKey = receiverPublicKey?.publicKey;
        return;
    }

    private createSocketSubcription(): void {
        const subscriptionContext: SubscriptionContextType = () => this.subscriptions;
        this.socket = new SocketInstance(subscriptionContext, logger.createChild('Socket'));
    }

    private checkInitialized(): void {
        if(!this.initialized) {
            throw new Error('ChatE2EE is not initialized, call init()');
        }
    }
}

export * from './public/types';