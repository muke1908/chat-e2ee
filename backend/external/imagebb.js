const fetch = require('node-fetch');
const FormData = require('form-data');

const API_KEY = process.env.IMAGE_BB_API_KEY;
const api = `https://api.imgbb.com/1/upload`;

const uploadImage = async (base64) => {
  if (!API_KEY) {
    throw new Error('IMAGE_BB_API_KEY - required');
  }
  if (!base64) {
    throw new Error('base64 - required arg');
  }

  const imageData = base64.substr(base64.indexOf(',') + 1);

  const form = new FormData();
  form.append('image', imageData);
  const url = `${api}?expiration=600&key=${API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    body: form
  });
  const imageResponse = await response.json();

  try {
    return {
      imageurl: imageResponse.data.image.url
    };
  } catch (err) {
    throw new Error('failed to send image');
  }
};

module.exports = uploadImage;
