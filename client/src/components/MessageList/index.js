import React from 'react';
import styles from './Style.module.css';

const data = [
  {
    owner: true,
    body: 'Hey Alice!'
  },
  {
    owner: false,
    body: 'Hi Bob!'
  },
  {
    owner: false,
    body: 'I believe this chat e2e is pretty cool.'
  },
  {
    owner: true,
    body: 'Oh yes! It is.'
  },
  {
    owner: true,
    body: "Not only does nobody able to see your chats. It doesn't even share your history."
  }
];

const MessageList = (props) => {
  return (
    <div>
      {data.map(({ owner, body }, index) => (
        <div className={owner === true ? styles.messageRight : styles.messageLeft} key={index}>
          <div>
            <div className={styles.sentReceived}>You {owner === true ? 'sent' : 'received'}</div>
            <MessageBox message={body} owner={owner} index={index} />
          </div>
        </div>
      ))}
    </div>
  );
};

const MessageBox = ({ message }) => {
  return (
    <div className={styles.messageInfo}>
      <div className={styles.messageContainer}>{message}</div>
    </div>
  );
};

export default MessageList;
