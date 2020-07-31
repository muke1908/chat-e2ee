import React, { useRef, useEffect } from 'react';
import styles from './styles/MessageList.module.css';

export const MessageList = ({ data }) => {
  const divRef = useRef(null);

  useEffect(() => {
    window.ff = divRef.current;
    const timer = setTimeout(() => {
      divRef.current.scrollIntoView({ behaviour: 'smooth' });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [data.length]);

  return (
    <div>
      {data.map(({ owner, body }, index) => (
        <div className={owner === true ? styles.messageRight : styles.messageLeft} key={index}>
          <div className={styles.messageInfo}>
            <div className={styles.sentReceived}>You {owner === true ? 'sent' : 'received'}</div>
            <div className={styles.messageContainer}>{body}</div>
          </div>
        </div>
      ))}
      <div ref={divRef} />
    </div>
  );
};
