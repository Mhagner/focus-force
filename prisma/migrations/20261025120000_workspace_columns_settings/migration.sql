-- DropIndex
DROP INDEX "public"."PomodoroSettings_userId_key";

-- AlterTable
ALTER TABLE "public"."Workspace" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "columnId" TEXT;

-- AlterTable
ALTER TABLE "public"."SessionDescriptionPreset" ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."PomodoroSettings" ADD COLUMN     "workspaceId" TEXT;

-- CreateTable
CREATE TABLE "public"."BoardColumn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardColumn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardColumn_workspaceId_position_idx" ON "public"."BoardColumn"("workspaceId", "position");

-- CreateIndex
CREATE INDEX "BoardColumn_userId_idx" ON "public"."BoardColumn"("userId");

-- CreateIndex
CREATE INDEX "Task_columnId_idx" ON "public"."Task"("columnId");

-- CreateIndex
CREATE INDEX "SessionDescriptionPreset_workspaceId_order_idx" ON "public"."SessionDescriptionPreset"("workspaceId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PomodoroSettings_workspaceId_key" ON "public"."PomodoroSettings"("workspaceId");

-- CreateIndex
CREATE INDEX "PomodoroSettings_userId_idx" ON "public"."PomodoroSettings"("userId");

-- AddForeignKey
ALTER TABLE "public"."BoardColumn" ADD CONSTRAINT "BoardColumn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BoardColumn" ADD CONSTRAINT "BoardColumn_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "public"."BoardColumn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SessionDescriptionPreset" ADD CONSTRAINT "SessionDescriptionPreset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PomodoroSettings" ADD CONSTRAINT "PomodoroSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Garante no banco que cada workspace tem no máximo UMA coluna de conclusão.
CREATE UNIQUE INDEX "BoardColumn_workspaceId_isDone_key" ON "BoardColumn"("workspaceId") WHERE "isDone" = true;
