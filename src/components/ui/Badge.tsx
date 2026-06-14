import type { ReactNode } from 'react';

const STATUS_BADGE: Record<string, string> = {
  Planlandı:    'badge-plan',
  Geldi:        'badge-came',
  Gelmedi:      'badge-absent',
  Aktif:        'badge-active',
  Pasif:        'badge-passive',
};

interface BadgeProps {
  children?: ReactNode;
  variant?: string;
  status?: string;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant, status, dot, className = '' }: BadgeProps) {
  const cls = status
    ? (STATUS_BADGE[status] ?? 'badge-neutral')
    : variant ? `badge-${variant}` : 'badge-neutral';

  return (
    <span
      className={`badge ${cls} ${className}`}
      style={{ justifyContent: 'center', fontSize: 14, textAlign: 'center', padding: '0 9px' }}
    >
      {dot && <span className="dot" />}
      {children ?? status}
    </span>
  );
}
