import React, { useRef, useContext } from 'react';
import { linkSharingInstruction, linkText, deleteLinkButton } from './Style.module.css';
import styles from '../styles/NewMessageForm.module.css';
import { ThemeContext } from '../../../ThemeContext';

const LinkSharingInstruction = ({ online, link, handleDeleteLink }) => {
  const inputRef = useRef(null);
  const [darkMode] = useContext(ThemeContext);

  const clickHandler = () => {
    inputRef.current.select();
  };
  const deleteHandler = async () => {
    if (window.confirm('Delete chat link forever?')) await handleDeleteLink();
  };
  return (
    <div className={linkSharingInstruction}>
      <div>Send this link to who you want to chat with</div>
      <input ref={inputRef} onClick={clickHandler} className={linkText} value={link} readOnly />
      <div className={deleteLinkButton}>
        <div
          className={`${styles.sendButton} ${!darkMode && styles.lightModeSend}`}
          type="submit"
          role="button"
          onClick={deleteHandler}
        >
          Delete
        </div>
      </div>
    </div>
  );
};

export default LinkSharingInstruction;
