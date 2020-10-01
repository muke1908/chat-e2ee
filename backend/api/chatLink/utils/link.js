const uuidv4 = require('uuid').v4;
const { generatePIN } = require('./pin')

const chatLinkDomain = process.env.CHAT_LINK_DOMAIN;

const generateLink = () => {
  const hash = uuidv4();
  return {
    hash,
    link: `/chat/${hash}`,
    absoluteLink: `${chatLinkDomain}/chat/${hash}`,
    expired: false,
    deleted: false,
    pin : generatePIN(hash, pinLength = 4),
    pinCreatedAt : new Date()
  };
};

module.exports = generateLink;
