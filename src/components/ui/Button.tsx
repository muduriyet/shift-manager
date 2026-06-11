import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger-ghost';
  size?: 'sm' | 'md';
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size,
  icon,
  iconRight,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    !children ? 'btn-icon' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 16} />}
    </button>
  );
}
