import React, { useContext } from 'react';
import { ThemeContext } from '../../ThemeContext.js';
import { deleteLinkButton } from './Style.module.css';
import styles from '../Messaging/styles/NewMessageForm.module.css';

const DeleteChatLink = ({ handleDeleteLink }) => {
  const [darkMode] = useContext(ThemeContext);

  const deleteHandler = async () => {
    if (window.confirm('Delete chat link forever?')) await handleDeleteLink();
  };

  return (
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
  );
};

export default DeleteChatLink;
