import React, { useRef } from 'react';
import { linkSharingInstruction, linkText } from './Style.module.css';

const LinkSharingInstruction = ({ online, link }) => {
  const inputRef = useRef(null);

  const clickHandler = () => {
    inputRef.current.select();
  };
  return (
    <div className={linkSharingInstruction}>
      <div>Send this link to who you want to chat with</div>
      <input ref={inputRef} onClick={clickHandler} className={linkText} value={link} readOnly />
    </div>
  );
};

export default LinkSharingInstruction;
