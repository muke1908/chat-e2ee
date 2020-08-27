const fetch = require('node-fetch');
const FormData = require('form-data');

const API_KEY = process.env.IMAGE_BB_API_KEY;
const api = `https://api.imgbb.com/1/upload`;

const uploadImage = async (base64) => {
  if (!base64) {
    throw new Error('base64 - required arg');
  }
  const form = new FormData();
  form.append('image', base64);
  const url = `${api}?expiration=600&key=${API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    body: form
  });
  const data = await response.json();
  return data;
};

module.exports = uploadImage;
