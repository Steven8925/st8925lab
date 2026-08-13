-- Alarm reference codes: DEVICEKEY-YYYYMMDD-NNN
--
-- `reference` is nullable and no backfill is performed. Alarms stored before
-- this migration were never issued a code, and inventing one now would put a
-- number into an audit trail that nobody ever quoted. They render as the bare
-- title instead (see formatAlarmLabel in packages/contracts/src/reference.ts).
--
-- The UNIQUE index tolerates those NULLs: SQLite and PostgreSQL both treat NULL
-- values as distinct in a unique index, so every un-numbered alarm coexists.

-- AlterTable
ALTER TABLE "alarms" ADD COLUMN "reference" TEXT;

-- CreateTable
--
-- The composite primary key IS the daily reset: a new date is a new row that
-- starts at 0, so nothing has to run at midnight for counters to restart.
CREATE TABLE "alarm_sequences" (
    "device_key" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,

    PRIMARY KEY ("device_key", "date_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "alarms_reference_key" ON "alarms"("reference");
