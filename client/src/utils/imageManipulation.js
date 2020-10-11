import uniqueSequence from './uniqueSequence.js';

const imageManipulation = ({ imageURL, reconstruct = false }) => {
  const image = new Image();

  image.src = imageURL;

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const width = Math.min(400, image.width);
  const ratio = image.width / image.height;

  const canvaHeight = width / ratio;

  ctx.canvas.width = width;
  ctx.canvas.height = canvaHeight;

  const random = uniqueSequence(width);

  const replacedPixel = {};

  for (let i = 0; i < canvaHeight; i++) {
    for (let j = 0; j < width; j++) {
      if (reconstruct) {
        const sourceKey = `${i}-${random[j]}`;
        const destinationKey = `${i}-${j}`;

        const source = ctx.getImageData(random[j], i, 1, 1);
        const destination = ctx.getImageData(j, i, 1, 1);
        replacedPixel[destinationKey] = destination;

        if (replacedPixel[sourceKey]) {
          ctx.putImageData(replacedPixel[sourceKey], j, i);
        } else {
          ctx.putImageData(source, j, i);
        }
      } else {
        const sourceKey = `${i}-${j}`;
        const destinationKey = `${i}-${random[j]}`;

        const source = ctx.getImageData(j, i, 1, 1);
        const destination = ctx.getImageData(random[j], i, 1, 1);
        replacedPixel[destinationKey] = destination;

        if (replacedPixel[sourceKey]) {
          ctx.putImageData(replacedPixel[sourceKey], random[j], i);
        } else {
          ctx.putImageData(source, random[j], i);
        }
      }
    }
  }

  const url = canvas.toDataURL();

  return url;
};

export default imageManipulation;
