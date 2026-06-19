import { EmptyState } from 'shift-manager';

export function PersonelYok() {
  return (
    <EmptyState
      icon="users"
      title="Henüz personel eklenmemiş"
      description="İlk personeli ekleyerek vardiya planlamaya başlayın."
      action={{ label: 'Personel Ekle', icon: 'plus', onClick: () => {} }}
    />
  );
}

export function SonucYok() {
  return (
    <EmptyState
      icon="search"
      title="Sonuç bulunamadı"
      description="Arama kriterlerinize uygun kayıt yok."
    />
  );
}
