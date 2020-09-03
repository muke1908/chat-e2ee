import React, { useState, useEffect } from 'react';
import styles from './styles/UserStatusInfo.module.css';
import ThemeToggle from '../ThemeToggle/index.js';
import imageRetryIcon from './assets/image-retry.png';

export const UserStatusInfo = ({ online, getSetUsers, channelID }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (online) setLoading(false);
  }, [online]);

  const fetchKeyAgain = () => {
    if (loading) return;

    setLoading(true);
    getSetUsers(channelID);
  };

  return (
    <div className={styles.userInfo}>
      {online ? (
        <span className={styles.userInfoOnline}>
          Alice {'<'}Online{'>'}
        </span>
      ) : (
        <div className={styles.userOnlineWaiting}>
          Waiting for Alice to join...
          <img
            className={
              loading ? `${styles.retryImageIcon} ${styles.loading}` : `${styles.retryImageIcon}`
            }
            src={imageRetryIcon}
            onClick={fetchKeyAgain}
            alt="retry-icon"
          />
        </div>
      )}
      <ThemeToggle />
    </div>
  );
};
