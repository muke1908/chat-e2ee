const imgbb = require('./imgbb')
const imgur = require('./imgur')

const uploadImage = async (base64) => {

  if (!base64) {
    throw new Error('base64 - required arg');
  }
  
  const IMAGE_HOSTING_PROVIDER = 'imgbb'

  switch (IMAGE_HOSTING_PROVIDER){
    case 'imgbb':
      return await imgbb(base64)
    case 'imgur':
      return await imgur(base64)
  }

}

module.exports = uploadImage;
