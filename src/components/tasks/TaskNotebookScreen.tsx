import { useState, Fragment } from 'react';
import type { Task, Profile, TaskPriority } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { Stat } from '../ui/Stat';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/Field';
import { EmptyState } from '../ui/EmptyState';

// Sprint 2 (GD-2): okuma panosu — istatistik kartları, sekmeler + gruplama, arama,
// kişi filtresi, sayfalama. Ekle/düzenle/arşivle diyaloğu GD-3'te (Sprint 3) gelecek.

interface TaskNotebookScreenProps {
  tasks: Task[];
  profiles: Profile[];
  onToggleDone: (task: Task, done: boolean) => void;
}

type TabId = 'tumu' | 'acik' | 'bugun' | 'gecikmis' | 'hafta' | 'rutinler' | 'tamamlanan';
const PAGE_SIZE = 10;

const PRIO_COLOR: Record<TaskPriority, string> = {
  'Yüksek': 'var(--absent-fg)',
  'Orta':   'var(--primary)',
  'Düşük':  'var(--muted-foreground)',
};

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// Yerel (TR) tarih yardımcıları — UTC kaymasından kaçınmak için parça parça.
function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function ymdOffset(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function fmtDate(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number);
  return `${d} ${TR_MONTHS[m - 1]}`;
}

function dueInfo(due: string | null, done: boolean, today: string): { text: string; color: string; icon: string } {
  if (done)          return { text: 'Tamamlandı', color: 'var(--muted-foreground)', icon: 'check' };
  if (!due)          return { text: '—', color: 'var(--muted-foreground)', icon: 'calendar' };
  if (due < today)   return { text: 'Gecikti · ' + fmtDate(due), color: 'var(--absent-fg)', icon: 'alertCircle' };
  if (due === today) return { text: 'Bugün', color: 'var(--late-fg)', icon: 'clock' };
  return { text: fmtDate(due), color: 'var(--muted-foreground)', icon: 'calendar' };
}

function repeatLabel(t: Task): string | null {
  switch (t.repeatKind) {
    case 'daily':   return 'Günlük';
    case 'weekly':  return 'Haftalık';
    case 'monthly': return 'Aylık';
    case 'custom':  return `Her ${t.repeatN} ${t.repeatUnit}`;
    default:        return null;
  }
}

export function TaskNotebookScreen({ tasks, profiles, onToggleDone }: TaskNotebookScreenProps) {
  const [activeTab, setActiveTab] = useState<TabId>('tumu');
  const [query, setQuery] = useState('');
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const today = todayYmd();
  const tomorrow = ymdOffset(today, 1);
  const nameOf = (id: string | null) => profiles.find(p => p.id === id)?.displayName ?? '';

  const isOverdue = (t: Task) => !t.done && t.dueDate != null && t.dueDate < today;
  const isToday   = (t: Task) => !t.done && t.dueDate === today;

  // Sayaçlar (tüm görevler üzerinden — filtreden bağımsız).
  const cAll     = tasks.length;
  const cOpen    = tasks.filter(t => !t.done).length;
  const cToday   = tasks.filter(isToday).length;
  const cOverdue = tasks.filter(isOverdue).length;
  const cDone    = tasks.filter(t => t.done).length;
  const cRepeat  = tasks.filter(t => t.repeatKind !== 'none').length;

  const setTab = (id: string) => { setActiveTab(id as TabId); setPage(0); };
  const changeQuery = (v: string) => { setQuery(v); setPage(0); };
  const filterByPerson = (id: string) => { setPersonFilter(id); setPage(0); };
  const clearPerson = () => { setPersonFilter(null); setPage(0); };

  // Sekme süzgeci
  let list = tasks.filter(t => {
    switch (activeTab) {
      case 'acik':       return !t.done;
      case 'bugun':      return isToday(t);
      case 'gecikmis':   return isOverdue(t);
      case 'rutinler':   return t.repeatKind !== 'none';
      case 'hafta':      return !t.done;
      case 'tamamlanan': return t.done;
      default:           return true; // tumu
    }
  });
  if (personFilter) list = list.filter(t => t.assigneeId === personFilter);
  const q = query.trim().toLocaleLowerCase('tr');
  if (q) list = list.filter(t => (t.title + ' ' + nameOf(t.assigneeId)).toLocaleLowerCase('tr').includes(q));

  // Sıralama: açık önce (done en sona), gecikmiş → bugün → ileri, sonra tarihe/id'ye göre.
  const rank = (t: Task) => (t.done ? 3 : isOverdue(t) ? 0 : isToday(t) ? 1 : 2);
  list = list.slice().sort((a, b) =>
    rank(a) - rank(b) ||
    (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99') ||
    a.id - b.id,
  );

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedTasks = list.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  // Gruplama: Rutinler → tekrar tipine göre; Bu Hafta → aciliyet kovasına göre.
  interface Group { hasHeader: boolean; label: string; icon: string; tasks: Task[]; }
  let groups: Group[];
  if (activeTab === 'rutinler') {
    const labels: Record<string, string> = { daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', custom: 'Özel' };
    groups = ['daily', 'weekly', 'monthly', 'custom']
      .map(k => ({ hasHeader: true, label: labels[k], icon: '↻', tasks: pagedTasks.filter(t => t.repeatKind === k) }))
      .filter(g => g.tasks.length > 0);
  } else if (activeTab === 'hafta') {
    const labels: Record<string, string> = { overdue: 'Gecikmiş', today: 'Bugün', tomorrow: 'Yarın', later: 'İleri Tarih' };
    const bucket = (t: Task) => isOverdue(t) ? 'overdue' : t.dueDate === today ? 'today' : t.dueDate === tomorrow ? 'tomorrow' : 'later';
    groups = ['overdue', 'today', 'tomorrow', 'later']
      .map(k => ({ hasHeader: true, label: labels[k], icon: '', tasks: pagedTasks.filter(t => bucket(t) === k) }))
      .filter(g => g.tasks.length > 0);
  } else {
    groups = [{ hasHeader: false, label: '', icon: '', tasks: pagedTasks }];
  }

  const tabsData = [
    { id: 'tumu',       label: `Tümü (${cAll})`,          icon: 'inbox' },
    { id: 'acik',       label: `Açık (${cOpen})`,         icon: 'checkSquare' },
    { id: 'bugun',      label: `Bugün (${cToday})`,       icon: 'clock' },
    { id: 'gecikmis',   label: `Gecikmiş (${cOverdue})`,  icon: 'alertCircle' },
    { id: 'hafta',      label: 'Bu Hafta',                icon: 'calendar' },
    { id: 'rutinler',   label: `Rutinler (${cRepeat})`,   icon: 'calendar' },
    { id: 'tamamlanan', label: `Tamamlanan (${cDone})`,   icon: 'check' },
  ];

  const countLabel = `${list.length} görev gösteriliyor · ${cOpen} açık · ${cOverdue} gecikmiş`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Görev Defteri</h1>
          <p className="page-desc">Ekibin ortak görev ve rutin takibi</p>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Açık Görev"   value={cOpen}    icon="checkSquare"  tone="primary" foot="Aktif takipte" />
        <Stat label="Bugün Teslim" value={cToday}   icon="clock"        tone="late"    foot="Son tarih bugün" />
        <Stat label="Gecikmiş"     value={cOverdue} icon="alertCircle"  tone="absent"  foot="Acil aksiyon" />
        <Stat label="Tamamlanan"   value={cDone}    icon="check"        tone="came"    foot="Toplam" />
      </div>

      <div className="card">
        <div className="card-head" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 650, margin: 0 }}>Görev Listesi</h2>
            <p className="page-desc" style={{ fontSize: 13, margin: '3px 0 0' }}>{countLabel}</p>
            {personFilter && (
              <button
                onClick={clearPerson}
                title="Filtreyi kaldır"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 10px',
                  borderRadius: 99, background: 'var(--primary-soft)', border: '1px solid var(--primary)',
                  color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Kişi: {nameOf(personFilter) || '—'} <span style={{ fontSize: 13, lineHeight: 1 }}>✕</span>
              </button>
            )}
          </div>
          <SearchInput value={query} onChange={changeQuery} placeholder="Görev veya kişi ara..." />
        </div>

        <Tabs active={activeTab} onChange={setTab} tabs={tabsData} />

        {list.length === 0 ? (
          <EmptyState
            icon="search"
            title="Görev bulunamadı"
            description="Bu filtreye uygun görev yok. Filtreleri sıfırlayın veya yeni bir görev ekleyin."
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 34 }}></th>
                  <th>Görev</th>
                  <th style={{ width: 160 }}>Son Tarih</th>
                  <th style={{ width: 120 }}>Tekrar</th>
                  <th style={{ width: 116 }}>Öncelik</th>
                  <th style={{ width: 56 }}>Atanan</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, gi) => (
                  <Fragment key={gi}>
                    {g.hasHeader && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--surface-2)', padding: '8px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--foreground)' }}>
                            {g.icon && <span style={{ marginRight: 6, color: 'var(--muted-foreground)' }}>{g.icon}</span>}
                            {g.label}
                          </span>
                          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>{g.tasks.length} görev</span>
                        </td>
                      </tr>
                    )}
                    {g.tasks.map(t => {
                      const due = dueInfo(t.dueDate, t.done, today);
                      const rep = repeatLabel(t);
                      const assignee = nameOf(t.assigneeId);
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
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: due.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
                              <Icon name={due.icon} size={14} />{due.text}
                            </span>
                          </td>
                          <td>
                            {rep
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: t.done ? 'var(--muted-foreground)' : 'var(--foreground)', whiteSpace: 'nowrap' }}><span>↻</span>{rep}</span>
                              : <span style={{ color: 'var(--border-strong)' }}>—</span>}
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600, color: t.done ? 'var(--muted-foreground)' : PRIO_COLOR[t.priority] }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.done ? 'var(--border-strong)' : PRIO_COLOR[t.priority] }} />
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
                              <button
                                onClick={() => t.assigneeId && filterByPerson(t.assigneeId)}
                                title={assignee ? `${assignee} — görevlerini göster` : 'Atanmamış'}
                                style={{ border: 'none', background: 'transparent', padding: 0, cursor: t.assigneeId ? 'pointer' : 'default' }}
                              >
                                <Avatar name={assignee || '?'} size={28} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>Sayfa {currentPage + 1} / {pageCount}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Önceki</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(p => p + 1)}>Sonraki</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
