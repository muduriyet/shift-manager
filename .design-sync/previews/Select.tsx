import { Select } from 'shift-manager';

// The dropdown menu is internal open-state; the card shows the styled trigger
// with the current value (the resting render). Opening is interaction-only.
export function Istasyon() {
  return (
    <div style={{ maxWidth: 280 }}>
      <Select value="Ümraniye" onChange={() => {}} options={['Ümraniye', 'Şile']} icon="building" />
    </div>
  );
}

export function Departman() {
  return (
    <div style={{ maxWidth: 280 }}>
      <Select value="Akaryakıt" onChange={() => {}} options={['Akaryakıt', 'Market']} icon="layers" />
    </div>
  );
}

export function Kucuk() {
  return (
    <div style={{ maxWidth: 220 }}>
      <Select
        small
        value="S"
        onChange={() => {}}
        options={[
          { value: 'S', label: 'S — Sabah' },
          { value: 'Ö', label: 'Ö — Öğlen' },
          { value: 'G', label: 'G — Gece' },
        ]}
      />
    </div>
  );
}
