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

var sent = 0,
  received = 0;

const MessageList = (props) => {
  return (
    <div>
      {data.map(({ owner, body }, index) => (
        <div className={owner === true ? styles.messageRight : styles.messageLeft} key={index}>
          <MessageBox message={body} owner={owner} index={index} />
        </div>
      ))}
    </div>
  );
};

const MessageBox = ({ message, owner, index }) => {
  if (owner === true) {
    sent = sent + 1;
    received = 0;
  } else {
    received = received + 1;
    sent = 0;
  }
  return (
    <div className={styles.messageInfo}>
      {(sent === 1 || received === 1 || index == 0) && (
        <p className={styles.sentReceived}>You {owner === true ? 'sent' : 'received'}</p>
      )}
      <div className={styles.messageContainer}>{message}</div>
    </div>
  );
};

export default MessageList;
