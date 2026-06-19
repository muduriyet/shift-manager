import { Field, Input, Textarea } from 'shift-manager';

export function Etiketli() {
  return (
    <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Ad Soyad">
        <Input defaultValue="Ahmet Yılmaz" />
      </Field>
      <Field label="Görev">
        <Input placeholder="Örn. Pompacı" />
      </Field>
    </div>
  );
}

export function Hatali() {
  return (
    <div style={{ maxWidth: 320 }}>
      <Field label="İşe Giriş Tarihi" error="Tarih zorunludur">
        <Input error placeholder="GG.AA.YYYY" />
      </Field>
    </div>
  );
}

export function NotAlani() {
  return (
    <div style={{ maxWidth: 320 }}>
      <Field label="Açıklama">
        <Textarea placeholder="Vardiya ile ilgili not..." rows={3} />
      </Field>
    </div>
  );
}
