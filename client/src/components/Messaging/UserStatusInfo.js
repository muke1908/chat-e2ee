import React, { useContext } from 'react';
import styles from './styles/UserStatusInfo.module.css';
import { ThemeContext } from '../../ThemeContext.js';
import { FiSun, FiMoon } from 'react-icons/fi';

export const UserStatusInfo = ({ online }) => {
  const [darkMode, setDarkMode] = useContext(ThemeContext);
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };
  return (
    <div className={styles.userInfo}>
      {online ? (
        <span className={styles.userInfoOnline}>
          Alice {'<'}Online{'>'}
        </span>
      ) : (
        'Waiting for Alice to join..'
      )}
      <span className={styles.toggleIcon}>
        {darkMode === true ? (
          <FiSun className={styles.FiSun} onClick={toggleTheme} />
        ) : (
          <FiMoon className={styles.FiMoon} onClick={toggleTheme} />
        )}
      </span>
    </div>
  );
};
