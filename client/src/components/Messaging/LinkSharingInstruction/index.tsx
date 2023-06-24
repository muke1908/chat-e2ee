import React, { useRef } from "react";
import style from "./Style.module.css";

type LinkSharingInstructionProps = {
  online?: string;
  link?: string;
  pin?: string | null;
  darkMode?: string;
};

const LinkSharingInstruction = ({ online, link, pin, darkMode }: LinkSharingInstructionProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // const pinRef = useRef(null);

  const clickHandler = () => {
    inputRef.current?.select();
  };

  // const pinClickHandler = () => {
  //   pinRef.current.select();
  // };

  return (
    <div className={style.linkSharingInstruction}>
      <div>Send this link to who you want to chat with</div>
      <input
        ref={inputRef}
        onClick={clickHandler}
        className={`${style.linkText} ${!darkMode && style.lightlinkText}`}
        value={link}
        readOnly
      />
      {/* <div className={linkPinHdr}>Or you can share the PIN</div>
      <input
        ref={pinRef}
        onClick={pinClickHandler}
        className={`${linkPin} ${!darkMode && lightlinkPin}`}
        value={pin}
        readOnly
      /> */}
    </div>
  );
};

export default LinkSharingInstruction;
