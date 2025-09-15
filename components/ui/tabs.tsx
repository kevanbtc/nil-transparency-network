import React from 'react';

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, value, onValueChange, children, className = '' }) => (
  <div className={`tabs ${className}`} data-default-value={defaultValue} data-value={value}>
    {children}
  </div>
);

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => (
  <div className={`tabs-list ${className}`}>{children}</div>
);

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className = '' }) => (
  <button className={`tabs-trigger ${className}`} data-value={value}>
    {children}
  </button>
);

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className = '' }) => (
  <div className={`tabs-content ${className}`} data-value={value}>
    {children}
  </div>
);

// Alias for backward compatibility
export const TabsToken = TabsTrigger;