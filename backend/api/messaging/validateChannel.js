const { LINK_COLLECTION } = require('../../db/const');
const { findOneFromDB } = require('../../db');

const channelValid = async (channel) => {
  const ifExists = await findOneFromDB({ hash: channel }, LINK_COLLECTION);
  return ifExists;
};

module.exports = channelValid;
