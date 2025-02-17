import { v4 as uuidv4 } from 'uuid';
import { generatePIN } from './pin';

const { CHAT_LINK_DOMAIN } = process.env;
const PIN_LENGTH = 4;

export type LinkType = {
  hash: string,
  expired: boolean,
  deleted: boolean,
  pin: string,
  pinCreatedAt: number,
}

const generateHash = (): LinkType => {
  const hash = uuidv4();

  if (!CHAT_LINK_DOMAIN) {
    // eslint-disable-next-line no-console
    console.warn('CHAT_LINK_DOMAIN not found in env');
  }

  return {
    hash,
    expired: false,
    deleted: false,
    pin: generatePIN(hash, PIN_LENGTH),
    pinCreatedAt: new Date().getTime()
  };
};

export default generateHash;
