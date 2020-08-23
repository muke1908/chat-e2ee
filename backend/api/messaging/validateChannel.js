const { LINK_COLLECTION } = require('../../db/const');
const { findOneFromDB } = require('../../db');

const channelValid = async (channel) => {
  const ifExists = await findOneFromDB({ hash: channel }, LINK_COLLECTION);
  if (ifExists) {
    if (ifExists.deleted || ifExists.expired) {
      return false;
    }
    return ifExists;
  }
  return ifExists;
};

module.exports = channelValid;
