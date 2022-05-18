import React, { useState, useContext } from 'react';
import { getLink } from '../../service';
import Button from '../../components/Button';
import LinkDisplay from '../../components/LinkDisplay/index.js';
import { ThemeContext } from '../../ThemeContext.js';
import styles from './Style.module.css';
import ThemeToggle from '../../components/ThemeToggle/index.js';
import PinInput from '../../components/PinInput/index.js';

const App = () => {
  const [chatLink, setChatLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode] = useContext(ThemeContext);

  const generateLink = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const linkResp = await getLink();
      setChatLink(linkResp);
    } catch (error) {
      console.error(error);
      alert(error.message);
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.linkGenerationPage}>
        <div
          className={`${styles.header}
          ${darkMode === true ? styles.darkModeHeader : styles.lightModeHeader}`}
        >
          Disposable chat session
          <ThemeToggle />
        </div>
        <div className={`${styles.sectionDefault} ${!darkMode && styles.sectionDefaultLight}`}>
          <div className={styles.title}>
            Generate temporary link and start chatting without worrying.
          </div>
          <div className={styles.description}>
            <ul>
              <li>No login/signup required.</li>
              <li>No tracker</li>
              <li>
                Your messages are <b>end-to-end</b> encrypted - technically impossible to read your
                messages by someone else.
              </li>
            </ul>
          </div>
          {!chatLink && (
            <div className={styles.linkGenerationBtnContainer}>
              <br />
              <Button
                label="Create new chat link"
                type="primary"
                onClick={generateLink}
                disabled={loading}
              />
            </div>
          )}
          {chatLink && (
            <div className={styles.captchaHeightSetter}>
              <LinkDisplay content={chatLink} />
            </div>
          )}
        </div>
        {!chatLink && (
          <div
            className={`${styles.sectionContribute} ${
              darkMode === true ? styles.sectionDefault : styles.sectionDefaultLight
            }`}
          >
            <div className={styles.title}>
              Join with a PIN
              <PinInput />
            </div>
          </div>
        )}

        <div
          className={`${styles.sectionContribute} ${
            darkMode === true ? styles.sectionDefault : styles.sectionDefaultLight
          }`}
        >
          <div className={styles.title}>
            Our source-code is public on&nbsp;
            <a
              href="https://github.com/muke1908/chat-e2ee"
              target="_blank"
              rel="noopener noreferrer"
            >
              Github
            </a>
            , feel free to contribute!
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
