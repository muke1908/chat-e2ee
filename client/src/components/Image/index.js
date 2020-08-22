import React from 'react';

const Image = ({ src, maxHeight, maxWidth }) => {
  const customStyle = {
    objectFit: 'contain',
    maxHeight: { maxHeight },
    maxWidth: { maxWidth }
  };

  return (
    <div>
      <img src={src} style={customStyle} alt="" />;
    </div>
  );
};

export default Image;
