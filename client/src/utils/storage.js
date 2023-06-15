const storageProvider = (provider) => ({
  get: (key) => {
    const result = provider.getItem(key);
    if (!result) {
      return null;
    }

    return JSON.parse(result);
  },
  set: (key, value) => {
    provider.setItem(key, JSON.stringify(value))
  },
  remove: (key) => {
    provider.removeItem(key);
  },
});

export const SS = storageProvider(window.sessionStorage);
export const LS = storageProvider(window.localStorage);


