import channelValid, { CHANNEL_STATE } from './validateChannel';
import db from "../../../db";

jest.mock('../../../db');

describe('channelValid', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // test if channel is provided otherwise throw new Error("channel - required param");
    it('should throw an error is the channel is not provided', async () => {
        await expect(channelValid('')).rejects.toThrow("channel - required param");
    });

    it('should return NOT_FOUND if the channel does not exist in the db', async () => {
        const findOneFromDBMock = db.findOneFromDB as jest.MockedFunction<typeof db.findOneFromDB>;
        findOneFromDBMock.mockResolvedValueOnce(null);
        // WHere is the above being used?
        const result = await channelValid('nonexistent_channel');
        expect(result.valid).toBe(false);
        expect(result.state).toBe(CHANNEL_STATE.NOT_FOUND);
    });

    it('should return ACTIVE if the channel exists in the database and it is not expired or deleted', async () => {
        const channel = {
            hash: 'active_channel',
            expired: false,
            deleted: false
        }
        const findOneFromDBMock = db.findOneFromDB as jest.MockedFunction<typeof db.findOneFromDB>;
        findOneFromDBMock.mockResolvedValueOnce(channel);
        const result = await channelValid(channel.hash);
        expect(result.valid).toBe(true);
        expect(result.state).toBe(CHANNEL_STATE.ACTIVE);
    });

    it('should return deleted if the channel exists in the database and it is deleted', async () => {
        const channel = {
            hash: 'deleted_channel',
            expired: false,
            deleted: true
        }
        const findOneFromDbMock = db.findOneFromDB as jest.MockedFunction<typeof db.findOneFromDB>;
        findOneFromDbMock.mockResolvedValueOnce(channel);
        const result = await channelValid(channel.hash);
        expect(result.valid).toBe(false);
        expect(result.state).toBe(CHANNEL_STATE.DELETED);
    });

    it('should return expired if the channel exists in the database and it is expired', async () => {
        const channel = {
            hash: 'expired_channel',
            expired: true,
            deleted: false
        }
        const findOneFromDbMock = db.findOneFromDB as jest.MockedFunction<typeof db.findOneFromDB>;
        findOneFromDbMock.mockResolvedValueOnce(channel);
        const result = await channelValid(channel.hash);
        expect(result.valid).toBe(false);
        expect(result.state).toBe(CHANNEL_STATE.EXPIRED);
    });
});