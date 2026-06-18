// Recharts tabanlı bar chart.
import {
  ResponsiveContainer, BarChart as RBarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, LabelList,
} from 'recharts';
import { chartTooltipProps, AXIS_COLOR, GRID_COLOR } from './chartTheme';

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

export function BarChart({ data, height = 220, valueFormat = n => String(n) }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 22, right: 16, bottom: 4, left: 8 }}>
        <XAxis
          dataKey="label" tickMargin={8}
          tick={{ fill: AXIS_COLOR, fontSize: 11 }} stroke={GRID_COLOR}
        />
        <YAxis hide />
        <Tooltip {...chartTooltipProps} formatter={(v) => valueFormat(Number(v))} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={64} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? 'var(--primary)'} />
          ))}
          <LabelList
            dataKey="value" position="top"
            formatter={(v) => valueFormat(Number(v))}
            style={{ fill: AXIS_COLOR, fontSize: 11 }}
          />
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
