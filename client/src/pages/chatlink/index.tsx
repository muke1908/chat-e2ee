import React, { useState, useContext } from "react";
import Button from "../../components/Button";
import LinkDisplay from "../../components/LinkDisplay/index";
import { ThemeContext } from "../../ThemeContext";
import styles from "./Style.module.css";
import ThemeToggle from "../../components/ThemeToggle/index";

import { createChatInstance } from "@chat-e2ee/service";

const App = () => {
  const [chatLink, setChatLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode] = useContext(ThemeContext);

  const generateLink = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const chate2ee = createChatInstance();
      const linkResp: string = await chate2ee.getLink();
      setChatLink(linkResp);
    } catch (error: any) {
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
            Generate a temporary link and start chatting without worrying.
          </div>
          <div className={styles.description}>
            <ul>
              <li>No login/ signup required.</li>
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
        <div
          className={`${styles.sectionContribute} ${
            darkMode === true ? styles.sectionDefault : styles.sectionDefaultLight
          }`}
        >
          <div className={styles.title}>
            The source-code is public on&nbsp;
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
