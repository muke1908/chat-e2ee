import React, { useContext } from "react";
import styles from "./Style.module.css";
import { IoMdCloseCircleOutline } from "react-icons/io";
import { ThemeContext } from "../../../ThemeContext";

type ButtonProps = {
  onClick: React.MouseEventHandler<HTMLButtonElement> | React.MouseEventHandler<SVGElement>;
};

const RemoveButton = ({ onClick }: ButtonProps) => {
  const [darkMode] = useContext(ThemeContext);
  return (
    <div
      className={`${styles.removeButtonContainer} 
    ${darkMode === true ? styles.darkMode : styles.lightMode}`}
    >
      <IoMdCloseCircleOutline
        className={styles.checkmark}
        onClick={onClick as React.MouseEventHandler<SVGElement>}
      />
    </div>
  );
};

export default RemoveButton;
