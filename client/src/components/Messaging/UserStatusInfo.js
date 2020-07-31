import React from 'react';
import styles from './styles/UserStatusInfo.module.css';

export const UserStatusInfo = ({ online }) => (
  <div className={styles.userInfo}>
    {online ? (
      <span className={styles.userInfoOnline}>
        Alice {'<'}Online{'>'}
      </span>
    ) : (
      'Waiting for Alice to join..'
    )}
  </div>
);
