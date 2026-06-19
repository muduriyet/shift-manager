import { Textarea } from 'shift-manager';

export function Varsayilan() {
  return <div style={{ maxWidth: 360 }}><Textarea placeholder="Açıklama girin..." rows={4} /></div>;
}

export function Doldurulmus() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Textarea rows={4} defaultValue={'Gece vardiyası için ek personel gerekiyor.\nMarket reyonu hafta sonu yoğun.'} />
    </div>
  );
}
