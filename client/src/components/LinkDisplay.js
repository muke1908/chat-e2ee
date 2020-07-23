import React, { useState } from 'react';
import { FiLink, FiCopy } from 'react-icons/fi';

const LinkDisplay = (props) => {
  const [textA, setTextA] = useState();
  const [copiedText, setCopiedText] = useState('Copy');

  const copyCodeToClipboard = () => {
    const el = textA;
    el.select();
    document.execCommand('copy');
    setCopiedText('Copied');
  };

  const selectText = () => {
    const el = textA;
    el.select();
  };

  const card_styles = {
    background: '#fff',
    boxShadow: '0 5px 5px rgba(0,0,0,0.05), 0 6px 6px rgba(0,0,0,0.05)',
    color: '#fff',
    display: 'flex',
    padding: '2px',
    flex: '1',
    borderRadius: '5px',
    marginTop: '20px',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    paddingLeft: '10px'
  };

  const box_styles = {
    width: '95%',
    borderWidth: '0px',
    fontFamily: 'inherit',
    fontSize: '18px',
    outline: 'None',
    display: 'inline',
    paddingTop: '10px',
    height: '28px'
  };

  const button_style = {
    outline: 'None',
    borderWidth: '1px',
    borderColor: 'f0f0f0',
    fontFamily: 'inherit',
    fontSize: '15px',
    width: '100px',
    height: '40px',
    borderRadius: '3px',
    cursor: 'pointer'
  };

  return (
    <div style={card_styles}>
      <FiLink style={{ fontSize: '20px', color: '#000' }} />
      <div style={{ width: '100%', float: 'left' }}>
        {/*  */}
        <textarea
          ref={(textArea) => {
            setTextA(textArea);
          }}
          value={props.content}
          onClick={() => selectText()}
          style={box_styles}
          contentEditable="false"
        />
      </div>
      <div>
        <button onClick={() => copyCodeToClipboard()} style={button_style}>
          <FiCopy style={{ fontSize: '18px' }} /> {copiedText}
        </button>
      </div>
    </div>
  );
};

export default LinkDisplay;
