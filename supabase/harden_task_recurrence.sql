-- ============================================================
-- Görev Defteri — Tekrar duplicate guard (Sprint 4.5 / H3)
-- Idempotent. create_task_notebook.sql'den SONRA çalıştırın.
-- ============================================================

-- Aynı seri (series_id) + son tarih (due_date) için birden fazla AÇIK (done=false),
-- arşivsiz tekrar örneği oluşmasını engeller. Spawn-next iki kez tetiklenirse
-- (eşzamanlı tamamlama) 2. insert 23505 ile reddedilir; uygulama bunu yutar.
-- series_id null olan ilk/seed örnekler kapsam dışıdır.
create unique index if not exists tasks_series_open_unique
  on tasks (series_id, due_date)
  where series_id is not null and archived_at is null and done = false;
