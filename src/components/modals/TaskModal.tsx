import { useState, useEffect } from 'react';
import type { Task, Profile, TaskPriority, RepeatKind, RepeatUnit, TaskComment, TaskActivity } from '../../types';
import type { TaskForm } from '../../lib/db';
import { fetchComments, fetchActivity, addComment } from '../../lib/db';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Field';
import { Select } from '../ui/Select';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';

const PRIORITIES: TaskPriority[] = ['Yüksek', 'Orta', 'Düşük'];
const REPEAT_OPTS = ['Tekrarlanmaz', 'Her gün', 'Her hafta', 'Her ay', 'Özel'] as const;
type RepeatSel = typeof REPEAT_OPTS[number];
const UNITS: RepeatUnit[] = ['gün', 'hafta', 'ay'];

const SEL_TO_KIND: Record<RepeatSel, RepeatKind> = {
  'Tekrarlanmaz': 'none', 'Her gün': 'daily', 'Her hafta': 'weekly', 'Her ay': 'monthly', 'Özel': 'custom',
};
const KIND_TO_SEL: Record<RepeatKind, RepeatSel> = {
  none: 'Tekrarlanmaz', daily: 'Her gün', weekly: 'Her hafta', monthly: 'Her ay', custom: 'Özel',
};

// Göreli zaman (TR): şimdi / N dk / N sa / N gün önce, sonra tarih.
function relTime(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'şimdi';
  const m = Math.floor(s / 60); if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24); if (d < 30) return `${d} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}

interface TaskFormState {
  title: string;
  priority: TaskPriority;
  due: string;              // YYYY-MM-DD or ''
  repeatSel: RepeatSel;
  customN: string;
  customUnit: RepeatUnit;
  note: string;
  isTeam: boolean;
  assigneeId: string | null;
}

interface TaskModalProps {
  task: Task | null;
  profiles: Profile[];
  currentUserId: string | null;
  onClose: () => void;
  onSave: (form: TaskForm, id: number | null) => void | Promise<void>;
  onArchive: (id: number) => void | Promise<void>;
}

export function TaskModal({ task, profiles, currentUserId, onClose, onSave, onArchive }: TaskModalProps) {
  const editing = !!task;
  const [form, setForm] = useState<TaskFormState>({
    title: task?.title ?? '',
    priority: task?.priority ?? 'Orta',
    due: task?.dueDate ?? '',
    repeatSel: task ? KIND_TO_SEL[task.repeatKind] : 'Tekrarlanmaz',
    customN: task && task.repeatKind === 'custom' ? String(task.repeatN) : '10',
    customUnit: task && task.repeatKind === 'custom' ? task.repeatUnit : 'gün',
    note: task?.note ?? '',
    isTeam: task?.isTeam ?? false,
    assigneeId: task ? task.assigneeId : currentUserId,
  });
  const [error, setError] = useState<string | undefined>();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!task) return;
    let active = true;
    Promise.all([fetchComments(task.id), fetchActivity(task.id)])
      .then(([c, a]) => { if (active) { setComments(c); setActivity(a); } })
      .catch(() => {});
    return () => { active = false; };
  }, [task]);

  const set = <K extends keyof TaskFormState>(k: K, v: TaskFormState[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'title' && error) setError(undefined);
  };

  const nameOf = (id: string | null) => profiles.find(p => p.id === id)?.displayName ?? '';
  const isCustom = form.repeatSel === 'Özel';
  const personName = form.isTeam ? 'Tüm Ekip' : (nameOf(form.assigneeId) || nameOf(currentUserId) || '—');
  const personNote = form.isTeam ? 'Ortak görev — tüm ekip görebilir' : (form.assigneeId === currentUserId ? 'Size atandı' : 'Görev sahibi');
  const canTakeOver = !form.isTeam && form.assigneeId !== currentUserId && !!currentUserId;

  const toggleTeam = () => setForm(f => ({
    ...f,
    isTeam: !f.isTeam,
    assigneeId: !f.isTeam ? f.assigneeId : (f.assigneeId ?? currentUserId), // team→kişi geçişinde atananı geri getir
  }));
  const takeOver = () => setForm(f => ({ ...f, assigneeId: currentUserId, isTeam: false }));

  async function submitComment() {
    const text = newComment.trim();
    if (!text || !task || commenting) return;
    setCommenting(true);
    try {
      await addComment(task.id, currentUserId, text);
      setNewComment('');
      const [c, a] = await Promise.all([fetchComments(task.id), fetchActivity(task.id)]);
      setComments(c); setActivity(a);
    } catch { /* sessizce geç */ }
    finally { setCommenting(false); }
  }

  async function doArchive() {
    if (!task || archiving) return;
    setArchiving(true);
    try { await onArchive(task.id); }
    finally { setArchiving(false); }
  }

  async function handleSave() {
    const title = form.title.trim();
    if (!title) { setError('Görev başlığı zorunludur'); return; }
    if (saving) return;
    const repeatKind = SEL_TO_KIND[form.repeatSel];
    const payload: TaskForm = {
      title,
      note: form.note.trim(),
      priority: form.priority,
      dueDate: form.due.trim() || null,
      isTeam: form.isTeam,
      assigneeId: form.isTeam ? null : (form.assigneeId ?? currentUserId),
      repeatKind,
      repeatN: repeatKind === 'custom' ? Math.max(1, parseInt(form.customN, 10) || 1) : 1,
      repeatUnit: repeatKind === 'custom' ? form.customUnit : 'gün',
    };
    setSaving(true);
    try { await onSave(payload, task?.id ?? null); }
    finally { setSaving(false); }
  }

  return (
    <>
      <Dialog
        title={editing ? 'Görevi Düzenle' : 'Yeni Görev'}
        width={480}
        onClose={onClose}
        footer={
          <>
            {editing && (
              <Button variant="danger-ghost" onClick={() => setConfirmArchive(true)} disabled={saving || archiving} style={{ marginRight: 'auto' }}>
                Görevi Arşivle
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={saving || archiving}>İptal</Button>
            <Button icon="check" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          </>
        }
      >
        <div className="dialog-body">
          <div className="col-2">
            <Field label="Görev Başlığı" error={error}>
              <Input value={form.title} placeholder="Görev başlığı yazın..." onChange={e => set('title', e.target.value)} error={!!error} />
            </Field>
          </div>

          <div className="col-2">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Öncelik">
                <Select value={form.priority} onChange={v => set('priority', v as TaskPriority)} options={PRIORITIES} />
              </Field>
              <Field label="Son Tarih">
                <Input type="date" value={form.due} onChange={e => set('due', e.target.value)} />
              </Field>
              <Field label="Tekrar">
                <Select value={form.repeatSel} onChange={v => set('repeatSel', v as RepeatSel)} options={REPEAT_OPTS as unknown as string[]} />
              </Field>
            </div>
          </div>

          {isCustom && (
            <div className="col-2">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13.5, color: 'var(--muted-foreground)' }}>Her</span>
                <div style={{ width: 90 }}>
                  <Input type="number" min={1} value={form.customN} onChange={e => set('customN', e.target.value)} />
                </div>
                <div style={{ width: 130 }}>
                  <Select value={form.customUnit} onChange={v => set('customUnit', v as RepeatUnit)} options={UNITS} />
                </div>
                <span style={{ fontSize: 13.5, color: 'var(--muted-foreground)' }}>bir kez yeniden açılır</span>
              </div>
            </div>
          )}

          <div className="col-2">
            <Field label="Not">
              <Textarea rows={2} value={form.note} placeholder="Not ekleyin (isteğe bağlı)" onChange={e => set('note', e.target.value)} />
            </Field>
          </div>

          <div className="col-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}>
              {form.isTeam
                ? <span style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--primary-soft)', color: 'var(--primary)', flex: '0 0 auto' }}><Icon name="users" size={16} /></span>
                : <Avatar name={personName} size={34} />}
              <div style={{ flex: '1 1 auto', minWidth: 0, lineHeight: 1.25 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{personName}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)' }}>{personNote}</div>
              </div>
              {canTakeOver && (
                <Button variant="outline" size="sm" onClick={takeOver}>Devral</Button>
              )}
              <button
                onClick={toggleTeam}
                title="Ortak görev — tüm ekip görebilir ve tamamlayabilir"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: 'none', background: 'transparent', cursor: 'pointer', flex: '0 0 auto', padding: 0 }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Ortak Görev</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', width: 34, height: 20, borderRadius: 99, background: form.isTeam ? 'var(--primary)' : 'var(--border-strong)', padding: 2, boxSizing: 'border-box', transition: 'background .15s' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,.25)', transform: form.isTeam ? 'translateX(14px)' : 'translateX(0)', transition: 'transform .15s' }} />
                </span>
              </button>
            </div>
          </div>

          {editing && (
            <div className="col-2">
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Yorumlar</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0', maxHeight: 200, overflowY: 'auto' }}>
                {comments.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>Henüz yorum yok.</span>}
                {comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                    <Avatar name={nameOf(c.authorId) || '?'} size={22} />
                    <div style={{ flex: '1 1 auto', minWidth: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{nameOf(c.authorId) || '—'}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{relTime(c.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--foreground)', margin: '2px 0 0', lineHeight: 1.45, overflowWrap: 'anywhere' }}>{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <Input value={newComment} placeholder="Yorum yazın..." disabled={commenting} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitComment(); } }} />
                </div>
                <Button variant="outline" onClick={submitComment} disabled={commenting}>Ekle</Button>
              </div>
            </div>
          )}

          {editing && (
            <div className="col-2">
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Aktivite</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {activity.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>Henüz aktivite yok.</span>}
                {activity.slice(0, 6).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: 7, fontSize: 12.5, color: 'var(--muted-foreground)' }}>
                    <span style={{ color: 'var(--border-strong)' }}>•</span>
                    <span><b style={{ color: 'var(--foreground)', fontWeight: 600 }}>{nameOf(a.actorId) || '—'}</b> {a.action}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, whiteSpace: 'nowrap' }}>{relTime(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {confirmArchive && (
        <Dialog
          title="Görevi Arşivle"
          width={380}
          onClose={() => setConfirmArchive(false)}
          footer={
            <>
              <Button variant="outline" onClick={() => setConfirmArchive(false)} disabled={archiving}>Hayır</Button>
              <Button variant="danger-ghost" onClick={doArchive} disabled={archiving}>{archiving ? 'Arşivleniyor…' : 'Evet, Arşivle'}</Button>
            </>
          }
        >
          <div className="dialog-body">
            <div className="col-2">
              <p style={{ fontSize: 13.5, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
                Bu görev listeden kaldırılacak. Kayıt arşivde korunur, kalıcı olarak silinmez.
              </p>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
