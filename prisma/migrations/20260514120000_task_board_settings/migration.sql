-- CreateTable
CREATE TABLE "TaskBoardSettings" (
    "id" TEXT NOT NULL,
    "columns" JSONB,
    "taskColumnMap" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskBoardSettings_pkey" PRIMARY KEY ("id")
);
