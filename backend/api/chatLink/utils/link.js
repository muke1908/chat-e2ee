const uuidv4 = require('uuid').v4;
const generatePin = require('./pin').generatePIN

const chatLinkDomain = process.env.CHAT_LINK_DOMAIN;

const generateLink = () => {
  const hash = uuidv4();
  return {
    hash,
    link: `/chat/${hash}`,
    absoluteLink: `${chatLinkDomain}/chat/${hash}`,
    expired: false,
    deleted: false,
    pin : generatePin(hash, pinLength = 4),
    pinCreatedAt : new Date()
  };
};

module.exports = generateLink;
