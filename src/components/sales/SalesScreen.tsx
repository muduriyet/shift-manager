import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Station, Department, SalesImportConfig } from '../../types';
import { Tabs, type TabItem } from '../ui/Tabs';
import { SalesConfigTab } from './SalesConfigTab';
import { SalesImportTab } from './SalesImportTab';
import { SalesDashboardTab } from './SalesDashboardTab';
import { SalesExploreTab } from './SalesExploreTab';

type SalesTab = 'dashboard' | 'import' | 'config' | 'explore';

const SALES_TABS: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard',     icon: 'chart' },
  { id: 'import',    label: 'İçe Aktar',     icon: 'inbox' },
  { id: 'config',    label: 'Konfigürasyon', icon: 'settings' },
  { id: 'explore',   label: 'Veri Gezgini',  icon: 'search' },
];

function readStoredSalesTab(): SalesTab {
  const v = localStorage.getItem('vy_sales_tab');
  return v === 'import' || v === 'config' || v === 'dashboard' || v === 'explore' ? v : 'dashboard';
}

interface SalesScreenProps {
  stations: Station[];
  departments: Department[];
  salesConfigs: SalesImportConfig[];
  setSalesConfigs: Dispatch<SetStateAction<SalesImportConfig[]>>;
  onToast: (msg: string) => void;
}

// SD-06: ekran kabuğu + sekmeler. Sekme içerikleri SD-07 (Konfigürasyon),
// SD-08 (İçe Aktar) ve SD-11 (Dashboard) ile doldurulacak.
export function SalesScreen({ stations, departments, salesConfigs, setSalesConfigs, onToast }: SalesScreenProps) {
  const [tab, setTab] = useState<SalesTab>(readStoredSalesTab);
  useEffect(() => { localStorage.setItem('vy_sales_tab', tab); }, [tab]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Satış Dashboard</h1>
          <p className="page-desc">
            Akaryakıt satış verilerini içe aktarın, konfigüre edin ve günlük/aylık performansı izleyin.
          </p>
        </div>
      </div>

      <Tabs tabs={SALES_TABS} active={tab} onChange={id => setTab(id as SalesTab)} />

      <div style={{ marginTop: 20 }}>
        {tab === 'dashboard' && (
          <SalesDashboardTab stations={stations} departments={departments} onToast={onToast} />
        )}
        {tab === 'import' && (
          <SalesImportTab
            stations={stations}
            departments={departments}
            salesConfigs={salesConfigs}
            onToast={onToast}
          />
        )}
        {tab === 'config' && (
          <SalesConfigTab configs={salesConfigs} setConfigs={setSalesConfigs} onToast={onToast} />
        )}
        {tab === 'explore' && (
          <SalesExploreTab stations={stations} departments={departments} onToast={onToast} />
        )}
      </div>
    </div>
  );
}
