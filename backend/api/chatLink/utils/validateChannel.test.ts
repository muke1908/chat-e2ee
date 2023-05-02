import channelValid, { CHANNEL_STATE } from './validateChannel';
import db from "../../../db";
import { LINK_COLLECTION } from '../../../db/const';

jest.mock('../../../db');

describe('channelValid', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should throw an error is the channel is not provided', async () => {
        await expect(channelValid('')).rejects.toThrow("channel - required param");
    });

    it('should return NOT_FOUND if the channel does not exist in the db', async () => {
        db.findOneFromDB = jest.fn().mockResolvedValueOnce(null);
        const result = await channelValid('nonexistent_channel');
        expect(db.findOneFromDB).toBeCalledWith({ hash: 'nonexistent_channel' }, LINK_COLLECTION);
        expect(result.valid).toBe(false);
        expect(result.state).toBe(CHANNEL_STATE.NOT_FOUND);
    });

    it('should return ACTIVE if the channel exists in the database and it is not expired or deleted', async () => {
        const channel = {
            hash: 'active_channel',
            expired: false,
            deleted: false
        }
        db.findOneFromDB = jest.fn().mockResolvedValueOnce(channel);
        const result = await channelValid(channel.hash);
        expect(db.findOneFromDB).toBeCalledWith({ hash: 'active_channel' }, LINK_COLLECTION);
        expect(result.valid).toBe(true);
        expect(result.state).toBe(CHANNEL_STATE.ACTIVE);
    });

    it('should return deleted if the channel exists in the database and it is deleted', async () => {
        const channel = {
            hash: 'deleted_channel',
            expired: false,
            deleted: true
        }
        db.findOneFromDB = jest.fn().mockResolvedValueOnce(channel);
        const result = await channelValid(channel.hash);
        expect(db.findOneFromDB).toBeCalledWith({ hash: 'deleted_channel' }, LINK_COLLECTION);
        expect(result.valid).toBe(false);
        expect(result.state).toBe(CHANNEL_STATE.DELETED);
    });

    it('should return expired if the channel exists in the database and it is expired', async () => {
        const channel = {
            hash: 'expired_channel',
            expired: true,
            deleted: false
        }
        db.findOneFromDB = jest.fn().mockResolvedValueOnce(channel);
        const result = await channelValid(channel.hash);
        expect(db.findOneFromDB).toBeCalledWith({ hash: 'expired_channel' }, LINK_COLLECTION);
        expect(result.valid).toBe(false);
        expect(result.state).toBe(CHANNEL_STATE.EXPIRED);
    });
});