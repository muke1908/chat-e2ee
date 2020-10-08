import React, { useContext } from 'react';
import styles from './Style.module.css';
import { ThemeContext } from '../../ThemeContext.js';

const PinDisplay = ({ content }) => {
  const [darkMode] = useContext(ThemeContext);

  return (
    <div className={styles.width}>
      <div className={`${styles.pinContainer} ${!darkMode && styles.lightModeContainer}`}>
        <div className={styles.textAreaContainer}>
          <input
            maxLength={4}
            value={content}
            readOnly
            className={`${styles.linkTextArea} ${!darkMode && styles.lightTextArea}`}
          />
        </div>
      </div>
    </div>
  );
};

export default PinDisplay;
