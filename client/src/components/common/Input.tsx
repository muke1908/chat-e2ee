/**
 * Reusable Input component
 */

import React from 'react';
import { InputProps } from '../../types/index';
import './Input.css';

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  readOnly = false,
  type = 'text',
  className = '',
}) => {
  return (
    <div className={`input-group ${className}`.trim()}>
      {label && <label className="input-label">{label}</label>}
      <input
        type={type}
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
      />
    </div>
  );
};
