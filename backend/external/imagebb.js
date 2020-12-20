const fetch = require('node-fetch');
const FormData = require('form-data');

const IMGUR = 'imgur'
const IMGBB = 'imgbb'

var Hosting = IMGBB;


var API_KEY = process.env.IMAGE_BB_API_KEY;
var api = `https://api.imgbb.com/1/upload`;
var headers = ''
var url = `${api}?expiration=600&key=${API_KEY}`;

if(Hosting === 'imgur'){
  API_KEY = process.env.IMGUR_CLIENT_ID
  url = `https://api.imgur.com/3/image`
  headers = { "Authorization": `Client-ID ${API_KEY}` }
}

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
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: form
  });
  const imageResponse = await response.json();
  try {
    return Hosting == 'imgbb' ?  {
      imageurl: imageResponse.data.image.url
    } 
      :  {
        imageurl: imageResponse.data.link
      }
  } catch (err) {
    throw new Error('failed to send image');
  }
};

module.exports = uploadImage;
