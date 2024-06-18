import React, { useRef, useState, useContext } from "react";
import { FiLink, FiCopy, FiExternalLink, FiArrowDown, FiArrowUp } from "react-icons/fi";
import styles from "./Style.module.css";
import { ThemeContext } from "../../ThemeContext";
import { LinkObjType } from "@chat-e2ee/service";
import QRCode from "qrcode.react";

const LinkDisplay: React.FC<{ content: LinkObjType }> = ({ content }) => {
  const chatLink =
    content.absoluteLink ||
    `${window.location.protocol}//${window.location.host}/chat/${content.hash}`;
  const textAreaRef = useRef<HTMLInputElement | null>(null);
  const [buttonText, setButtonText] = useState("Copy");
  const [showQR, setShowQR] = useState(false);
  const [darkMode] = useContext(ThemeContext);

  const copyCodeToClipboard = () => {
    if (textAreaRef.current !== null) textAreaRef.current.select();
    document.execCommand("copy");
    setButtonText("Copied");
  };

  const selectText = () => {
    if (textAreaRef.current !== null) textAreaRef.current.select();
  };

  return (
    <>
    <div className={styles.card}>
    <h1 className={styles.title}>Anyone with the Link can join your chat</h1>
    <p className={styles.subtitle}>Share chat link:</p>
    <div  className={styles.input} >
    <input 
      ref={textAreaRef}
      value={chatLink}
      onClick={selectText}
      className={`${styles.linkTextArea} ${!darkMode && styles.lightTextArea}`}
      readOnly
     />
    </div>
    <div className={styles.flexRow}>
      
      <button 
        className={`${styles.button} ${styles.copyButton}`}
        onClick={copyCodeToClipboard}>
        <FiCopy className={styles.copyIcon} /> 
        {buttonText}
      </button>
      
      <button 
        className={`${styles.button} ${styles.qrButton}`}
        onClick={() => setShowQR(!showQR)}>
           {showQR ? (
              <div className={styles.QrCodeContent}>
                QR Code <FiArrowUp className={styles.qrIcon} />
              </div>
            ) : (
              <div className={styles.QrCodeContent}>
                QR Code <FiArrowDown className={styles.qrIcon} />
              </div>
            )}
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
    {showQR && (
      <div className={styles.qrCodeContainer}>
        <QRCode value={chatLink} size={128} />
      </div>
    )}
    
  </>
);


};

export default LinkDisplay;
