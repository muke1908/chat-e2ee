import React, { useContext } from 'react';
import styles from './Style.module.css';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { ThemeContext } from '../../../../src/ThemeContext';

const RemoveButton = ({ onClick }) => {
  const [darkMode] = useContext(ThemeContext);
  return (
    <div
      className={`${styles.removeButtonContainer} 
    ${darkMode === true ? styles.darkMode : styles.lightMode}`}
    >
      <IoMdCloseCircleOutline className={styles.checkmark} onClick={onClick} />
    </div>
  );
};

export default RemoveButton;
