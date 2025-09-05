/*
  Warnings:

  - You are about to alter the column `hourlyRate` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "public"."Project" ALTER COLUMN "hourlyRate" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."Task" ALTER COLUMN "priority" SET DEFAULT 'media',
ALTER COLUMN "status" SET DEFAULT 'todo';
