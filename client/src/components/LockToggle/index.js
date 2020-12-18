import React, { useContext, useState } from 'react';
import { ThemeContext } from '../../ThemeContext.js';
import { BsLock, BsUnlock } from 'react-icons/bs';
import styles from './Style.module.css';
import storage from '../../utils/storage';
import { LockContext } from '../../LockContext.js';

const extraPin = (pinLength) => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomChars = [];
  for (var i = 0; i < pinLength; i++) {
    randomChars.push(chars[Math.floor(Math.random() * 100000) % chars.length]);
  }

  return randomChars.join('');
};

const LockToggle = ({ content }) => {
  const [darkMode] = useContext(ThemeContext);

  const [lockMode, setLockMode] = useState(false);

  const toggleLock = () => {
    storage.set('locked', !lockMode);
    setLockMode(!lockMode);
    const url = new URLSearchParams(window.location.search);
    window.history.replaceState(
      { locked: lockMode },
      '',
      `?pin=${url.get('pin')}&?locked=${!lockMode}` +
        (!lockMode == true ? `&?extrapin=${extraPin(8)}` : '')
    );
  };

  return (
    <span className={styles.toggleLock}>
      {lockMode === true ? (
        <BsLock className={styles.BsLock} onClick={toggleLock} />
      ) : (
        <BsUnlock className={styles.BsUnlock} onClick={toggleLock} />
      )}
    </span>
  );
};

export default LockToggle;
