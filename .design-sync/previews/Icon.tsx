import { Icon } from 'shift-manager';

const NAMES = [
  'calendar', 'users', 'clipboard', 'chart', 'settings', 'fuel', 'building',
  'clock', 'bell', 'download', 'search', 'filter', 'check', 'x', 'plus',
  'pencil', 'trash', 'userCheck', 'userX', 'layers', 'pin', 'inbox',
  'alertCircle', 'checkSquare', 'menu', 'chevronDown', 'grip', 'minus',
];

export function Galeri() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 16, color: 'var(--foreground)' }}>
      {NAMES.map((n) => (
        <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--muted-foreground)' }}>
          <Icon name={n} size={22} />
          <span>{n}</span>
        </div>
      ))}
    </div>
  );
}

export function Boyutlar() {
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', color: 'var(--primary)' }}>
      <Icon name="fuel" size={16} />
      <Icon name="fuel" size={22} />
      <Icon name="fuel" size={32} />
      <Icon name="fuel" size={44} />
    </div>
  );
}
