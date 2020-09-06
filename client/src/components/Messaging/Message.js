import React, { useCallback, useContext, useEffect, useState } from 'react';

import styles from './styles/Message.module.css';
import Image from '../Image';

import { ThemeContext } from '../../ThemeContext.js';

export const Message = ({
  handleSend,
  index,
  message: { owner, body, image, local, id },
  deliveredID
}) => {
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const sendMessage = useCallback(async () => {
    setSending(true);
    setFailed(false);

    try {
      await handleSend(body, image, index, id);
    } catch (error) {
      console.log({ error });
      setFailed(true);
    }
    setSending(false);
  }, [body, image, handleSend, index, id]);

  useEffect(() => {
    if (local) {
      sendMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [darkMode] = useContext(ThemeContext);
  // const regex = /\bdata:image\b/g;
  // const isImg = body.match(regex);
  return (
    <div className={owner === true ? styles.messageRight : styles.messageLeft}>
      <div className={styles.messageInfo}>
        <div className={styles.sentReceived}>You {owner === true ? 'sent' : 'received'}</div>
        <div className={`${styles.messageContainer} ${!darkMode && styles.lightModeContainer}`}>
          {image && <Image src={image} maxWidth="300px" maxHeight="300px" />}
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
        {owner && deliveredID.includes(id) && !sending && !failed && (
          <div className={styles.messageDelivered}>Delivered</div>
        )}
      </div>
    </div>
  );
};
