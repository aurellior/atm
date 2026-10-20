-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "lead_id" BIGINT;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
