import React from 'react';

const Button = (props) => {
  
  const { label, type, state, onClick, width } = props
  
  const styles = {
    background: type == 'secondary' ? '#4caf50' : '#3944bc',
    color: '#fff',
    padding: '10px',
    width: width,
    cursor: 'pointer',
    diplay: 'flex',
    alignItem: 'center',
    justifyContent: 'center',
    borderRadius: '2px'
  }

  return (
    <button
      style={styles}
      type={type}
      disabled={state}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default Button;
