import React, { useContext } from 'react';
import styles from './Style.module.css';
import Emoji from '../Emoji';
import '../Emoji/index.js';
import { ThemeContext } from '../../../ThemeContext.js';
import { emojiArray } from './emoji'
const emojis = [...emojiArray];

const EmojiRow = ({ text, setText }) => {
  const [darkMode] = useContext(ThemeContext);

  const selectEmoji = (symbol) => {
    setText(text + symbol);
  };

  return (
    <div className={`${styles.emojiRow} ${!darkMode && styles.lightEmojiRow}`}>
      {emojis.map((sym, index) => (
        <Emoji key={index} symbol={sym} onClick={() => selectEmoji(sym)} />
      ))}
    </div>
  );
};

export default EmojiRow;
