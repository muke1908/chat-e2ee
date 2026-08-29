import { v4 as uuidv4 } from 'uuid';

const { CHAT_LINK_DOMAIN } = process.env;

export type LinkType = {
  hash: string,
  expired: boolean,
  deleted: boolean,
}

/**
 * Generates a new public room id.
 *
 * There is no PIN any more: joining requires the invitation fragment
 * (`#room=<hash>&secret=<...>`), which carries a 256-bit secret generated
 * entirely on the client and never sent to this server. A short, guessable
 * PIN would have defeated that guarantee.
 */
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
  };
};

export default generateHash;
