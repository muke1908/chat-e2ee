import loadJS from '../../utils/loadScript';

export const renderGoogleReCaptcha = (gr, callback, captchaEl) => {
  return new Promise((resolve) => {
    gr.ready(() => {
      gr.render(captchaEl, {
        sitekey: process.env.REACT_APP_CAPTCHA_KEY,
        callback: callback,
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
