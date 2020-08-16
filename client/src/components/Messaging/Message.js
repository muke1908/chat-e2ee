import React, { useCallback, useContext, useEffect, useState } from 'react';

import styles from './styles/Message.module.css';

import { ThemeContext } from '../../ThemeContext.js';

export const Message = ({ handleSend, index, message: { owner, body, local } }) => {
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const sendMessage = useCallback(async () => {
    setSending(true);
    setFailed(false);

    try {
      await handleSend(body, index);
    } catch (error) {
      console.log({ error });
      setFailed(true);
    }
    setSending(false);
  }, [body, handleSend, index]);

  useEffect(() => {
    if (local) {
      sendMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [darkMode] = useContext(ThemeContext);
  return (
    <div className={owner === true ? styles.messageRight : styles.messageLeft}>
      <div className={styles.messageInfo}>
        <div className={styles.sentReceived}>You {owner === true ? 'sent' : 'received'}</div>
        <div className={`${styles.messageContainer} ${!darkMode && styles.lightModeContainer}`}>
          {body}
        </div>
        {failed && !sending && (
          <div className={styles.messageError}>
            Failed to send message
            <div className={styles.messageRetry} onClick={sendMessage}>
              Try again
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
