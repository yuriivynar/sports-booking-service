-- Explicit delete rules.
-- Deleting a hall also deletes its group sessions. Bookings keep their hall,
-- session and trainer (RESTRICT): catalog rows with booking history cannot be
-- deleted, so the admin deactivates them instead (is_active = false).

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_group_session_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_hall_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_trainer_id_fkey";

-- DropForeignKey
ALTER TABLE "group_sessions" DROP CONSTRAINT "group_sessions_hall_id_fkey";

-- AddForeignKey
ALTER TABLE "group_sessions" ADD CONSTRAINT "group_sessions_hall_id_fkey" FOREIGN KEY ("hall_id") REFERENCES "halls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hall_id_fkey" FOREIGN KEY ("hall_id") REFERENCES "halls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_group_session_id_fkey" FOREIGN KEY ("group_session_id") REFERENCES "group_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
