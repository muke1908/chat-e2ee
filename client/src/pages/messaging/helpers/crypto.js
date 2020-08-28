import storage from '../../../utils/storage';
export const getKeyPairFromCache = (channelID) => {
  const keyPair_storage = storage.get('session-keyPair') || {};
  const keyPair = keyPair_storage.channelID === channelID ? keyPair_storage.keyPair : null;

  if (keyPair) {
    return {
      publicKey: strToTypedArr(keyPair.publicKey),
      secretKey: strToTypedArr(keyPair.secretKey)
    };
  }

  return null;
};

export const createKeyPair = () => {
  return window.nacl.box.keyPair();
};

export const encryptMsg = ({ text, mySecretKey, alicePublicKey }) => {
  const nonce = window.nacl.randomBytes(24);
  const box = window.nacl.box(
    window.nacl.util.decodeUTF8(text),
    nonce,
    alicePublicKey,
    mySecretKey
  );

  return {
    box,
    nonce
  };
};

export const decryptMsg = ({ box, nonce, mySecretKey, alicePublicKey }) => {
  const payload = window.nacl.box.open(box, nonce, alicePublicKey, mySecretKey);
  const utf8 = window.nacl.util.encodeUTF8(payload);
  return {
    msg: utf8
  };
};

export const storeKeyPair = (channelID, { publicKey, secretKey }) => {
  const _keyPair = {
    publicKey: typedArrayToStr(publicKey),
    secretKey: typedArrayToStr(secretKey)
  };
  storage.set('session-keyPair', {
    channelID,
    keyPair: _keyPair
  });
};

export const typedArrayToStr = (typedArray) => {
  const arr = Array.from // if available
    ? Array.from(typedArray) // use Array#from
    : typedArray.map((v) => v); // otherwise map()

  const str = JSON.stringify(arr);
  return str;
};

export const strToTypedArr = (str) => {
  const arr = JSON.parse(str);
  const typedArray = new Uint8Array(arr);
  return typedArray;
};
