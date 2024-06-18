import { LS } from "../../../utils/storage";
type keyPairType = {
  publicKey: string;
  privateKey: string;
};
export const getKeyPairFromCache = (channelID: string) => {
  const keyPair_storage = LS.get("session-keyPair") || {};
  const keyPair = keyPair_storage.channelID === channelID ? keyPair_storage.keyPair : null;

  if (keyPair) {
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  return null;
};

export const storeKeyPair = (channelID: string, keys: keyPairType | null) => {
  const _keyPair = keys;
  LS.set("session-keyPair", {
    channelID,
    keyPair: _keyPair
  });
};
