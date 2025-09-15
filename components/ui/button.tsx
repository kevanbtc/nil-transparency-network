import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  onClick,
  variant = 'default'
}) => (
  <button 
    className={`button ${variant} ${className}`} 
    onClick={onClick}
  >
    {children}
  </button>
);