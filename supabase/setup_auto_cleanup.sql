-- ============================================================
-- AUTO-DELETE OLD CONVERSATIONS + MESSAGES (pg_cron)
-- ============================================================
-- 1. Buka Supabase Dashboard → Database → Extensions
--    Cari "pg_cron" → Enable
--
-- 2. Jika ada cron lama, hapus dulu:
--    select cron.unschedule('cleanup-old-messages');
--
-- 3. Jalankan SQL ini di Supabase SQL Editor:

select cron.schedule(
  'cleanup-old-conversations',
  '0 * * * *',   -- setiap jam tepat
  $$
  delete from conversations
  where
    -- Punya pesan, tapi semua sudah >24 jam → hapus (messages ikut cascade)
    id in (
      select conversation_id from messages
      group by conversation_id
      having max(created_at) < now() - interval '24 hours'
    )
    or
    -- Tidak punya pesan sama sekali dan conversation sudah >24 jam
    -- (Say Hi yang tidak dibalas lebih dari 24 jam)
    (
      id not in (select distinct conversation_id from messages)
      and created_at < now() - interval '24 hours'
    )
  $$
);

-- Untuk cek jadwal yang aktif:
-- select * from cron.job;

-- Untuk hapus jadwal:
-- select cron.unschedule('cleanup-old-conversations');
