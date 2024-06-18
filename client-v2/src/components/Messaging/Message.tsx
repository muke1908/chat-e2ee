import React, { useCallback, useContext, useEffect, useState } from "react";

import styles from "./styles/Message.module.css";
import Image from "../Image";

import { ThemeContext } from "../../ThemeContext";
import { Timestamp } from "mongodb";

type messageProps = {
  owner: boolean;
  body?: string;
  image?: string;
  local?: boolean;
  id?: string;
  timestamp?: Timestamp;
};

type MessageProps = {
  handleSend: any;
  index: number;
  message: messageProps;
  deliveredID?: string[];
};

export const Message = ({
  handleSend,
  index,
  message: { owner, body, image, local, id, timestamp },
  deliveredID
}: MessageProps) => {
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const sendMessage = useCallback(async () => {
    setSending(true);
    setFailed(false);

    try {
      await handleSend(body, image, index);
    } catch (error) {
      console.log({ error });
      setFailed(true);
    }
    setSending(false);
  }, [body, image, handleSend, index]);

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
        <div className={styles.sentReceived}>You {owner === true ? "sent" : "received"}</div>
        <div className={`${styles.messageContainer} ${!darkMode && styles.lightModeContainer}`}>
          {image && <Image src={image} maxWidth="300px" maxHeight="300px" />}
          {body}
          {timestamp && (
            <span className={styles.timestamp}>
              {(owner === true ? "sent at " : "received at ") +
                new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        {failed && !sending && (
          <div className={styles.messageError}>
            Failed to send message
            <div className={styles.messageRetry} onClick={sendMessage}>
              Try again
            </div>
          </div>
        )}
        {id !== undefined && deliveredID?.includes(id) && (
          <div className={styles.messageDelivered}>Delivered&nbsp;&#10004;</div>
        )}
      </div>
    </div>
  );
};
