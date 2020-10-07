import React, { useContext } from 'react';
import { ThemeContext } from '../../ThemeContext.js';
import styles from './Style.module.css';

const DeleteChatLink = ({ handleDeleteLink }) => {
  const [darkMode] = useContext(ThemeContext);

  const deleteHandler = async () => {
    if (window.confirm('Delete chat link forever?')) await handleDeleteLink();
  };

  return (
    <div className={styles.buttonPadding}>
      <div
        className={`${styles.deleteButton} ${!darkMode && styles.lightModeDelete}`}
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
