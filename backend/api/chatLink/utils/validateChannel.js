const { LINK_COLLECTION } = require('../../../db/const');
const { findOneFromDB } = require('../../../db');

const channelValid = async (channel) => {
  if (!channel) {
    throw new Error('channel - required param');
  }
  const ifExists = await findOneFromDB({ hash: channel }, LINK_COLLECTION);
  if (!ifExists) {
    return {
      valid: false,
      state: 'NOT_FOUND'
    };
  }
  const { expired, deleted } = ifExists;
  const inValid = expired || deleted;

  const validState = 'ACTIVE';
  const invalidState = (deleted && 'DELETED') || (expired && 'EXPIRED');

  const state = inValid ? invalidState : validState;
  return {
    valid: !inValid,
    state
  };
};

module.exports = channelValid;
