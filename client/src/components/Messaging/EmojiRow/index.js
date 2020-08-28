import React from 'react';
import styles from './Style.module.css';
import Emoji from '../Emoji';
import '../Emoji/index.js';

const EmojiRow = ({ text, setText }) => {
  return (
    <div className={styles.emojiRow}>
      <Emoji symbol="🙂" text={text} setText={setText} />
      <Emoji symbol="😀" text={text} setText={setText} />
      <Emoji symbol="😂" text={text} setText={setText} />
      <Emoji symbol="😍" text={text} setText={setText} />
      <Emoji symbol="😘" text={text} setText={setText} />
      <Emoji symbol="😜" text={text} setText={setText} />
      <Emoji symbol="🧐" text={text} setText={setText} />
      <Emoji symbol="😎" text={text} setText={setText} />
      <Emoji symbol="🤩" text={text} setText={setText} />
      <Emoji symbol="🥳" text={text} setText={setText} />
      <Emoji symbol="😏" text={text} setText={setText} />
      <Emoji symbol="😒" text={text} setText={setText} />
      <Emoji symbol="😔" text={text} setText={setText} />
      <Emoji symbol="😩" text={text} setText={setText} />
      <Emoji symbol="😭" text={text} setText={setText} />
    </div>
  );
};

export default EmojiRow;
