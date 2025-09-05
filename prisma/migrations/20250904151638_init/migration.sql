-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('alta', 'media', 'baixa');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('todo', 'doing', 'done');

-- CreateEnum
CREATE TYPE "public"."SessionType" AS ENUM ('manual', 'pomodoro');

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client" TEXT,
    "color" TEXT NOT NULL,
    "hourlyRate" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "public"."Priority" NOT NULL,
    "plannedFor" TEXT,
    "status" "public"."Status" NOT NULL,
    "estimateMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FocusSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3),
    "durationSec" INTEGER NOT NULL,
    "type" "public"."SessionType" NOT NULL,
    "pomodoroCycles" INTEGER,
    "notes" TEXT,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyPlan" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyPlanBlock" (
    "id" TEXT NOT NULL,
    "dailyPlanId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "targetMinutes" INTEGER NOT NULL,

    CONSTRAINT "DailyPlanBlock_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FocusSession" ADD CONSTRAINT "FocusSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FocusSession" ADD CONSTRAINT "FocusSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyPlanBlock" ADD CONSTRAINT "DailyPlanBlock_dailyPlanId_fkey" FOREIGN KEY ("dailyPlanId") REFERENCES "public"."DailyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyPlanBlock" ADD CONSTRAINT "DailyPlanBlock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
