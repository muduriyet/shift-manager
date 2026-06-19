import { DropdownButton } from 'shift-manager';

// The menu is internal open-state (closed at rest, no defaultOpen prop), so the
// card shows the styled trigger — the component's resting render. Opening is
// interaction-only and can't be captured statically.
export function Varyantlar() {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <DropdownButton
        label="Dışa Aktar"
        icon="download"
        variant="outline"
        actions={[
          { label: 'Excel (.xlsx)', icon: 'download', onClick: () => {} },
          { label: 'Şablonla Aktar', icon: 'layers', onClick: () => {} },
        ]}
      />
      <DropdownButton
        label="Ekle"
        icon="plus"
        variant="primary"
        actions={[
          { label: 'Personel', icon: 'users', onClick: () => {} },
          { label: 'Vardiya', icon: 'calendar', onClick: () => {} },
        ]}
      />
    </div>
  );
}
