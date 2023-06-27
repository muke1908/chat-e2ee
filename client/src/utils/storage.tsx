type storageSetParams = {
  channelID: string;
  userId: string;
};
type storageKeyPairParams = {
  channelID: string;
  keyPair: object | null;
};

const storageProvider = (provider: any) => ({
  get: (key: string) => {
    const inLS = provider.getItem(key);

    if (inLS) {
      return JSON.parse(inLS);
    }

    return null;
  },
  set: (key: string, value: storageSetParams | storageKeyPairParams | boolean) => {
    provider.setItem(key, JSON.stringify(value));
  },
  remove: (key: string) => {
    provider.removeItem(key);
  }
});

export const SS = storageProvider(window.sessionStorage);
export const LS = storageProvider(window.localStorage);
