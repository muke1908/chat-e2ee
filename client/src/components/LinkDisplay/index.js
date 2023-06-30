import React, { useRef, useState, useContext } from 'react';
import { FiLink, FiCopy, FiExternalLink } from 'react-icons/fi';
import styles from './Style.module.css';
import { ThemeContext } from '../../ThemeContext.js';

const LinkDisplay = ({ content }) => {
  const chatLink = content.absoluteLink
    ? content.absoluteLink
    : `${window.location.protocol}//${window.location.host}${content.link}`;
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
      <div className={styles.divider} />
      <span className={styles.pinDisplayMsg}>
        Anyone with the Link can join your chat
      </span>
      <div
        className={`${styles.copyToClipboardContainer}
        ${!darkMode && styles.lightModeContainer}`}
      >
        <span className={styles.labelLinkTextArea}>Share chat link: </span>
        <FiLink className={styles.linkIcon} />
        <div className={styles.textAreaContainer}>
          <input
            ref={textAreaRef}
            value={chatLink}
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
     
      <div className={styles.divider} />
      <div
        className={`${styles.openLink}
      ${darkMode ? styles.darkOpenLink : styles.lightOpenLink}`}
      >
        <a href={`${chatLink}`} target="_blank" rel="noopener noreferrer">
          Open chat <FiExternalLink />
        </a>
      </div>
    </div>
  );
};

export default LinkDisplay;
