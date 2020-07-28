import React from 'react';
import styles from './Style.module.css';

const MessageList = ({ data }) => {
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
    </div>
  );
};

export default MessageList;
