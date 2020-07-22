import React from 'react';

const Button = (props) => {
  const { label, type = 'primary', disabled = false, onClick, width } = props;

  const styles = {
    background: type === 'secondary' ? '#4caf50' : '#3944bc',
    color: '#fff',
    padding: '10px',
    width: width || 'auto',
    cursor: disabled === true ? '' : 'pointer',
    diplay: 'inline-block',
    borderRadius: '2px',
    borderColor: 'transparent',
    fontSize: '16px',
    opacity: disabled === true ? '0.5' : '1.0',
    fontFamily: 'inherit'
  };

  return (
    <button style={styles} type={type} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
};

export default Button;
