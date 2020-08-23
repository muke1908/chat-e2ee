const { LINK_COLLECTION } = require('../../db/const');
const { findOneFromDB } = require('../../db');

const channelValid = async (channel) => {
  const ifExists = await findOneFromDB({ hash: channel }, LINK_COLLECTION);
  if (!ifExists) {
    return {
      valid: false,
      state: 'NOT_FOUND'
    };
  }
  if (ifExists.deleted) {
    return {
      valid: false,
      state: 'DELETED'
    };
  }
  if (ifExists.expired) {
    return {
      valid: false,
      state: 'EXPIRED'
    };
  }
  return {
    valid: true,
    state: 'ACTIVE'
  };
};

module.exports = channelValid;
