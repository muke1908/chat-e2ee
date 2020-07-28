import React from 'react';
import styles from './Style.module.css';

const data = [
  {
    owner: true,
    body: 'Hey Alice'
  },
  {
    owner: false,
    body: 'Hi Bob'
  }
];

const MessageList = (props) => {
  return (
    <>
      {data.map(({ owner, body }, index) => (
        <div>
          <div className={owner === true ? styles.messageRight : styles.messageLeft} key={index}>
            <MessageBox message={body} />
          </div>
        </div>
      ))}
    </>
  );
};

const MessageBox = ({ message }) => {
  return <div className={styles.messageContainer}>{message}</div>;
};

export default MessageList;
