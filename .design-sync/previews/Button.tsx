import { Button } from 'shift-manager';

export function Varyantlar() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button variant="primary" icon="plus">Vardiya Ekle</Button>
      <Button variant="outline" icon="download">Excel'e Aktar</Button>
      <Button variant="ghost" icon="pencil">Düzenle</Button>
      <Button variant="danger-ghost" icon="trash">Sil</Button>
    </div>
  );
}

export function Boyutlar() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Button variant="primary" size="md" icon="check">Orta (md)</Button>
      <Button variant="primary" size="sm" icon="check">Küçük (sm)</Button>
    </div>
  );
}

export function SadeceSimge() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Button variant="outline" icon="chevronLeft" aria-label="Önceki" />
      <Button variant="outline" icon="chevronRight" aria-label="Sonraki" />
      <Button variant="primary" icon="check" aria-label="Onayla" />
      <Button variant="danger-ghost" icon="x" aria-label="Kapat" />
    </div>
  );
}

export function Pasif() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Button variant="primary" disabled>Kaydet</Button>
      <Button variant="outline" icon="download" disabled>Dışa Aktar</Button>
    </div>
  );
}
