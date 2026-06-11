import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && (
        <span className="field-error">
          <Icon name="alertCircle" size={13} />
          {error}
        </span>
      )}
    </label>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
export function Input({ error, className = '', ...rest }: InputProps) {
  return <input className={`input${error ? ' is-error' : ''} ${className}`} {...rest} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}
export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="input-search" style={{ minWidth: 220 }}>
      <Icon name="search" size={16} />
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
