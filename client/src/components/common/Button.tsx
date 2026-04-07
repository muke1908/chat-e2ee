/**
 * Reusable Button component
 */

import React from 'react';
import { ButtonProps } from '../../types/index';
import './Button.css';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  onClick,
  disabled = false,
  circle = false,
  children,
  className = '',
  title,
}) => {
  const baseClass = 'btn';
  const variantClass = `btn--${variant}`;
  const sizeClass = size ? `btn--${size}` : '';
  const circleClass = circle ? 'btn--circle' : '';

  const classes = `${baseClass} ${variantClass} ${sizeClass} ${circleClass} ${className}`.trim();

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
};
