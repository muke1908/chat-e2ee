import React, { useState, useContext } from 'react';
import styles from './Style.module.css';
import Button from '../Button/index.js';
import { ThemeContext } from '../../ThemeContext.js';

const LinkDisplay = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [darkMode] = useContext(ThemeContext);
  
  const handlePin = async () => {
    try {
      setError('');
      throw new Error('LinkDisplay.handlePin, Not implemented');
    } catch (err) {
      console.error(err);
      setError('Invalid PIN.');
    }
  };

  return (
    <div className={styles.width}>
      <div
        className={`${styles.pinContainer}
      ${!darkMode && styles.lightModeContainer}`}
      >
        <div className={styles.textAreaContainer}>
          <input
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.keyCode === 13) handlePin();
            }}
            className={`${styles.linkTextArea}
            ${!darkMode && styles.lightTextArea}`}
          />
        </div>
        <div>
          <Button label="Join" type="secondary" onClick={handlePin} />
        </div>
      </div>
      <p className={styles.error}>{error}</p>
    </div>
  );
};

export default LinkDisplay;
