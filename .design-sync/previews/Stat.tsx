import { Stat } from 'shift-manager';

export function Ozet() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(190px, 1fr))', gap: 16 }}>
      <Stat label="Devam Oranı" value="%92" icon="userCheck" tone="came" foot="Bu hafta · 38 personel" />
      <Stat label="Gelen Personel" value={38} icon="users" tone="primary" foot="Bugün" />
      <Stat label="Geç Kalan" value={3} icon="clock" tone="late" foot="Bu hafta" />
      <Stat label="Gelmeyen" value={2} icon="userX" tone="absent" foot="Bugün · 2 izinli" />
    </div>
  );
}

export function Tekli() {
  return (
    <div style={{ maxWidth: 240 }}>
      <Stat label="Toplam Personel" value={42} icon="users" tone="primary" foot="Aktif kayıt" />
    </div>
  );
}
