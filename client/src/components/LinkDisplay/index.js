import React, { useRef, useState } from 'react';
import { FiLink, FiCopy } from 'react-icons/fi';
import styles from './Style.module.css';

const LinkDisplay = ({ content }) => {
  const textAreaRef = useRef(null);
  const [buttonText, setButtonText] = useState('Copy');

  const copyCodeToClipboard = () => {
    textAreaRef.current.select();
    document.execCommand('copy');
    setButtonText('Copied');
  };

  const selectText = () => {
    textAreaRef.current.select();
  };

  return (
    <div className={styles.copyToClipboardContainer}>
      <FiLink className={styles.linkIcon} />
      <div className={styles.textAreaContainer}>
        <textarea
          ref={textAreaRef}
          value={content}
          onClick={selectText}
          className={styles.linkTextArea}
          contentEditable="false"
        />
      </div>
      <div>
        <button className={styles.copyButton} onClick={copyCodeToClipboard}>
          <FiCopy className={styles.copyIcon} /> {buttonText}
        </button>
      </div>
    </div>
  );
};

export default LinkDisplay;
