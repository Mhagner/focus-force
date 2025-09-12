CREATE TABLE "PomodoroSettings" (
  "id" TEXT NOT NULL,
  "workMin" INTEGER NOT NULL,
  "shortBreakMin" INTEGER NOT NULL,
  "longBreakMin" INTEGER NOT NULL,
  "cyclesToLongBreak" INTEGER NOT NULL,
  "autoStartNext" BOOLEAN NOT NULL,
  "soundOn" BOOLEAN NOT NULL,
  CONSTRAINT "PomodoroSettings_pkey" PRIMARY KEY ("id")
);
