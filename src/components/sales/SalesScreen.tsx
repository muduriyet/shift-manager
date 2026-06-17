import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Station, Department, SalesImportConfig } from '../../types';
import { Tabs, type TabItem } from '../ui/Tabs';
import { EmptyState } from '../ui/EmptyState';
import { SalesConfigTab } from './SalesConfigTab';

type SalesTab = 'dashboard' | 'import' | 'config';

const SALES_TABS: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard',     icon: 'chart' },
  { id: 'import',    label: 'İçe Aktar',     icon: 'inbox' },
  { id: 'config',    label: 'Konfigürasyon', icon: 'settings' },
];

function readStoredSalesTab(): SalesTab {
  const v = localStorage.getItem('vy_sales_tab');
  return v === 'import' || v === 'config' || v === 'dashboard' ? v : 'dashboard';
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
export function SalesScreen({ salesConfigs, setSalesConfigs, onToast }: SalesScreenProps) {
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
          <EmptyState
            icon="chart"
            title="Dashboard hazırlanıyor"
            description="Veri içe aktardıkça KPI kartları ve grafikler burada görünecek."
          />
        )}
        {tab === 'import' && (
          <EmptyState
            icon="inbox"
            title="İçe Aktarma"
            description="Günlük ve özet Excel dosyalarını buradan yükleyip önizleyeceksiniz."
          />
        )}
        {tab === 'config' && (
          <SalesConfigTab configs={salesConfigs} setConfigs={setSalesConfigs} onToast={onToast} />
        )}
      </div>
    </div>
  );
}
