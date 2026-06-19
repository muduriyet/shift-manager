import { Dialog, Button, Field, Input } from 'shift-manager';

// The card harness wraps single-mode previews in a translateZ(0) element, which
// makes the Dialog's position:fixed .overlay size to that box instead of the
// viewport (then overflow-y:auto clips it). Wrapping in our own transformed,
// fixed-height container gives the overlay a real containing block so the whole
// modal — backdrop, body, footer — renders in the card. The component is
// unchanged; this is preview framing only.
export function VardiyaDuzenle() {
  return (
    <div style={{ position: 'relative', transform: 'translateZ(0)', height: 440, width: '100%' }}>
      <Dialog
        title="Vardiya Düzenle"
        desc="Ahmet Yılmaz · 19 Haziran Perşembe"
        width={460}
        onClose={() => {}}
        footer={
          <>
            <Button variant="ghost" onClick={() => {}}>İptal</Button>
            <Button variant="primary" icon="check" onClick={() => {}}>Kaydet</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '12px 24px 4px' }}>
          <Field label="Vardiya Kodu">
            <Input defaultValue="S — Sabah (08:00–16:00)" />
          </Field>
          <Field label="Not">
            <Input placeholder="İsteğe bağlı not" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
