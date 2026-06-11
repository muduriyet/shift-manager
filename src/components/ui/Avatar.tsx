const COLORS = ['#1e3a8a','#0f766e','#7c3aed','#b45309','#be185d','#0369a1','#4d7c0f','#9f1239'];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 34 }: AvatarProps) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toLocaleUpperCase('tr');
  const bg = COLORS[hashName(name) % COLORS.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
