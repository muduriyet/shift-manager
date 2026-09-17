import { useEffect, useState } from 'react';
import type { OnboardingDocDef, OnboardingDocSet } from '../../types';
import { addDocDef, fetchDocDefs, removeDocDef } from '../../lib/db';
import { DOC_SETS } from '../../lib/onboarding';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Field';

interface OnboardingDocDefsModalProps {
  // Devam eden süreç sayısı — ekleme mesajında "kaç sürece düştü" demek için.
  openCount: number;
  onClose: (degistiMi: boolean) => void;
  onToast: (msg: string) => void;
}

export function OnboardingDocDefsModal({ openCount, onClose, onToast }: OnboardingDocDefsModalProps) {
  const [defs, setDefs] = useState<OnboardingDocDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [degisti, setDegisti] = useState(false);
  const [ekleniyorSet, setEkleniyorSet] = useState<OnboardingDocSet | null>(null);
  const [yeniAd, setYeniAd] = useState('');
  const [yeniAciklama, setYeniAciklama] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [silinecek, setSilinecek] = useState<OnboardingDocDef | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchDocDefs();
        if (alive) setDefs(d);
      } catch (err) {
        console.error('Evrak tanımları yüklenemedi', err);
        onToast('Evrak tanımları yüklenemedi');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [onToast]);

  function ekleAc(setId: OnboardingDocSet) {
    setEkleniyorSet(setId);
    setYeniAd('');
    setYeniAciklama('');
  }

  // Ekleme YAYILIR: RPC tanımı yazar ve devam eden süreçlere de düşürür.
  async function ekle() {
    const ad = yeniAd.trim();
    if (!ad || !ekleniyorSet || kaydediliyor) return;
    setKaydediliyor(true);
    try {
      await addDocDef(ekleniyorSet, ad, yeniAciklama.trim());
      setDefs(await fetchDocDefs());
      setDegisti(true);
      setEkleniyorSet(null);
      onToast(
        openCount > 0
          ? `«${ad}» eklendi — devam eden ${openCount} sürece de düştü.`
          : `«${ad}» eklendi.`,
      );
    } catch (err) {
      console.error('Evrak tanımı eklenemedi', err);
      onToast('Evrak tanımı eklenemedi');
    } finally {
      setKaydediliyor(false);
    }
  }

  // Kaldırma YAYILMAZ: mevcut süreçlerdeki kopyalar (ve işaretleri) korunur.
  async function kaldir(def: OnboardingDocDef) {
    setSilinecek(null);
    try {
      await removeDocDef(def.id);
      setDefs(prev => prev.filter(d => d.id !== def.id));
      setDegisti(true);
      onToast(`«${def.name}» kaldırıldı.`);
    } catch (err) {
      console.error('Evrak tanımı kaldırılamadı', err);
      onToast('Evrak tanımı kaldırılamadı');
    }
  }

  return (
    <>
      <Dialog
        title="Evrak Tanımları"
        desc="Süreçlerde kontrol edilen evrak listesi. Değişiklikler arşivlenmiş süreçleri etkilemez."
        width={620}
        onClose={() => onClose(degisti)}
        footer={<Button variant="outline" onClick={() => onClose(degisti)}>Kapat</Button>}
      >
        <div className="dialog-body">
          {loading ? (
            <p className="col-2" style={{ margin: 0, padding: 20, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13.5 }}>
              Yükleniyor…
            </p>
          ) : DOC_SETS.map(set => {
            const satirlar = defs.filter(d => d.docSet === set.id);
            return (
              <div className="col-2" key={set.id} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{set.title}</h3>
                  <span style={{ fontSize: 12, color: 'var(--subtle-foreground)' }}>{satirlar.length} evrak</span>
                </div>

                <div className="set-list">
                  {satirlar.map(d => (
                    <div className="set-item" key={d.id}>
                      <Icon name="clipboard" size={16} style={{ color: 'var(--muted-foreground)' }} />
                      <div className="si-main">
                        <b>{d.name}</b>
                        {d.description && <span>{d.description}</span>}
                      </div>
                      <button
                        title="Kaldır"
                        onClick={() => setSilinecek(d)}
                        style={{ marginLeft: 6, color: 'var(--absent-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {ekleniyorSet === set.id ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Input
                      autoFocus
                      value={yeniAd}
                      onChange={e => setYeniAd(e.target.value)}
                      placeholder="Evrak adı"
                      style={{ flex: '1 1 160px' }}
                      // Escape'in Dialog'a ulaşıp modalı kapatmasını engelle:
                      // burada yalnız satır içi ekleme iptal edilmeli.
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); void ekle(); }
                        if (e.key === 'Escape') { e.stopPropagation(); setEkleniyorSet(null); }
                      }}
                    />
                    <Input
                      value={yeniAciklama}
                      onChange={e => setYeniAciklama(e.target.value)}
                      placeholder="Açıklama (isteğe bağlı)"
                      style={{ flex: '1 1 160px' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); void ekle(); }
                        if (e.key === 'Escape') { e.stopPropagation(); setEkleniyorSet(null); }
                      }}
                    />
                    <Button size="sm" onClick={ekle} disabled={kaydediliyor || !yeniAd.trim()}>Kaydet</Button>
                    <Button size="sm" variant="outline" onClick={() => setEkleniyorSet(null)}>İptal</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" icon="plus" style={{ marginTop: 10 }} onClick={() => ekleAc(set.id)}>
                    Evrak Ekle
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Dialog>

      {silinecek && (
        <Dialog
          title="Evrak Tanımını Kaldır"
          width={420}
          onClose={() => setSilinecek(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setSilinecek(null)}>Vazgeç</Button>
              <Button variant="danger-ghost" icon="trash" onClick={() => kaldir(silinecek)}>Kaldır</Button>
            </>
          }
        >
          <div className="dialog-body">
            <p className="col-2" style={{ margin: 0, fontSize: 13.5, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
              <b>«{silinecek.name}»</b> kaldırılacak. Mevcut süreçlerden silinmez, yalnız bundan
              sonra açılacak süreçlerde görünmez.
            </p>
          </div>
        </Dialog>
      )}
    </>
  );
}
