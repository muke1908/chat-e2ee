import uniqueSequence from './uniqueSequence.js';

export const deconstructImage = ({ height, width }) => {
  const image = new Image();

  image.src = './location.png';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const random = uniqueSequence(width);

  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      ctx.drawImage(image, j, 1, 1, i, j, 1, 1);
    }
  }
};

export default deconstructImage;
