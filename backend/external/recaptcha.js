const fetch = require('node-fetch');

const RECAPTCHA_SECRET = process.env.GOOGLE_RECAPTCHA_SECRET;
const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`; // https://developers.google.com/recaptcha/docs/verify#api_request

const verifyCaptcha = async (token) => {
  const url = `${verifyUrl}?secret=${RECAPTCHA_SECRET}&response=${token}`;

  const response = await fetch(url);
  const data = await response.json();
  return data;
};

module.exports = verifyCaptcha;
