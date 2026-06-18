// Native SVG line chart (bağımlılıksız). Tek veya çok serili.

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  labels: string[];
  series: LineSeries[];
  height?: number;
  yFormat?: (n: number) => string;
}

const W = 640;

export function LineChart({ labels, series, height = 220, yFormat = n => String(n) }: LineChartProps) {
  const H = height;
  const padL = 60, padR = 16, padT = 14, padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = labels.length;
  const maxV = Math.max(1, ...series.flatMap(s => s.values));
  const ticks = 4;

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (v: number) => padT + innerH - (v / maxV) * innerH;

  const showLegend = series.length > 1;
  const labelStep = Math.max(1, Math.ceil(n / 12)); // çok nokta varsa x etiketlerini seyrelt

  return (
    <div>
      {showLegend && (
        <div className="chart-legend">
          {series.map(s => (
            <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" className="chart" role="img">
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const gy = padT + (innerH * i) / ticks;
          const v = maxV * (1 - i / ticks);
          return (
            <g key={i}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} className="chart-grid" />
              <text x={padL - 8} y={gy + 4} textAnchor="end" className="chart-axis">{yFormat(v)}</text>
            </g>
          );
        })}
        {labels.map((lb, i) => (i % labelStep === 0 || i === n - 1) ? (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" className="chart-axis">{lb}</text>
        ) : null)}
        {series.map(s => (
          <g key={s.name}>
            {n > 1 && (
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              />
            )}
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
