import loadJS from '../../utils/loadJS';

console.log(process.env.REACT_APP_CAPTCHA_KEY);

export const renderGoogleReCaptcha = (gr, captchaEl, callback, expiredCallback, colorMode) => {
  return new Promise((resolve) => {
    gr.ready(() => {
      gr.render(captchaEl, {
        sitekey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
        callback: callback,
        'expired-callback': expiredCallback,
        theme: colorMode
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
