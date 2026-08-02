-- ============================================================
-- apply_schedule_import RPC
-- Excel çizelge import'unu tek transaction'da uygular.
--
-- Önceki hâlde her aksiyon ayrı bir istekti (500 kayıtlık bir ay ~500 istek):
-- yavaş olmasının yanında yarıda kesilebiliyordu — kullanıcı pencereyi
-- kapatsa ya da bağlantı düşse ay yarı yazılmış hâlde kalıyordu.
--
-- Burada silme + yazma tek çağrıda ve tek transaction'da yapılır: ya tamamı
-- uygulanır ya hiçbiri. Kesinti hâlinde ay import öncesi hâlinde kalır.
--
-- payload = {
--   "delete_ids": [12, 13, ...],          -- silinecek mevcut vardiya id'leri
--   "rows": [                              -- oluşturulacak/güncellenecek satırlar
--     { "emp_id":1, "shift_date":"2026-08-01", "code":"S", "start_time":"08:00",
--       "end_time":"16:00", "role":"Pompacı", "station":"Ümraniye",
--       "dept":"Akaryakıt", "status":"Planlandı", "note":"" }, ...
--   ]
-- }
--
-- rows içindeki her satır (emp_id, shift_date) çiftine göre yazılır. Bu çift
-- üzerinde kısmi bir unique indeks var (shifts_emp_id_shift_date_unique,
-- WHERE shift_date IS NOT NULL AND shift_date <> ''); ON CONFLICT bu kısmi
-- indeksi çıkaramadığı için upsert yerine "önce çakışanları sil, sonra ekle"
-- yolu izleniyor — aynı transaction içinde olduğu için atomikliği bozmaz.
-- ============================================================

create or replace function apply_schedule_import(payload jsonb)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_delete_ids bigint[] := coalesce(
    (select array_agg((value)::text::bigint) from jsonb_array_elements(coalesce(payload->'delete_ids', '[]'::jsonb))),
    '{}'::bigint[]
  );
  v_rows jsonb := coalesce(payload->'rows', '[]'::jsonb);
  v_deleted integer := 0;
  v_replaced integer := 0;
  v_written integer := 0;
begin
  -- 1. Excel'de karşılığı kalmayan vardiyalar
  if array_length(v_delete_ids, 1) is not null then
    delete from shifts where id = any(v_delete_ids);
    get diagnostics v_deleted = row_count;
  end if;

  if jsonb_array_length(v_rows) = 0 then
    return jsonb_build_object('deleted', v_deleted, 'replaced', 0, 'written', 0);
  end if;

  -- 2. Yazılacak (emp_id, shift_date) çiftlerinin mevcut kayıtlarını temizle.
  --    Kaç tanesinin güncelleme kaç tanesinin yeni kayıt olduğunu buradan sayıyoruz.
  with incoming as (
    select (r->>'emp_id')::bigint as emp_id, r->>'shift_date' as shift_date
    from jsonb_array_elements(v_rows) r
  ),
  removed as (
    delete from shifts s
    using incoming i
    where s.emp_id = i.emp_id and s.shift_date = i.shift_date
    returning 1
  )
  select count(*) into v_replaced from removed;

  -- 3. Yeni satırlar
  insert into shifts (emp_id, day_index, shift_date, code, start_time, end_time, role, station, dept, status, note)
  select
    (r->>'emp_id')::bigint,
    -- Pazartesi = 0 … Pazar = 6 (uygulamadaki dayIndex ile aynı)
    (extract(isodow from (r->>'shift_date')::date)::integer - 1),
    r->>'shift_date',
    r->>'code',
    coalesce(r->>'start_time', ''),
    coalesce(r->>'end_time', ''),
    r->>'role',
    r->>'station',
    r->>'dept',
    coalesce(r->>'status', 'Planlandı'),
    coalesce(r->>'note', '')
  from jsonb_array_elements(v_rows) r;
  get diagnostics v_written = row_count;

  return jsonb_build_object('deleted', v_deleted, 'replaced', v_replaced, 'written', v_written);
end $$;

revoke all on function apply_schedule_import(jsonb) from public;
grant execute on function apply_schedule_import(jsonb) to authenticated;
