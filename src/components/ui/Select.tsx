import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

type SelectValue = string | number;

export interface SelectOption {
  value: SelectValue;
  label: string;
}

interface SelectProps {
  value: SelectValue;
  onChange: (value: SelectValue) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  icon?: string;
  className?: string;
  small?: boolean;
  error?: boolean;
  /** Salt-okunur: menü açılmaz, değer değiştirilemez. */
  disabled?: boolean;
}

export function Select({
  value, onChange, options, placeholder = 'Seçiniz',
  icon, className = '', small, error, disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const opts: SelectOption[] = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  const cur = opts.find(o => o.value === value);

  const triggerCls = [
    'select-trigger',
    cur ? '' : 'placeholder',
    small ? 'btn-sm' : '',
    error ? 'is-error' : '',
  ].filter(Boolean).join(' ');

  const isOpen = open && !disabled;

  return (
    <div className={`select ${className}`} ref={ref}>
      <button
        type="button"
        className={triggerCls}
        style={small ? { height: 32 } : undefined}
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(o => !o); }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {icon && <Icon name={icon} size={15} />}
          {cur ? cur.label : placeholder}
        </span>
        <Icon name="chevronDown" size={16} />
      </button>
      {isOpen && (
        <div className="select-menu">
          {opts.map(o => (
            <div
              key={o.value}
              className={`select-opt${o.value === value ? ' sel' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
              {o.value === value && <Icon name="check" size={15} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
