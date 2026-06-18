// Native SVG bar chart (bağımlılıksız).

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  valueFormat?: (n: number) => string;
}

const W = 640;

export function BarChart({ data, height = 220, valueFormat = n => String(n) }: BarChartProps) {
  const H = height;
  const padL = 16, padR = 16, padT = 18, padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = Math.max(1, data.length);
  const maxV = Math.max(1, ...data.map(d => d.value));
  const slot = innerW / n;
  const bw = Math.min(64, slot * 0.6);

  const cx = (i: number) => padL + slot * (i + 0.5);
  const barH = (v: number) => (v / maxV) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" className="chart" role="img">
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} className="chart-grid" />
      {data.map((d, i) => {
        const h = barH(d.value);
        const yTop = padT + innerH - h;
        return (
          <g key={d.label}>
            <rect
              x={cx(i) - bw / 2}
              y={yTop}
              width={bw}
              height={h}
              rx={3}
              fill={d.color ?? 'var(--primary)'}
            />
            <text x={cx(i)} y={yTop - 5} textAnchor="middle" className="chart-axis">{valueFormat(d.value)}</text>
            <text x={cx(i)} y={H - 12} textAnchor="middle" className="chart-axis">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
