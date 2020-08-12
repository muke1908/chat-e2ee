import React from 'react';
import styles from './styles/UserStatusInfo.module.css';
import ThemeToggle from '../ThemeToggle/index.js';

export const UserStatusInfo = ({ online }) => {
  return (
    <div className={styles.userInfo}>
      {online ? (
        <span className={styles.userInfoOnline}>
          Alice {'<'}Online{'>'}
        </span>
      ) : (
        'Waiting for Alice to join..'
      )}
      <ThemeToggle />
    </div>
  );
};
