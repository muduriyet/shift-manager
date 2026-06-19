import { Tabs } from 'shift-manager';

export function SatisSekmeleri() {
  return (
    <Tabs
      active="dashboard"
      onChange={() => {}}
      tabs={[
        { id: 'dashboard', label: 'Dashboard', icon: 'chart' },
        { id: 'import', label: 'İçe Aktar', icon: 'download' },
        { id: 'config', label: 'Konfigürasyon', icon: 'settings' },
      ]}
    />
  );
}
