-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "estimatedDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "salesforceOppUrl" TEXT,
ADD COLUMN     "sharepointRepoUrl" TEXT;
