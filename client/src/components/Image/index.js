import React from 'react';

const Image = ({ src, maxHeight, maxWidth }) => {
  const style = {
    objectFit: 'contain',
    maxHeight,
    maxWidth
  };

  return <img src={src} style={style} alt="" />;
};

export default Image;
