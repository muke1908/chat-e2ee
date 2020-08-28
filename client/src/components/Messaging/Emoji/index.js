import React from 'react';
import styles from './Style.module.css';

const Emoji = ({ symbol, text, setText }) => {
  const changeText = () => {
    setText(text + symbol);
  };
  return (
    <span className={styles.emoji} role="img" onClick={changeText}>
      {symbol}
    </span>
  );
};
export default Emoji;
