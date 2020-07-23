import React, { useRef, useState } from 'react';
import { FiLink, FiCopy } from 'react-icons/fi';
import './style.css';

const LinkDisplay = ({ content }) => {
  const textAreaRef = useRef(null);
  const [buttonText, setButtonText] = useState('Copy');

  const copyCodeToClipboard = () => {
    textAreaRef.current.select();
    document.execCommand('copy');
    setButtonText('Copied');
  };

  const selectText = () => {
    const el = textAreaRef;
    el.current.select();
  };

  return (
    <div id="copyToClipboardContainer">
      <FiLink id="linkIcon" />
      <div id="textAreaContainer">
        {/*  */}
        <textarea
          ref={textAreaRef}
          value={content}
          onClick={selectText}
          id="linkTextArea"
          contentEditable="false"
        />
      </div>
      <div>
        <button id="copyButton" onClick={copyCodeToClipboard}>
          <FiCopy id="copyIcon" /> {buttonText}
        </button>
      </div>
    </div>
  );
};

export default LinkDisplay;
