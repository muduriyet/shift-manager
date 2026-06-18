// Recharts tabanlı line chart. Tek veya çok serili.
import {
  ResponsiveContainer, LineChart as RLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { chartTooltipProps, AXIS_COLOR, GRID_COLOR } from './chartTheme';

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

export function LineChart({ labels, series, height = 220, yFormat = n => String(n) }: LineChartProps) {
  // labels + series → Recharts'ın beklediği satır-bazlı veri ([{ label, <seri>: değer }]).
  const data = labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    for (const s of series) row[s.name] = s.values[i] ?? 0;
    return row;
  });
  const showLegend = series.length > 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="label" interval="preserveStartEnd" minTickGap={24} tickMargin={8}
          tick={{ fill: AXIS_COLOR, fontSize: 11 }} stroke={GRID_COLOR}
        />
        <YAxis
          width={52} tickFormatter={yFormat}
          tick={{ fill: AXIS_COLOR, fontSize: 11 }} stroke={GRID_COLOR}
        />
        <Tooltip {...chartTooltipProps} formatter={(v) => yFormat(Number(v))} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12.5 }} />}
        {series.map(s => (
          <Line
            key={s.name} type="monotone" dataKey={s.name} name={s.name}
            stroke={s.color} strokeWidth={2}
            dot={{ r: 2, fill: s.color, strokeWidth: 0 }} activeDot={{ r: 4 }}
          />
        ))}
      </RLineChart>
    </ResponsiveContainer>
  );
}
