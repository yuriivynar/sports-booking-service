-- Supabase Cron: calls the API maintenance job every 15 minutes
-- (reminders 24 h and 2 h before, released holds, completed bookings and
-- their points, expired memberships).
--
-- Run once in Supabase Dashboard -> SQL Editor. Enable the pg_cron and
-- pg_net extensions first (Database -> Extensions).
--
-- The secret is NOT stored in this file. Put the same value as the API's
-- CRON_SECRET into Vault (Dashboard -> Project Settings -> Vault -> Add new
-- secret, name: cron_secret), or run in the SQL Editor:
--   select vault.create_secret('<the CRON_SECRET value>', 'cron_secret');

select cron.schedule(
  'sporthub-maintenance',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://sports-booking-service-api.vercel.app/api/jobs/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Check the runs:
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select id, status_code, content from net._http_response order by created desc limit 5;
-- Remove the job:
--   select cron.unschedule('sporthub-maintenance');
