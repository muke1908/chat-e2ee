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
    // TODO: handle error

    if (loading) {
      return;
    }

    setLoading(true);
    const linkResp = await getLink();
    setChatLink(linkResp);
    setLoading(false);
  };

  return (
    <>
      <div className={styles.linkGenerationPage}>
        <div
          className={`${styles.header}
          ${darkMode === true ? styles.darkModeHeader : styles.lightModeHeader}`}
        >
          Because privacy matters!
          <ThemeToggle />
        </div>
        <div className={`${styles.sectionDefault} ${!darkMode && styles.sectionDefaultLight}`}>
          <div className={styles.title}>
            Generate temporary link and start chatting without worrying.
          </div>
          <div className={styles.description}>
            <ul>
              <li>No login/signup required.</li>
              <li>We don't track you.</li>
              <li>
                Your messages are <b>end-to-end</b> encrypted - technically impossible to read your
                messages by someone else.
              </li>
            </ul>
          </div>
          {!chatLink && (
            <>
              <br />
              <Button
                label="Generate Link"
                type="secondary"
                onClick={generateLink}
                width="200px"
                disabled={loading}
              />
            </>
          )}
          {chatLink && (
            <div className={styles.captchaHeightSetter}>
              <LinkDisplay content={chatLink.absoluteLink} />
            </div>
          )}
        </div>
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
