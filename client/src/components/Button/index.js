import React, { useContext } from 'react';
import styles from './Style.module.css';
import { ThemeContext } from '../../ThemeContext.js';

const Button = (props) => {
  const { label, type = 'primary', disabled = false, onClick, width } = props;

  const [darkMode] = useContext(ThemeContext);

  const _styles = {
    width: width || 'auto'
  };

  return (
    <div
      className={`
      ${styles.button} 
      ${
        disabled === true ? styles.disabled : darkMode === true ? styles.darkMode : styles.lightMode
      } 
      `}
      type={type}
      styles={_styles}
      onClick={onClick}
    >
      {label}
    </div>
  );
};

export default Button;
