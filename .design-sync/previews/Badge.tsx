import { Badge } from 'shift-manager';

export function VardiyaDurumu() {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Badge status="Planlandı" dot />
      <Badge status="Geldi" dot />
      <Badge status="Gelmedi" dot />
    </div>
  );
}

export function PersonelDurumu() {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <Badge status="Aktif" dot />
      <Badge status="Pasif" dot />
    </div>
  );
}

export function Etiketler() {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Badge>Akaryakıt</Badge>
      <Badge>Market</Badge>
      <Badge>Ümraniye</Badge>
      <Badge>Şile</Badge>
    </div>
  );
}
