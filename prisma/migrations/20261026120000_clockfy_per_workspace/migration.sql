-- A integração Clockfy passa a ser por workspace do app (antes era uma por usuário).
DROP INDEX "public"."ClockfySettings_userId_key";

ALTER TABLE "public"."ClockfySettings" ADD COLUMN "appWorkspaceId" TEXT;

-- Cada workspace existente recebe uma cópia da configuração atual do usuário
-- (a chave continua criptografada); depois o usuário ajusta cada uma.
INSERT INTO "public"."ClockfySettings" ("id", "apiKey", "workspaceId", "workspaces", "createdAt", "updatedAt", "userId", "appWorkspaceId")
SELECT gen_random_uuid()::text, c."apiKey", c."workspaceId", c."workspaces", c."createdAt", CURRENT_TIMESTAMP, c."userId", w."id"
FROM "public"."ClockfySettings" c
JOIN "public"."Workspace" w ON w."userId" = c."userId"
WHERE c."appWorkspaceId" IS NULL;

DELETE FROM "public"."ClockfySettings" WHERE "appWorkspaceId" IS NULL;

CREATE UNIQUE INDEX "ClockfySettings_appWorkspaceId_key" ON "public"."ClockfySettings"("appWorkspaceId");
CREATE INDEX "ClockfySettings_userId_idx" ON "public"."ClockfySettings"("userId");

ALTER TABLE "public"."ClockfySettings" ADD CONSTRAINT "ClockfySettings_appWorkspaceId_fkey" FOREIGN KEY ("appWorkspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
