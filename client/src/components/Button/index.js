import React from 'react';
import styles from './Style.module.css';

const Button = (props) => {
  const { label, type = 'primary', disabled = false, onClick, width } = props;

  const _styles = {
    width: width || 'auto'
  };

  return (
    <div
      className={`${styles.button} ${disabled && styles.disabled}`}
      type={type}
      styles={_styles}
      onClick={onClick}
    >
      {label}
    </div>
  );
};

export default Button;
