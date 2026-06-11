import type { ReactNode, CSSProperties } from 'react';
import { useEffect } from 'react';
import { Button } from './Button';

interface DialogProps {
  title: string;
  desc?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: number;
  style?: CSSProperties;
}

export function Dialog({ title, desc, children, footer, onClose, width, style }: DialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="dialog dialog-wrap"
        style={{ ...(width ? { maxWidth: width } : {}), ...style }}
      >
        <Button variant="ghost" size="sm" className="dialog-close" icon="x" onClick={onClose} />
        <div className="dialog-head">
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
        {children}
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}
