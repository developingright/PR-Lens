import type { ComponentProps, ReactNode } from 'react';

interface IconButtonProps extends ComponentProps<'button'> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, children, className = '', ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`lens-icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
