import React from 'react';
import styles from './styles/MessageList.module.css';

export const MessageList = ({ data }) => {
  return (
    <>
      {data.map(({ owner, body }, index) => (
        <div className={owner === true ? styles.messageRight : styles.messageLeft} key={index}>
          <div className={styles.messageInfo}>
            <div className={styles.sentReceived}>You {owner === true ? 'sent' : 'received'}</div>
            <div className={styles.messageContainer}>{body}</div>
          </div>
        </div>
      ))}
    </>
  );
};
