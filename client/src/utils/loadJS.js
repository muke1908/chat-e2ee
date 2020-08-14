const loadJS = (src, document) => {
  return new Promise((resolve, reject) => {
    const fileref = document.createElement('script');
    fileref.src = src;
    document.body.appendChild(fileref);
    fileref.onload = () => {
      resolve();
    };

    fileref.onload = resolve;

    fileref.onerror = reject;
  });
};

export default loadJS;
