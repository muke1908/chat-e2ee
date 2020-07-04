const uuidv4 = require('uuid').v4;

const chatLinkDomain = process.env.CHAT_LINK_DOMAIN;

const generateLink = () => {
  const hash = uuidv4();
  return {
    hash,
    link: `${chatLinkDomain}/${hash}`
  };
};

module.exports = generateLink;
