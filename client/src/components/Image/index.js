import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';

const Image = ({ src, maxHeight, maxWidth }) => {
  const [modalState, setModalState] = useState('none');

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
          setModalState('block');
        }}
      />
      <Modal style={{ height: '100%', width: '100%', display: modalState }} centered>
        <img
          src={src}
          style={style}
          alt=""
          onClick={() => {
            setModalState('none');
          }}
        />
      </Modal>
    </div>
  );
};

export default Image;
