import { Icon } from './Icon';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

// Alt sekme barı (Satış Dashboard: Dashboard / İçe Aktar / Konfigürasyon).
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={`tab${active === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon && <Icon name={t.icon} size={16} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}
