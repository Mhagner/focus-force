-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "estimatedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "repoUrl" TEXT,
ADD COLUMN     "salesforceOppUrl" TEXT;
