-- Mevcut Supabase projesinde personel bilgi alanlarını ekler.
-- Yeni/sıfır kurulumlar için supabase/schema.sql zaten bu kolonları içerir.

alter table employees
  add column if not exists shift_name text not null default '',
  add column if not exists schedule_name text not null default '';
