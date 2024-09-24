import React, { useRef, useState, useContext, useEffect } from "react";
import { FiLink, FiCopy, FiExternalLink } from "react-icons/fi";
import { MdOutlineQrCode } from "react-icons/md";
import styles from "./Style.module.css";
import { ThemeContext } from "../../ThemeContext";
import { LinkObjType } from "@chat-e2ee/service";
import { QRCodeSVG } from "qrcode.react";
import detectMobile from "../../utils/detectMobile";

const LinkDisplay: React.FC<{ content: LinkObjType }> = ({ content }) => {
  const chatLink =
    content.absoluteLink ||
    `${window.location.protocol}//${window.location.host}/chat/${content.hash}`;
  const textAreaRef = useRef<HTMLInputElement | null>(null);
  const [buttonText, setButtonText] = useState("Copy");
  const [showQR, setShowQR] = useState(false);
  const [darkMode] = useContext(ThemeContext);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(detectMobile());
  }, []);

  const copyCodeToClipboard = () => {
    if (textAreaRef.current !== null) textAreaRef.current.select();
    document.execCommand("copy");
    setButtonText("Copied");
  };

  const selectText = () => {
    if (textAreaRef.current !== null) textAreaRef.current.select();
  };

  return (
    <div className={styles.fullWidth}>
      <div className={styles.divider} />
      <span className={styles.pinDisplayMsg}>Anyone with the Link can join your chat</span>
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
            <FiCopy className={styles.copyIcon} /> {!isMobile && buttonText}
          </button>
          <button
            type="button"
            className={`${styles.qrButton} ${!darkMode && styles.lightModeButton}`}
            onClick={() => setShowQR(!showQR)}
          >
            <div className={styles.QrCodeContent}>
              <MdOutlineQrCode className={styles.qrIcon} /> {!isMobile && "QR Code"}
            </div>
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
          <QRCodeSVG value={chatLink} size={128} />
        </div>
      )}
    </div>
  );
};

export default LinkDisplay;
