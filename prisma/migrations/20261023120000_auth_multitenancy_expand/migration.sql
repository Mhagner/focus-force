-- CreateEnum
CREATE TYPE "public"."WorkspaceMode" AS ENUM ('WORK', 'STUDY');

-- CreateEnum
CREATE TYPE "public"."AuthTokenType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "userId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."TaskComment" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."TaskSubtask" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."FocusSession" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."SessionDescriptionPreset" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."DailyPlan" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."DailyPlanBlock" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."PomodoroSettings" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."ClockfySettings" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "public"."TaskBoardSettings" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."AuthTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ip" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "public"."WorkspaceMode" NOT NULL DEFAULT 'WORK',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "limits" JSONB NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "provider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "public"."AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "public"."AuthToken"("userId", "type");

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "public"."RateLimit"("resetAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "public"."AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Workspace_userId_idx" ON "public"."Workspace"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "public"."Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "public"."Subscription"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "public"."Project"("userId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_idx" ON "public"."Project"("workspaceId");

-- CreateIndex
CREATE INDEX "Task_userId_projectId_idx" ON "public"."Task"("userId", "projectId");

-- CreateIndex
CREATE INDEX "TaskComment_userId_idx" ON "public"."TaskComment"("userId");

-- CreateIndex
CREATE INDEX "TaskSubtask_userId_idx" ON "public"."TaskSubtask"("userId");

-- CreateIndex
CREATE INDEX "FocusSession_userId_start_idx" ON "public"."FocusSession"("userId", "start");

-- CreateIndex
CREATE INDEX "SessionDescriptionPreset_userId_idx" ON "public"."SessionDescriptionPreset"("userId");

-- CreateIndex
CREATE INDEX "DailyPlan_userId_date_idx" ON "public"."DailyPlan"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyPlanBlock_userId_idx" ON "public"."DailyPlanBlock"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PomodoroSettings_userId_key" ON "public"."PomodoroSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClockfySettings_userId_key" ON "public"."ClockfySettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskBoardSettings_userId_key" ON "public"."TaskBoardSettings"("userId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskSubtask" ADD CONSTRAINT "TaskSubtask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SessionDescriptionPreset" ADD CONSTRAINT "SessionDescriptionPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyPlan" ADD CONSTRAINT "DailyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyPlanBlock" ADD CONSTRAINT "DailyPlanBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PomodoroSettings" ADD CONSTRAINT "PomodoroSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClockfySettings" ADD CONSTRAINT "ClockfySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskBoardSettings" ADD CONSTRAINT "TaskBoardSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

