import React, { useRef, useState, useContext } from 'react';
import { FiLink, FiCopy, FiExternalLink } from 'react-icons/fi';
import styles from './Style.module.css';
import { ThemeContext } from '../../ThemeContext.js';

const LinkDisplay = ({ content }) => {
  const textAreaRef = useRef(null);
  const [buttonText, setButtonText] = useState('Copy');
  const [darkMode] = useContext(ThemeContext);

  const copyCodeToClipboard = () => {
    textAreaRef.current.select();
    document.execCommand('copy');
    setButtonText('Copied');
  };

  const selectText = () => {
    textAreaRef.current.select();
  };

  return (
    <div className={styles.fullWidth}>
      <div
        className={`${styles.copyToClipboardContainer}
      ${!darkMode && styles.lightModeContainer}`}
      >
        <FiLink className={styles.linkIcon} />
        <div className={styles.textAreaContainer}>
          <input
            ref={textAreaRef}
            value={content}
            onClick={selectText}
            className={`${styles.linkTextArea}
            ${!darkMode && styles.lightTextArea}`}
            readOnly
          />
        </div>
        <div>
          <button
            className={`${styles.copyButton}
          ${!darkMode && styles.lightModeButton}`}
            onClick={copyCodeToClipboard}
          >
            <FiCopy className={styles.copyIcon} /> {buttonText}
          </button>
        </div>
      </div>
      <div
        className={`${styles.openLink}
      ${darkMode ? styles.darkOpenLink : styles.lightOpenLink}`}
      >
        <a href={content} target="_blank" rel="noopener noreferrer">
          Open chat <FiExternalLink />
        </a>
      </div>
    </div>
  );
};

export default LinkDisplay;
