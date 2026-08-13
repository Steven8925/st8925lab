/*
  Warnings:

  - Added the required column `updated_at` to the `alarm_recipients` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "push_deliveries" ADD COLUMN "device_confirmed_at" DATETIME;

-- CreateTable
CREATE TABLE "alarm_unresolved_recipients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alarm_id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alarm_unresolved_recipients_alarm_id_fkey" FOREIGN KEY ("alarm_id") REFERENCES "alarms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_alarm_recipients" (
    "alarm_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "delivered_at" DATETIME,
    "acked_at" DATETIME,
    "resolved_at" DATETIME,
    "undeliverable_reason" TEXT,
    "updated_at" DATETIME NOT NULL,

    PRIMARY KEY ("alarm_id", "user_id"),
    CONSTRAINT "alarm_recipients_alarm_id_fkey" FOREIGN KEY ("alarm_id") REFERENCES "alarms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alarm_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_alarm_recipients" ("alarm_id", "user_id") SELECT "alarm_id", "user_id" FROM "alarm_recipients";
DROP TABLE "alarm_recipients";
ALTER TABLE "new_alarm_recipients" RENAME TO "alarm_recipients";
CREATE INDEX "alarm_recipients_user_id_idx" ON "alarm_recipients"("user_id");
CREATE INDEX "alarm_recipients_state_idx" ON "alarm_recipients"("state");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "alarm_unresolved_recipients_alarm_id_idx" ON "alarm_unresolved_recipients"("alarm_id");

-- CreateIndex
CREATE UNIQUE INDEX "alarm_unresolved_recipients_alarm_id_identifier_key" ON "alarm_unresolved_recipients"("alarm_id", "identifier");
