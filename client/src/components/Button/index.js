import React, { useContext } from 'react';
import styles from './Style.module.css';
import { ThemeContext } from '../../ThemeContext.js';

const Button = (props) => {
  const { label, type = 'primary', disabled = false, onClick } = props;

  const [darkMode] = useContext(ThemeContext);
  return (
    <div
      className={`
      ${type === 'primary' ? styles.primary : styles.secondary} 
      ${styles.button} 
      ${
        disabled === true ? styles.disabled : darkMode === true ? styles.darkMode : styles.lightMode
      } 
      `}
      onClick={onClick}
    >
      {label}
    </div>
  );
};

export default Button;
