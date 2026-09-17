import { Icon } from './Icon';

interface ShiftLoadingProps {
  /** Ne yüklendiğini söyleyen kısa etiket, ör. "Temmuz 2026". */
  label?: string;
}

// Vardiyalar ay ay çekildiği için henüz gelmemiş bir ay, boş çizelgeyle
// karıştırılmamalı. Bu blok "veri yok" ile "veri gelmedi"yi ayırır.
export function ShiftLoading({ label }: ShiftLoadingProps) {
  return (
    <div className="empty-state" style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
      <div className="empty-ico">
        <Icon name="calendar" size={28} />
      </div>
      <h3 className="empty-title">Vardiyalar yükleniyor…</h3>
      {label && <p className="empty-desc">{label}</p>}
    </div>
  );
}
