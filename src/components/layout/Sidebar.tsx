import type { ViewId, NavItem } from '../../types';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const NAV: NavItem[] = [
  { id: 'cizelge',    label: 'Çizelge',        icon: 'calendar' },
  { id: 'personeller', label: 'Personel Listesi', icon: 'users' },
  { id: 'gunluk',     label: 'Günlük Kontrol',  icon: 'clipboard' },
  { id: 'raporlar',   label: 'Raporlar',         icon: 'chart' },
  { id: 'ayarlar',    label: 'Ayarlar',          icon: 'settings' },
];

interface SidebarProps {
  view: ViewId;
  onNav: (id: ViewId) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ view, onNav, open, onClose }: SidebarProps) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark"><Icon name="fuel" size={20} /></span>
        <span className="brand-text">
          <b>Vardiya Yönetimi</b>
          <span>İstasyon Operasyon</span>
        </span>
      </div>

      <nav className="nav">
        <div className="nav-label">Menü</div>
        {NAV.map(n => (
          <button
            key={n.id}
            className={`nav-item${view === n.id ? ' active' : ''}`}
            onClick={() => { onNav(n.id); onClose(); }}
          >
            <Icon name={n.icon} size={18} />
            {n.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

interface TopbarMobileProps {
  onMenuOpen: () => void;
}

export function TopbarMobile({ onMenuOpen }: TopbarMobileProps) {
  return (
    <div className="topbar-mobile">
      <Button variant="ghost" icon="menu" onClick={onMenuOpen} />
      <span className="brand-mark" style={{ width: 30, height: 30 }}>
        <Icon name="fuel" size={17} />
      </span>
      <b style={{ fontSize: 15 }}>Vardiya Yönetimi</b>
      <Button variant="ghost" icon="bell" style={{ marginLeft: 'auto' }} />
    </div>
  );
}

interface ToastItem { id: number; msg: string }

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div className="toast" key={t.id}>
          <Icon name="check" size={16} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// Re-export Badge so App.tsx doesn't need a separate import just for the badge in Sidebar
export { Badge };
