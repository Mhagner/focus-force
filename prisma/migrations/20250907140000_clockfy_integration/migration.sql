-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "clockfyClientId" TEXT,
ADD COLUMN     "clockfyProjectId" TEXT;

-- AlterTable
ALTER TABLE "public"."FocusSession" ADD COLUMN     "clockfyTimeEntryId" TEXT;

-- CreateTable
CREATE TABLE "public"."ClockfySettings" (
    "id" TEXT NOT NULL,
    "apiKey" TEXT,
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClockfySettings_pkey" PRIMARY KEY ("id")
);

