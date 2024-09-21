import React from "react";
import styles from "./Style.module.css";
import { MdClose } from "react-icons/md";

type ShowErrorProps = {
  errorMessage: string;
  onClose: (event: React.MouseEvent<HTMLDivElement>) => void;
};

const ShowError = (props: ShowErrorProps) => {
  console.log(`in show error compo ${typeof props.errorMessage}`);
  return (
    <div className={styles.bg} onClick={props.onClose}>
      <div
        className={styles.err}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h3 className={styles.heading}>Error</h3>
        <span onClick={props.onClose}>
          <MdClose className={styles.closeIcon} title="close" size={25} />
        </span>
        <p>{props.errorMessage}</p>
      </div>
    </div>
  );
};

export default ShowError;
