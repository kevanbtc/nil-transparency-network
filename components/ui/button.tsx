import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline';
  size?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  onClick,
  variant = 'default',
  size
}) => (
  <button 
    className={`button ${variant} ${size ? `size-${size}` : ''} ${className}`} 
    onClick={onClick}
  >
    {children}
  </button>
);