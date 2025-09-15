import React from 'react';

export interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ 
  children, 
  variant = 'default',
  className = ''
}) => (
  <div
    className={`relative w-full rounded-lg border p-4 ${className}`}
    data-variant={variant}
    role="alert"
  >
    {children}
  </div>
);

export const AlertDescription: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`text-sm [&_p]:leading-relaxed ${className}`}>
    {children}
  </div>
);