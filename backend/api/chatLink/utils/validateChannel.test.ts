// test if channel is provided otherwise throw new Error("channel - required param");
// test that a valid channel returns valid: true
// test that an invalid channel returns valid: false
// test that a non-existent channel returns valid: false, state: CHANNEL_STATE.NOT_FOUND
// Test that the function handles database errors gracefully
// Test that the function calls the expected database function with the correct parameters

// For const { expired, deleted } = ifExists;
// Test cases that cover the following scenarios:
// expired is true and deleted is false
// expired is false and deleted is true
// Both expired and deleted are true
// Neither expired nor deleted are true
// For each scenario, check that the expected state and valid properties are returned by the function.
  
// Test the return value, example:
// test('channelValid returns expected object', async () => {
//     const ifExists = { expired: true, deleted: false };
//     const result = await channelValid('my_channel_id', ifExists);
//     expect(result.valid).toBe(false);
//     expect(result.state).toBe(CHANNEL_STATE.EXPIRED);
// });
  
import channelValid, { CHANNEL_STATE } from './validateChannel';