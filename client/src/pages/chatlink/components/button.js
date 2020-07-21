import React from 'react';
import '../src/pages/chatlink/style.css';

const Button = (props) => {
  const w = {
    width: props.width
  };

  return (
    <button
      className="generate-link-button"
      type={props.type}
      disabled={props.state}
      onClick={props.onClick}
      style={w}
    >
      {props.label}
    </button>
  );
};

export default Button;
