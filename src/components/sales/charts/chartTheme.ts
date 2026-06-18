// Recharts grafiklerinde paylaşılan tema sabitleri (CSS değişkenleriyle uyumlu).

export const AXIS_COLOR = 'var(--muted-foreground)';
export const GRID_COLOR = 'var(--border)';

// Tooltip görünümü — kart yüzeyiyle aynı (var(--surface)).
export const chartTooltipProps = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12.5,
    boxShadow: '0 4px 12px rgba(15,23,42,.08)',
  },
  labelStyle: { color: 'var(--muted-foreground)', marginBottom: 4 },
  itemStyle: { color: 'var(--foreground)', padding: 0 },
  cursor: { fill: 'var(--muted)', opacity: 0.5 },
} as const;
