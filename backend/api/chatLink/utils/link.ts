import { v4 as uuidv4 } from 'uuid';
import { generatePIN } from './pin';

const { CHAT_LINK_DOMAIN } = process.env;
const PIN_LENGTH = 4;

export type LinkType = {
  hash: string,
  link: string,
  absoluteLink: string,
  expired: boolean,
  deleted: boolean,
  pin: number,
  pinCreatedAt: number,
}

const generateLink = (): LinkType => {
  const hash = uuidv4();

  if (!CHAT_LINK_DOMAIN) {
    // eslint-disable-next-line no-console
    console.error('CHAT_LINK_DOMAIN not found in env');
  }

  return {
    hash,
    link: `/chat/${hash}`,
    absoluteLink: CHAT_LINK_DOMAIN && `${CHAT_LINK_DOMAIN}/chat/${hash}`,
    expired: false,
    deleted: false,
    pin: Number(generatePIN(hash, PIN_LENGTH)),
    pinCreatedAt: new Date().getTime()
  };
};

export default generateLink;
