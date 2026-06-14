import type { ShiftCodeKey } from '../../types';
import { SHIFT_CODES } from '../../constants';

interface CodeLegendProps {
  codes?: ShiftCodeKey[];
}

export function CodeLegend({ codes = ['S', 'Ö', 'G', 'İ', 'Yİ'] }: CodeLegendProps) {
  return (
    <div className="code-legend">
      {codes.map(c => {
        const sc = SHIFT_CODES[c];
        return (
          <span className="cl" key={c}>
            <span className={`sc-pill ${sc.cls}`}>{c}</span>
            {sc.label}
            {sc.work && sc.start && sc.end && (
              <span className="tm" style={{ color: 'var(--subtle-foreground)' }}>
                {sc.start}–{sc.end}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
