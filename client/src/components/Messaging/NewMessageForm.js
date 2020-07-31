import React from 'react';
import styles from './styles/NewMessageForm.module.css';

export const NewMessageForm = ({ handleSubmit, text, setText }) => (
  <form onSubmit={handleSubmit} className={styles.sendMessageForm}>
    <input
      className={styles.sendMessageInput}
      type="text"
      placeholder="Write message"
      onChange={(e) => setText(e.target.value)}
      value={text}
    />
    <div className={styles.sendButton} type="submit" role="button" onClick={handleSubmit}>
      Send
    </div>
  </form>
);
