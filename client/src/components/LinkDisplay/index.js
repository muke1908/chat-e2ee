import React, { useRef, useState } from 'react';
import { FiLink, FiCopy } from 'react-icons/fi';
import './style.css';

const LinkDisplay = ({ content }) => {
  const textA = useRef(null);
  const [buttonText, setButtonText] = useState('Copy');

  const copyCodeToClipboard = () => {
    const el = textA;
    el.current.select();
    document.execCommand('copy');
    setButtonText('Copied');
  };

  const selectText = () => {
    const el = textA;
    el.current.select();
  };

  return (
    <div className="container">
      <FiLink style={{ fontSize: '20px', color: '#000' }} />
      <div style={{ width: '100%', float: 'left' }}>
        {/*  */}
        <textarea
          ref={textA}
          value={content}
          onClick={() => selectText()}
          className="linkArea"
          contentEditable="false"
        />
      </div>
      <div>
        <button className="copyButton" onClick={copyCodeToClipboard}>
          <FiCopy style={{ fontSize: '15px' }} /> {buttonText}
        </button>
      </div>
    </div>
  );
};

export default LinkDisplay;
