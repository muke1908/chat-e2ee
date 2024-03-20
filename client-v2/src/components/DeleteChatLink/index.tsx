import React, { useContext } from "react";
import { ThemeContext } from "../../ThemeContext";
import styles from "./Style.module.css";

const DeleteChatLink = ({ handleDeleteLink }: any) => {
  const [darkMode] = useContext(ThemeContext);

  const deleteHandler = async () => {
    if (window.confirm("Delete chat link forever?")) await handleDeleteLink();
  };

  return (
    <div>
      <div
        className={`${styles.deleteButton} ${!darkMode && styles.lightModeDelete}`}
        role="button"
        onClick={deleteHandler}
      >
        Delete
      </div>
    </div>
  );
};

export default DeleteChatLink;
