-- ============================================================
-- AUTO-DELETE OLD MESSAGES (pg_cron)
-- ============================================================
-- 1. Buka Supabase Dashboard → Database → Extensions
--    Cari "pg_cron" → Enable
--
-- 2. Jalankan SQL ini di Supabase SQL Editor:

select cron.schedule(
  'cleanup-old-messages',
  '0 * * * *',   -- setiap jam tepat
  $$delete from messages where created_at < now() - interval '24 hours'$$
);

-- Untuk cek jadwal yang terdaftar:
-- select * from cron.job;

-- Untuk hapus jadwal (jika ingin ganti interval):
-- select cron.unschedule('cleanup-old-messages');
