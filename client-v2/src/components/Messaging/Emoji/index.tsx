import React from "react";
import styles from "./Style.module.css";

type EmojiProps = {
  symbol: string;
  onClick: (event: React.MouseEvent<HTMLSpanElement>) => void;
};

const Emoji = ({ symbol, onClick }: EmojiProps) => {
  return (
    <span className={styles.emoji} role="img" onClick={onClick}>
      {symbol}
    </span>
  );
};
export default Emoji;
