import type { ViewId, NavItem } from '../../types';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const NAV: NavItem[] = [
  { id: 'cizelge',    label: 'Çizelge',        icon: 'calendar' },
  { id: 'personeller', label: 'Personel Listesi', icon: 'users' },
  { id: 'gunluk',     label: 'Günlük Kontrol',  icon: 'clipboard' },
  { id: 'gorev',      label: 'Görev Defteri',    icon: 'checkSquare' },
  { id: 'raporlar',   label: 'Raporlar',         icon: 'chart' },
  { id: 'satis',      label: 'Satış Dashboard',  icon: 'fuel' },
  { id: 'ayarlar',    label: 'Ayarlar',          icon: 'settings' },
];

interface SidebarProps {
  view: ViewId;
  onNav: (id: ViewId) => void;
  open: boolean;
  onClose: () => void;
  username: string;
  onSignOut: () => void;
}

export function Sidebar({ view, onNav, open, onClose, username, onSignOut }: SidebarProps) {
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

      <div className="sidebar-foot">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className="brand-mark" style={{ width: 30, height: 30, flex: '0 0 auto' }}>
            <Icon name="userCheck" size={16} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Oturum açık</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onSignOut} style={{ width: '100%' }}>Çıkış</Button>
      </div>
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
