import { SearchInput } from 'shift-manager';

export function Bos() {
  return <div style={{ maxWidth: 320 }}><SearchInput value="" onChange={() => {}} placeholder="Personel ara..." /></div>;
}

export function Yazili() {
  return <div style={{ maxWidth: 320 }}><SearchInput value="Ahmet" onChange={() => {}} placeholder="Personel ara..." /></div>;
}
