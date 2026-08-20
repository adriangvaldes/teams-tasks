-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "color_hex" CHAR(7) NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "status" "task_status" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_teams" (
    "task_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "task_teams_pkey" PRIMARY KEY ("task_id","team_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE INDEX "teams_name_idx" ON "teams"("name");

-- CreateIndex
CREATE INDEX "teams_created_at_idx" ON "teams"("created_at");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- CreateIndex
CREATE INDEX "tasks_created_at_idx" ON "tasks"("created_at");

-- CreateIndex
CREATE INDEX "tasks_title_idx" ON "tasks"("title");

-- CreateIndex
CREATE INDEX "task_teams_team_id_idx" ON "task_teams"("team_id");

-- AddForeignKey
ALTER TABLE "task_teams" ADD CONSTRAINT "task_teams_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_teams" ADD CONSTRAINT "task_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

