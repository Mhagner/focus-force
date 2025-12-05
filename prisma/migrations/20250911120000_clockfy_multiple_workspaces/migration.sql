-- Add clockfyWorkspaceId to projects
ALTER TABLE "public"."Project" ADD COLUMN "clockfyWorkspaceId" TEXT;

-- Add workspaces json to ClockfySettings
ALTER TABLE "public"."ClockfySettings" ADD COLUMN "workspaces" JSONB;
