import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export interface DropdownAction {
  label: string;
  icon?: string;
  onClick: () => void;
}

interface DropdownButtonProps {
  label: string;
  icon?: string;
  actions: DropdownAction[];
  variant?: 'primary' | 'outline' | 'ghost';
}

export function DropdownButton({
  label,
  icon,
  actions,
  variant = 'outline',
}: DropdownButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="dropdown" ref={ref}>
      <Button
        type="button"
        variant={variant}
        icon={icon}
        iconRight="chevronDown"
        onClick={() => setOpen(value => !value)}
      >
        {label}
      </Button>
      {open && (
        <div className="dropdown-menu">
          {actions.map(action => (
            <button
              type="button"
              key={action.label}
              className="dropdown-opt"
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
            >
              {action.icon && <Icon name={action.icon} size={15} />}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
