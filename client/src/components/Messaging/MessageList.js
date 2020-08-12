import React, { useContext } from 'react';
import styles from './styles/MessageList.module.css';
import { ThemeContext } from '../../ThemeContext.js';

export const MessageList = ({ data }) => {
  const [darkMode] = useContext(ThemeContext);
  return (
    <>
      {data.map(({ owner, body }, index) => (
        <div className={owner === true ? styles.messageRight : styles.messageLeft} key={index}>
          <div className={styles.messageInfo}>
            <div className={styles.sentReceived}>You {owner === true ? 'sent' : 'received'}</div>
            <div className={`${styles.messageContainer} ${!darkMode && styles.lightModeContainer}`}>
              {body}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
