type storageSetParams = {
  channelID: string;
  userId: string;
};
type storageKeyPairParams = {
  channelID: string;
  keyPair: object | null;
};

const storage = {
  get: (key: string) => {
    const inLS = localStorage.getItem(key);

    if (inLS) {
      return JSON.parse(inLS);
    }

    return null;
  },
  set: (key: string, value: storageSetParams | storageKeyPairParams | boolean) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove: (key: string) => {
    localStorage.removeItem(key);
  }
};

export default storage;
