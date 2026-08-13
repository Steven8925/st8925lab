-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MANAGER',
    "display_name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "revoked_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "push_token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT,
    "app_version" TEXT,
    "os_version" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alarms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "source_event_id" TEXT,
    "dedup_key" TEXT,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "occurred_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "alarm_recipients" (
    "alarm_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    PRIMARY KEY ("alarm_id", "user_id"),
    CONSTRAINT "alarm_recipients_alarm_id_fkey" FOREIGN KEY ("alarm_id") REFERENCES "alarms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alarm_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alarm_reads" (
    "alarm_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("alarm_id", "user_id"),
    CONSTRAINT "alarm_reads_alarm_id_fkey" FOREIGN KEY ("alarm_id") REFERENCES "alarms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alarm_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "push_deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alarm_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ticket_id" TEXT,
    "receipt_id" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "sent_at" DATETIME,
    "settled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "push_deliveries_alarm_id_fkey" FOREIGN KEY ("alarm_id") REFERENCES "alarms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "push_deliveries_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "alarm_id" TEXT,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_push_token_key" ON "devices"("push_token");

-- CreateIndex
CREATE INDEX "devices_user_id_active_idx" ON "devices"("user_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "alarms_dedup_key_key" ON "alarms"("dedup_key");

-- CreateIndex
CREATE INDEX "alarms_created_at_idx" ON "alarms"("created_at");

-- CreateIndex
CREATE INDEX "alarms_severity_created_at_idx" ON "alarms"("severity", "created_at");

-- CreateIndex
CREATE INDEX "alarm_recipients_user_id_idx" ON "alarm_recipients"("user_id");

-- CreateIndex
CREATE INDEX "alarm_reads_user_id_idx" ON "alarm_reads"("user_id");

-- CreateIndex
CREATE INDEX "push_deliveries_status_created_at_idx" ON "push_deliveries"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_deliveries_alarm_id_device_id_key" ON "push_deliveries"("alarm_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_source_event_id_key" ON "webhook_events"("source", "event_id");
