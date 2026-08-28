import { type ISymmetricEncryption } from '../crypto/cryptoAES';
import { type IAsymmetricEncryption } from '../crypto/cryptoRSA';
import { getPublicKey, sharePublicKey } from '../api/publicKey';
import { Logger } from '../utils/logger';

/** Mutable identity/channel state the key-exchange handshake needs to read. */
export type KeyExchangeContext = {
    userId?: string;
    channelId?: string;
    publicKey?: string;
    privateKey?: string;
};

/**
 * Owns the RSA public-key / AES-key handshake with the other participant in a channel:
 *  - shares our RSA public key (and later our AES key, once encrypted for the receiver)
 *  - fetches and tracks the receiver's RSA public key
 *  - decrypts and imports the receiver's AES key once they have shared it
 *
 * Extracted from ChatE2EE (sdk.ts) so the handshake protocol has a single
 * owner instead of being duplicated across init()/setChannel().
 */
export class KeyExchangeManager {
    private receiverPublicKey?: string;

    constructor(
        private symEncryption: ISymmetricEncryption,
        private asymEncryption: IAsymmetricEncryption,
        private getContext: () => KeyExchangeContext,
        private logger: Logger,
    ) {}

    public get hasReceiverPublicKey(): boolean {
        return !!this.receiverPublicKey;
    }

    public getReceiverPublicKey(): string | undefined {
        return this.receiverPublicKey;
    }

    /** Reset handshake state when the receiver leaves the channel. */
    public onReceiverDisconnected(): void {
        this.receiverPublicKey = undefined;
    }

    /** Announce our RSA public key to the channel, without an AES key yet. */
    public async shareOwnPublicKey(): Promise<void> {
        const { userId, channelId, publicKey } = this.getContext();
        await sharePublicKey({ aesKey: null, publicKey, sender: userId, channelId });
    }

    /** Fetch the receiver's RSA public key (and import their AES key, if already shared). */
    public async refreshReceiverPublicKey(logger: Logger = this.logger): Promise<void> {
        const { userId, channelId, privateKey } = this.getContext();
        logger.log(`getPublicKey()`);
        const receiverPublicKey = await getPublicKey({ userId, channelId });
        logger.log(`setPublicKey() - ${!!receiverPublicKey?.publicKey}`);
        this.receiverPublicKey = receiverPublicKey?.publicKey || undefined;
        if (receiverPublicKey.aesKey) {
            // symmetric key is asymmetrically-encrypted ciphertext; decrypt it with our private key
            const decryptedKeyMaterial = await this.asymEncryption.decryptMessage(receiverPublicKey.aesKey, privateKey!);
            await this.symEncryption.importRemoteKey(decryptedKeyMaterial);
        }
    }

    /**
     * Refresh the receiver's public key and, if now known, share our AES key
     * (RSA-encrypted for the receiver) with them.
     */
    public async syncWithReceiver(logger: Logger = this.logger): Promise<void> {
        await this.refreshReceiverPublicKey(logger);
        if (this.receiverPublicKey) {
            await this.shareEncryptedAesKey();
        }
    }

    // Encrypt local AES key with receiver's RSA public key and share it
    private async shareEncryptedAesKey(): Promise<void> {
        const { userId, channelId, publicKey } = this.getContext();
        const exportedKey = await this.symEncryption.exportKey();
        const encryptedAesKey = await this.asymEncryption.encryptMessage(exportedKey, this.receiverPublicKey!);
        await sharePublicKey({ aesKey: encryptedAesKey, publicKey, sender: userId, channelId });
    }
}
