import type { ReactNode } from 'react';
import { Icon } from './Icon';

type StatTone = 'primary' | 'came' | 'late' | 'absent';

const TONES: Record<StatTone, { bg: string; fg: string }> = {
  primary: { bg: 'var(--primary-soft)', fg: 'var(--primary)' },
  came:    { bg: 'var(--came-bg)',      fg: 'var(--came-fg)' },
  late:    { bg: 'var(--late-bg)',      fg: 'var(--late-fg)' },
  absent:  { bg: 'var(--absent-bg)',    fg: 'var(--absent-fg)' },
};

interface StatProps {
  label: string;
  value: ReactNode;
  icon: string;
  tone?: StatTone;
  foot?: ReactNode;
}

export function Stat({ label, value, icon, tone = 'primary', foot }: StatProps) {
  const { bg, fg } = TONES[tone];
  return (
    <div className="stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-ico" style={{ background: bg, color: fg }}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="stat-val tnum">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}
