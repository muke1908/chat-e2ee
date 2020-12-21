const fetch = require('node-fetch');
const FormData = require('form-data');

const API_KEY = process.env.IMGUR_API_KEY
const url = `https://api.imgur.com/3/image`
const headers = { "Authorization": `Client-ID ${API_KEY}` }

const uploadImage = async (base64) => {
  if (!API_KEY) {
    throw new Error('IMGUR_API_KEY - required');
  }
  if (!base64) {
    throw new Error('base64 - required arg');
  }

  const imageData = base64.substr(base64.indexOf(',') + 1);

  const form = new FormData();
  form.append('image', imageData);
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: form
  });

  const imageResponse = await response.json();

  try {
    return {
        imageurl: imageResponse.data.link
      }
  } catch (err) {
    throw new Error('failed to send image');
  }
};

module.exports = uploadImage;
