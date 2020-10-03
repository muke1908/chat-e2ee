import React, { useState, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import styles from './Style.module.css';
import Button from '../Button/index.js';
import { ThemeContext } from '../../ThemeContext.js';
import getChat from '../../service/getChat.js';

const LinkDisplay = () => {
  const history = useHistory();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [darkMode] = useContext(ThemeContext);
  const handlePin = async () => {
    try {
      const data = await getChat(pin);
      setError('');
      history.push(data.link);
    } catch (err) {
      console.log('Error Occured.');
      console.log(err);
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
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            className={`${styles.linkTextArea}
            ${!darkMode && styles.lightTextArea}`}
          />
        </div>
        <div>
          <Button label="Join" type="secondary" onClick={handlePin} width="200px" />
        </div>
        <div></div>
      </div>
      <p>{error}</p>
      <div
        className={`${styles.openLink}
      ${darkMode ? styles.darkOpenLink : styles.lightOpenLink}`}
      ></div>
    </div>
  );
};

export default LinkDisplay;
