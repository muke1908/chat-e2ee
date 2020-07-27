import React from 'react';
import styles from './Style.module.css';

const data = [
  {
    self: true,
    body: 'Hey Alice'
  },
  {
    self: false,
    body: 'Hi Bob'
  }
];

var check1 = 0,
  check2 = 0;

const MessageList = (props) => {
  return (
    <div>
      {data.map((data, index) => (
        <div>
          <div
            className={data.self === true ? styles.messageRight : styles.messageLeft}
            key={index}
          >
            <MessageBox message={data.body} />
          </div>
        </div>
      ))}
    </div>
  );
};

const MessageBox = (props) => {
  return <div className={styles.messageContainer}>{props.message}</div>;
};

export default MessageList;
