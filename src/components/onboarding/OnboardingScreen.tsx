import { useEffect, useState } from 'react';
import type { Employee, Station, Department, Role, Onboarding } from '../../types';
import { fetchOnboardings } from '../../lib/db';
import { EmptyState } from '../ui/EmptyState';

interface OnboardingScreenProps {
  employees: Employee[];
  stations: Station[];
  departments: Department[];
  roles: Role[];
  currentUserId: string | null;
  onEmployeeSaved: (e: Employee) => void;
  onToast: (msg: string) => void;
}

// S1 — iskelet. Liste/detay S2 ve S3'te geliyor; şu an yalnız veri katmanının
// uçtan uca çalıştığını gösteren sayaç var.
export function OnboardingScreen({ onToast }: OnboardingScreenProps) {
  const [list, setList] = useState<Onboarding[]>([]);
  const [loading, setLoading] = useState(true);

  // Ekran-yerel fetch (alive guard) — App'in giriş anındaki Promise.all'ına
  // eklenmedi; oradaki bir hata tüm uygulamayı bloke ediyor.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchOnboardings();
        if (alive) setList(data);
      } catch (err) {
        console.error('İşe giriş süreçleri yüklenemedi', err);
        onToast('İşe giriş süreçleri yüklenemedi');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [onToast]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">İşe Giriş Süreçleri</h1>
          <p className="page-desc">Yeni personelin işe giriş adımlarını ve evrak durumunu takip edin</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13.5 }}>
            Yükleniyor…
          </div>
        ) : (
          <EmptyState
            icon="userCheck"
            title="Açık işe giriş süreci yok"
            description={`Veri katmanı hazır (${list.length} açık süreç). Liste ekranı S2'de geliyor.`}
          />
        )}
      </div>
    </div>
  );
}
