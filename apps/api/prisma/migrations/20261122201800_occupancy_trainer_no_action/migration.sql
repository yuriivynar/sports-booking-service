-- DropForeignKey
ALTER TABLE "occupancies" DROP CONSTRAINT "occupancies_trainer_id_fkey";

-- AddForeignKey
ALTER TABLE "occupancies" ADD CONSTRAINT "occupancies_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
