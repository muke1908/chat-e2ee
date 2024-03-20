import React, { useContext } from "react";
import styles from "./Style.module.css";
import Emoji from "../Emoji";
import "../Emoji/index";
import { ThemeContext } from "../../../ThemeContext";
import { emojiArray } from "./emoji";
const emojis = [...emojiArray];
type SetStateFunction<T> = React.Dispatch<React.SetStateAction<T>>;
type EmojiRowProps = {
  text: string;
  setText: SetStateFunction<string>;
};

const EmojiRow = ({ text, setText }: EmojiRowProps) => {
  const [darkMode] = useContext(ThemeContext);

  const selectEmoji = (symbol: string) => {
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
