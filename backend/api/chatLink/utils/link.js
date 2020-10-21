const uuidv4 = require('uuid').v4;
const { generatePIN } = require('./pin');

const CHAT_LINK_DOMAIN = process.env.CHAT_LINK_DOMAIN;
const PIN_LENGTH = 4;

const generateLink = () => {
  const hash = uuidv4();
  
  return {
    hash,
    link: `/chat/${hash}`,
    absoluteLink: `${CHAT_LINK_DOMAIN}/chat/${hash}`,
    expired: false,
    deleted: false,
    pin: generatePIN(hash, PIN_LENGTH),
    pinCreatedAt: new Date().getTime()
  };
};

module.exports = generateLink;
