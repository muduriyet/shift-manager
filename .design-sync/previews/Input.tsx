import { Input } from 'shift-manager';

export function Varsayilan() {
  return <div style={{ maxWidth: 320 }}><Input placeholder="Personel ara..." /></div>;
}

export function Doldurulmus() {
  return <div style={{ maxWidth: 320 }}><Input defaultValue="Ümraniye İstasyonu" /></div>;
}

export function Hatali() {
  return <div style={{ maxWidth: 320 }}><Input error defaultValue="" placeholder="Zorunlu alan" /></div>;
}
