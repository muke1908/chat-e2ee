import React from 'react';

const Button = (props) => {
  
  const { 
    label, 
    type = 'primary', 
    disabled = false, 
    onClick, 
    width 
  } = props
  
  const styles = {
    background: type === 'secondary' ? '#4caf50' : '#3944bc',
    color: '#fff',
    padding: '10px',
    width: width || 'auto',
    cursor: 'pointer',
    diplay: 'inline-block',
    borderRadius: '2px'
  }

  return (
    <button
      style={styles}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default Button;
