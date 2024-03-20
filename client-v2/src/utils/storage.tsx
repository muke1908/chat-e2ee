interface IStorage {
  get(key: string): any,
  set(key: string, value: any): void,
  remove(key: string): void
}

const storageProvider = (provider: Storage): IStorage => ({
  get: (key: string) => {
    const inLS = provider.getItem(key);

    if (inLS) {
      return JSON.parse(inLS);
    }

    return null;
  },
  set: (key: string, value: any) => {
    provider.setItem(key, JSON.stringify(value));
  },
  remove: (key: string) => {
    provider.removeItem(key);
  }
});

export const SS = storageProvider(window.sessionStorage);
export const LS = storageProvider(window.localStorage);
