import React, { useRef } from 'react';
import styles from './styles/NewMessageForm.module.css';

export const NewMessageForm = ({ handleSubmit, text, setText }) => {
  const inputRef = useRef(null);

  const wrapperHandler = (e) => {
    inputRef.current.focus();
    handleSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.sendMessageForm}>
      <input
        ref={inputRef}
        className={styles.sendMessageInput}
        type="text"
        placeholder="Write message"
        onChange={(e) => setText(e.target.value)}
        value={text}
      />
      <div className={styles.sendButton} type="submit" role="button" onClick={wrapperHandler}>
        Send
      </div>
    </form>
  );
};
