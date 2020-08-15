import loadJS from '../../utils/loadJS';

export const renderGoogleReCaptcha = (gr, captchaEl, callback, expiredCallback) => {
  return new Promise((resolve) => {
    gr.ready(() => {
      gr.render(captchaEl, {
        sitekey: process.env.REACT_APP_CAPTCHA_KEY,
        callback: callback,
        'expired-callback': expiredCallback,
        theme: 'dark'
      });
      resolve();
    });
  });
};

export const getCaptchaInstance = async () => {
  if (window.grecaptcha) {
    return window.grecaptcha;
  } else {
    await loadJS('https://www.google.com/recaptcha/api.js?render=explicit', document);
    return window.grecaptcha;
  }
};
