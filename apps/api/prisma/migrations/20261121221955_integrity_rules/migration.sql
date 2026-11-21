-- Integrity rules that the Prisma schema language cannot express.
-- The database enforces them even if application code has a bug or two
-- requests race each other.

-- btree_gist lets one GiST index combine "=" on uuid with "&&" on ranges.
-- Supabase keeps extensions in the "extensions" schema; create it locally too.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ---------- Double-booking protection ----------

-- Every reservation of a hall or a trainer writes a row here. Two rows for
-- the same hall (or trainer) with overlapping time ranges are rejected.
-- '[)' makes ranges half-open, so 10:00-11:00 and 11:00-12:00 do not clash.
ALTER TABLE occupancies
  ADD CONSTRAINT occupancies_time_order CHECK (starts_at < ends_at),
  ADD CONSTRAINT occupancies_has_resource CHECK (hall_id IS NOT NULL OR trainer_id IS NOT NULL),
  ADD CONSTRAINT occupancies_single_owner CHECK (num_nonnulls(booking_id, group_session_id) = 1),
  ADD CONSTRAINT occupancies_no_hall_overlap EXCLUDE USING gist (
    hall_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (hall_id IS NOT NULL),
  ADD CONSTRAINT occupancies_no_trainer_overlap EXCLUDE USING gist (
    trainer_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (trainer_id IS NOT NULL);

-- A group session never has more bookings than places.
ALTER TABLE group_sessions
  ADD CONSTRAINT group_sessions_time_order CHECK (starts_at < ends_at),
  ADD CONSTRAINT group_sessions_seats CHECK (capacity > 0 AND booked_count BETWEEN 0 AND capacity);

-- A user holds at most one active seat in a group session.
CREATE UNIQUE INDEX bookings_one_active_seat_per_user
  ON bookings (user_id, group_session_id)
  WHERE group_session_id IS NOT NULL AND status IN ('PENDING', 'CONFIRMED');

-- ---------- Consistency checks ----------

ALTER TABLE bookings
  ADD CONSTRAINT bookings_time_order CHECK (starts_at < ends_at),
  ADD CONSTRAINT bookings_amounts CHECK (
    base_price >= 0 AND discount >= 0 AND points_redeemed >= 0
    AND final_price >= 0 AND points_earned >= 0
  ),
  ADD CONSTRAINT bookings_target_matches_type CHECK (
    (type = 'HALL_RENTAL' AND hall_id IS NOT NULL AND group_session_id IS NULL AND trainer_id IS NULL)
    OR (type = 'GROUP_SESSION' AND group_session_id IS NOT NULL)
    OR (type = 'PERSONAL_TRAINING' AND trainer_id IS NOT NULL AND group_session_id IS NULL)
  );

ALTER TABLE payments
  ADD CONSTRAINT payments_amount CHECK (amount >= 0),
  ADD CONSTRAINT payments_single_purpose CHECK (num_nonnulls(booking_id, membership_id) = 1);

ALTER TABLE users
  ADD CONSTRAINT users_bonus_balance CHECK (bonus_balance >= 0);

ALTER TABLE sport_centers
  ADD CONSTRAINT sport_centers_hours CHECK (open_hour >= 0 AND close_hour <= 24 AND open_hour < close_hour),
  ADD CONSTRAINT sport_centers_coordinates CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180);

ALTER TABLE halls
  ADD CONSTRAINT halls_values CHECK (capacity > 0 AND hourly_price >= 0);

ALTER TABLE trainers
  ADD CONSTRAINT trainers_values CHECK (experience_years >= 0 AND session_price >= 0);

ALTER TABLE sections
  ADD CONSTRAINT sections_values CHECK (capacity > 0 AND session_price >= 0);

ALTER TABLE membership_plans
  ADD CONSTRAINT membership_plans_values CHECK (
    price >= 0
    AND (duration_days IS NULL OR duration_days > 0)
    AND (visits IS NULL OR visits > 0)
  );

ALTER TABLE memberships
  ADD CONSTRAINT memberships_visits_left CHECK (visits_left IS NULL OR visits_left >= 0);

ALTER TABLE promotions
  ADD CONSTRAINT promotions_values CHECK (discount_percent BETWEEN 1 AND 90 AND starts_at < ends_at);

-- ---------- Supabase Data API ----------

-- Supabase publishes the public schema through its REST API to anyone who
-- holds the publishable key. Our clients go through the NestJS API instead,
-- so enable row level security without policies: the anon and authenticated
-- roles see nothing, and the table owner used by the API is not affected.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
