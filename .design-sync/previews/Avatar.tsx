import { Avatar } from 'shift-manager';

export function Personel() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="Ahmet Yılmaz" />
      <Avatar name="Ayşe Demir" />
      <Avatar name="Mehmet Kaya" />
      <Avatar name="Fatma Şahin" />
      <Avatar name="Zeynep Çelik" />
    </div>
  );
}

export function Boyutlar() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="Ali Vural" size={28} />
      <Avatar name="Ali Vural" size={40} />
      <Avatar name="Ali Vural" size={56} />
    </div>
  );
}
