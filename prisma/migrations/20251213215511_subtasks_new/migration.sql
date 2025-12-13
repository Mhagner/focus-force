-- CreateTable
CREATE TABLE "public"."TaskSubtask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSubtask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."TaskSubtask" ADD CONSTRAINT "TaskSubtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
