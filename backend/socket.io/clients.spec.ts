import getClientInstance, { ClientRecordInterface } from './clients';

describe('clients store', () => {
    let clients: ClientRecordInterface;

    beforeEach(() => {
        clients = getClientInstance();
    })

    it('should return empty obj', () => {
        expect(clients.getClients()).toMatchObject({});
        expect(clients.getClientsByChannel('non-existant-channel')).toMatchObject({});
    });

    it('set new client to same channel', () => {
        clients.setClientToChannel('user-id-1', 'channel-id-1', 'sid-1');
        clients.setClientToChannel('user-id-2', 'channel-id-1', 'sid-2');
        expect(clients.getClients()).toMatchObject({
            "channel-id-1": {
                "user-id-1": {
                    sid: 'sid-1'
                },
                "user-id-2": {
                    sid: 'sid-2'
                }
            }
        });
    });

    it('set new client to different channel', () => {
        clients.setClientToChannel('user-id-3', 'channel-id-3', 'sid-3');
        clients.setClientToChannel('user-id-4', 'channel-id-4', 'sid-4');
        expect(clients.getClients()).toMatchObject({
            "channel-id-3": {
                "user-id-3": {
                    sid: 'sid-3'
                },
            },
            "channel-id-4": {
                "user-id-4": {
                    sid: 'sid-4'
                }
            }
        });
    });

    it('delete client from channel', () => {
        clients.setClientToChannel('user-id-3', 'channel-id-3', 'sid-3');
        clients.setClientToChannel('user-id-4', 'channel-id-4', 'sid-4');
        clients.deleteClient('user-id-4', 'channel-id-4');
        expect(clients.getClients()).toMatchObject({
            "channel-id-3": {
                "user-id-3": {
                    sid: 'sid-3'
                },
            }
        });
    });

    it('get sid by channel id and user id', () => {
        clients.setClientToChannel('user-id-3', 'channel-id-3', 'sid-3');
        clients.setClientToChannel('user-id-4', 'channel-id-4', 'sid-4');
        const sidObj = clients.getSIDByIDs('user-id-4', 'channel-id-4');
        expect(sidObj).toMatchObject({
            sid: 'sid-4'
        });
    });

    it('should return null if channel id is invalid', () => {
        clients.setClientToChannel('user-id-3', 'channel-id-3', 'sid-3');
        clients.setClientToChannel('user-id-4', 'channel-id-4', 'sid-4');
        const sidObj = clients.getSIDByIDs('user-id-4', 'channel-id-5');
        expect(sidObj).toBe(null);
    });
});
