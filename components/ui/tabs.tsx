import React from 'react';

export interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ 
  children, 
  defaultValue, 
  value, 
  onValueChange: _onValueChange,
  className = '' 
}) => (
  <div className={className} data-value={value || defaultValue}>
    {children}
  </div>
);

export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`flex ${className}`} role="tablist">
    {children}
  </div>
);

export const TabsTrigger: React.FC<{ 
  children: React.ReactNode; 
  value: string;
  className?: string 
}> = ({ children, value, className = '' }) => (
  <button className={`px-4 py-2 ${className}`} role="tab" data-value={value}>
    {children}
  </button>
);

export const TabsContent: React.FC<{ 
  children: React.ReactNode; 
  value: string;
  className?: string 
}> = ({ children, value, className = '' }) => (
  <div className={className} role="tabpanel" data-value={value}>
    {children}
  </div>
);