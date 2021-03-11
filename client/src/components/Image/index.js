import React from 'react';
import Modal from 'react-bootstrap/Modal';

const Image = ({ src, maxHeight, maxWidth }) => {
  const style = {
    objectFit: 'contain',
    maxHeight,
    maxWidth
  };

return (
    <div>
      <img
        src={src}
        style={style}
        alt=""
        onClick={() => {
          document.getElementById(src).style.display = 'block';
        }}
      />
      <Modal id={src} style={{ height: '100%', width: '100%', display: 'none' }} centered>
        <img
          src={src}
          style={{ height: '100%', width: '100%' }}
          alt=""
          onClick={() => {
            document.getElementById(src).style.display = 'none';
          }}
        />
      </Modal>
    </div>
  );
};

export default Image;
