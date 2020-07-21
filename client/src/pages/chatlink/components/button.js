import React from 'react';

const Button = (props) => {
  
  const { type, state, onClick, width } = props
  
  const styles = {
    background: '#4caf50',
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
      {props.label}
    </button>
  );
};

export default Button;
