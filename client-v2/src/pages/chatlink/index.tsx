import React, { useState } from "react";
import Button from "../../components/Button";
import LinkDisplay from "../../components/LinkDisplay/index";
import ThemeToggle from "../../components/ThemeToggle/index";

import { createChatInstance, LinkObjType } from "@chat-e2ee/service";

import styles from "./Style.module.css";


const App = () => {
  const [chatLink, setChatLink] = useState<LinkObjType>(null);
  const [loading, setLoading] = useState(false);

  const generateLink = async () => {
    if (loading) {
      return;
    }
    
    setLoading(true);
    try {
      const chate2ee = createChatInstance();
      const linkResp = await chate2ee.getLink();
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
      <div className={styles.flexContainer}>
        <div />
        <main className={styles.mainContent}>
          <div className={styles.subContent}>
            <h1 className={styles.title}>🔐 Disposable e2ee-chat 🔐</h1>
            <ThemeToggle />
            <p className={styles.paragraph}>
              Secure, end-to-end encrypted environment for exchanging sensitive information with peer.
            </p>
            <ul className={styles.list}>
              <li>No login/ signup required</li>
              <li>No tracker</li>
              <li>
                Your messages are end-to-end encrypted - technically impossible to read your messages by someone else.
              </li>
            </ul>
          </div>
          {!chatLink && (
             <div className={styles.linkGenerationBtnContainer}>
             <br />
             <Button
               label={loading?"Creating...":"Create chat link"}
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

          <div className="flex justify-center items-center w-full">
            <div className={styles.infoBox}>
              <p className={styles.paragraph}>
                ❤️ The source-code is public on Github, feel free to contribute!
              </p>
            </div>
          </div>
        </main>
        <div />
      </div>
    </>
  );
}



export default App;
