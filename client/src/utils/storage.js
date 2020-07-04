const storage = {
  get: (key) => {
    const inLS = localStorage.getItem(key);

    if (inLS) {
      return JSON.parse(inLS);
    }

    return null;
  },
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove: (key) => {
    localStorage.removeItem(key);
  }
};

export default storage;
