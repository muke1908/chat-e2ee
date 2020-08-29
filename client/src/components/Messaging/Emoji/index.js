import React from 'react';
import styles from './Style.module.css';

const Emoji = ({ symbol, onClick }) => {
  return (
    <span className={styles.emoji} role="img" onClick={onClick}>
      {symbol}
    </span>
  );
};
export default Emoji;
