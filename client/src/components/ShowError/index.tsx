import React from "react";
import styles from "./Style.module.css";
import { MdClose } from "react-icons/md";

type ShowErrorProps = {
  errorMessage: string;
  onClose: (
    event: React.MouseEvent<HTMLDivElement | HTMLSpanElement> | React.KeyboardEvent<HTMLDivElement>
  ) => void;
};

const ShowError = (props: ShowErrorProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      props.onClose(e);
      e.stopPropagation();
    }
  };

  return (
    <div
      className={styles.bg}
      onClick={props.onClose}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      role="button"
    >
      <div
        role="button"
        tabIndex={0}
        className={styles.err}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={handleKeyDown}
      >
        <h3 className={styles.heading}>Error</h3>
        <span onClick={props.onClose} role="button" tabIndex={0} onKeyDown={handleKeyDown}>
          <MdClose className={styles.closeIcon} title="close" size={25} />
        </span>
        <p>{props.errorMessage}</p>
      </div>
    </div>
  );
};

export default ShowError;
