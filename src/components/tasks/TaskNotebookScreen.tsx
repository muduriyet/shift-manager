import type { Task, Profile, TaskPriority } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { EmptyState } from '../ui/EmptyState';

// Sprint 1 (GD-1): temel iskelet — görevleri listeler ve tamamlandı işaretlemeyi
// (tekrar üretimi dahil) uçtan uca doğrular. İstatistik kartları, sekmeler, arama,
// filtre ve ekle/düzenle diyaloğu sonraki sprintlerde (GD-2/GD-3) eklenecek.

interface TaskNotebookScreenProps {
  tasks: Task[];
  profiles: Profile[];
  onToggleDone: (task: Task, done: boolean) => void;
}

const PRIO_COLOR: Record<TaskPriority, string> = {
  'Yüksek': 'var(--absent-fg)',
  'Orta':   'var(--primary)',
  'Düşük':  'var(--muted-foreground)',
};

// Yerel (TR) bugün — YYYY-MM-DD. UTC'den kaçınmak için parça parça biçimlenir.
function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dueInfo(due: string | null, done: boolean): { text: string; color: string } {
  if (done) return { text: 'Tamamlandı', color: 'var(--muted-foreground)' };
  if (!due)  return { text: '—', color: 'var(--muted-foreground)' };
  const today = todayYmd();
  if (due < today)   return { text: 'Gecikti · ' + due, color: 'var(--absent-fg)' };
  if (due === today) return { text: 'Bugün', color: 'var(--late-fg)' };
  return { text: due, color: 'var(--muted-foreground)' };
}

export function TaskNotebookScreen({ tasks, profiles, onToggleDone }: TaskNotebookScreenProps) {
  const nameOf = (id: string | null) => profiles.find(p => p.id === id)?.displayName ?? '';

  // done en sona, sonra son tarihe göre (tarihsiz en sona).
  const rows = tasks.slice().sort((a, b) =>
    Number(a.done) - Number(b.done) ||
    (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99') ||
    a.id - b.id,
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Görev Defteri</h1>
          <p className="page-desc">Ekibin ortak görev ve rutin takibi</p>
        </div>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <EmptyState icon="checkSquare" title="Henüz görev yok" description="Bu ekranın görevleri yakında eklenecek." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 34 }}></th>
                  <th>Görev</th>
                  <th style={{ width: 150 }}>Son Tarih</th>
                  <th style={{ width: 80 }}>Tekrar</th>
                  <th style={{ width: 110 }}>Öncelik</th>
                  <th style={{ width: 56 }}>Atanan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => {
                  const due = dueInfo(t.dueDate, t.done);
                  return (
                    <tr key={t.id}>
                      <td>
                        <button
                          aria-pressed={t.done}
                          onClick={() => onToggleDone(t, !t.done)}
                          title={t.done ? 'Tamamlandı' : 'Tamamlandı olarak işaretle'}
                          style={{
                            width: 22, height: 22, borderRadius: 6, padding: 0, cursor: 'pointer',
                            display: 'grid', placeItems: 'center', color: '#fff',
                            border: `1.5px solid ${t.done ? 'var(--primary)' : 'var(--border-strong)'}`,
                            background: t.done ? 'var(--primary)' : 'var(--surface)',
                          }}
                        >
                          {t.done ? <Icon name="check" size={13} /> : null}
                        </button>
                      </td>
                      <td>
                        <b style={{
                          fontWeight: 600,
                          color: t.done ? 'var(--muted-foreground)' : 'var(--foreground)',
                          textDecoration: t.done ? 'line-through' : 'none',
                        }}>{t.title}</b>
                      </td>
                      <td><span style={{ color: due.color, fontWeight: 500, whiteSpace: 'nowrap' }}>{due.text}</span></td>
                      <td>
                        {t.repeatKind !== 'none'
                          ? <span style={{ color: 'var(--muted-foreground)' }}>↻</span>
                          : <span style={{ color: 'var(--border-strong)' }}>—</span>}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600, color: PRIO_COLOR[t.priority] }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIO_COLOR[t.priority] }} />
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        {t.isTeam ? (
                          <span title="Ortak görev — tüm ekip" style={{
                            width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center',
                            background: 'var(--primary-soft)', color: 'var(--primary)',
                          }}><Icon name="users" size={14} /></span>
                        ) : (
                          <Avatar name={nameOf(t.assigneeId) || '?'} size={28} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
