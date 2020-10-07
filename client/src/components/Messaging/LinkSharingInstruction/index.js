import React, { useRef } from 'react';
import {
  linkSharingInstruction,
  linkText,
  linkPin,
  linkPinHdr,
  lightlinkText,
  lightlinkPin
} from './Style.module.css';

const LinkSharingInstruction = ({ online, link, pin, darkMode }) => {
  const inputRef = useRef(null);
  const pinRef = useRef(null);

  const clickHandler = () => {
    inputRef.current.select();
  };

  const pinClickHandler = () => {
    pinRef.current.select();
  };

  return (
    <div className={linkSharingInstruction}>
      <div>Send this link to who you want to chat with</div>
      <input
        ref={inputRef}
        onClick={clickHandler}
        className={`${linkText} ${!darkMode && lightlinkText}`}
        value={link}
        readOnly
      />
      <div className={linkPinHdr}>Or you can share the PIN</div>
      <input
        ref={pinRef}
        onClick={pinClickHandler}
        className={`${linkPin} ${!darkMode && lightlinkPin}`}
        value={pin}
        readOnly
      />
    </div>
  );
};

export default LinkSharingInstruction;
