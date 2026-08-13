# APP_notification
Mobile APP with notification function

---

## 📖 閱讀導讀 / How to read this file

> **本導讀為後加，其下內容一律未經修改。**
> This guide was added later; nothing below it has been altered.

| 區段 Section | 內容 Content | 權威性 Authority |
|---|---|---|
| `====================Javis 20260811` 之後<br>到 `# 開發歷程` 之前 | 2026-08-11 由 JARVIS 產出的**原始建置規格**（AI Deployment Plan），逐字保留<br>The **original build specification** produced by JARVIS on 2026-08-11, preserved verbatim | ⚠️ **僅供歷史參考，部分已過時**<br>**Historical reference only — partly superseded** |
| `# 開發歷程 / Development History` 起<br>onwards | 依日期記錄實際發生了什麼<br>Dated record of what actually happened | ✅ 這是本檔案的正題<br>This is what this file is for |

> 以章節標題定位而非行號：行號會因任何上方編輯而失準。
> Located by section heading, not line number — line numbers drift with any edit above them.

### ⚠️ 現行規格請看 `PROMPT.md` / For current behaviour, read `PROMPT.md`

**中文：** 上方的原始規格區段是專案第一天收到的規格。實作過程中有 5 項刻意的偏離（PostgreSQL→SQLite、Expo Push Service→PushProvider 抽象層、單一 webhook 格式→來源格式轉接層、新增獨立模擬營運伺服器、`expoToken`→`pushToken`），另有一項設計決策在開發中被推翻（部分收件人無效時的處理）。**照該區段實作，會做出與現況不同的系統。**

現行的權威規格是 **`PROMPT.md`** —— 它從實際原始碼逐項轉寫，是「照這份能重建」的那一份。本檔案回答的是另一個問題：「這個專案是怎麼走到今天這樣的？」

**English:** That section is the specification as received on day one. The implementation deviates from it in five deliberate ways, and one design decision was reversed during development. **Building from it would produce a different system from the one that exists.**

The current authority is **`PROMPT.md`**, transcribed from the actual source. This file answers a different question: how the project got here.

### 其他文件 / Related documents

| 檔案 File | 內容 Content |
|---|---|
| `PROMPT.md` | **現行重建規格**（唯一權威）/ Current rebuild specification (sole authority) |
| `discussion_summary_0811.md` | 設計討論紀錄：Part I 研究階段、Part II 實作階段<br>Design discussion: Part I research, Part II implementation |
| `requirement/README.md` | 收到當天的原始輸入，未經任何修改<br>The original input as received, entirely untouched |
| `requirement/discussion_summary_0811.md` | 同上 / same |

---

====================Javis 20260811============================================
# Mobile Alarm Notification System — AI Deployment Plan

## 0. Instructions for the implementing AI

You are implementing a production-oriented mobile alarm notification system for **iOS and Android**.

Follow this document as an executable specification.

### Mandatory engineering rules

1. Do not guess when a requirement, credential, API contract, or existing-server behavior is unknown. Inspect the repository and ask the user for missing values.
2. Work in small phases. After each phase, run its verification commands before continuing.
3. Never commit secrets, tokens, private keys, `.env` files, Firebase service-account JSON, or Apple keys.
4. Use environment variables for all credentials and URLs.
5. Treat push notifications as a hint, not the source of truth. The database is authoritative.
6. Every alarm must be idempotent. Repeated delivery of the same source event must not create duplicate alarms or duplicate notifications.
7. Store only an alarm ID in push data. Fetch protected details through the authenticated API after the user opens the alarm.
8. Handle multiple devices per user.
9. Handle push-token rotation and invalid tokens.
10. Add automated tests before declaring a phase complete.
11. Do not use deprecated FCM legacy HTTP endpoints. Use Expo Push Service for v1, or FCM HTTP v1/APNs directly only after an explicit architecture decision.
12. Do not use Expo Go as the primary push-testing target. Use an Expo development build and real devices.
13. Do not claim that a push was delivered merely because the push provider accepted a request. Store tickets and process receipts.
14. Preserve existing application behavior when integrating with an existing operation/event server.

---

## 1. Product definition

### 1.1 User story

A manager has a mobile application installed on iOS or Android.

An existing server records operation events. When an event qualifies as an alarm:

1. Existing server sends an authenticated webhook to the notification backend.
2. Notification backend validates and deduplicates the event.
3. Notification backend stores the alarm in PostgreSQL.
4. Notification backend finds all active manager devices.
5. Notification backend sends a push notification through Expo Push Service.
6. Manager sees the notification and/or a red badge in the app.
7. Manager taps the notification or opens the app.
8. App navigates to the alarm detail screen.
9. App fetches alarm details from the authenticated API.
10. Manager marks the alarm as read.
11. App refreshes the unread count whenever it becomes active.

### 1.2 Explicit non-goals for version 1

Do not implement these unless separately requested:

- Voice or video calling.
- Chat.
- SMS or email delivery.
- Complex workflow approval.
- Background polling as a replacement for push.
- Marketing campaigns.
- Multi-tenant billing.
- Full admin dashboard.
- End-to-end encryption.
- Offline editing.

### 1.3 Reliability expectation

Push delivery is best effort. The system must remain correct if:

- Push permission is denied.
- User has no network.
- Device token changes.
- Device is offline.
- Push is delayed or dropped.
- Provider returns `DeviceNotRegistered`.
- The same event is delivered repeatedly.
- The manager has multiple devices.
- The user taps an old notification.
- The app is cold-started by a notification.

The alarm list and database are the source of truth.

---

## 2. Recommended technology stack

### 2.1 Mobile

- React Native
- Expo
- TypeScript
- Expo Router
- `expo-notifications`
- `expo-device`
- `expo-constants`
- `expo-secure-store` for refresh tokens or sensitive local values
- `@tanstack/react-query` for API data and cache invalidation
- `zod` for runtime validation
- `react-hook-form` for login and forms

Use an Expo development build. Do not design the workflow around Expo Go.

### 2.2 Backend

- Node.js current LTS
- TypeScript
- Fastify or Express
- PostgreSQL
- Prisma ORM or Drizzle ORM
- `expo-server-sdk-node`
- `zod`
- `pino` structured logging
- `vitest` or Jest
- Docker Compose for local PostgreSQL

Recommended beginner choice:

- Fastify
- Prisma
- PostgreSQL
- No Redis and no queue in version 1

Add Redis/BullMQ only after measured load or reliability requirements justify it.

### 2.3 Hosting

For initial deployment, use one managed service that provides:

- Node application hosting
- Managed PostgreSQL
- TLS
- Environment variables
- Logs

Examples include Railway, Render, Fly.io, or an equivalent provider. The implementing AI must not hard-code a provider without asking if the user already has infrastructure.

### 2.4 Push transport

Use Expo Push Service initially:

- Mobile receives an `ExpoPushToken`.
- Backend stores the token.
- Backend sends to Expo Push API.
- Expo handles the FCM/APNs handoff.

Migration path later:

- `expo-notifications` can obtain native device tokens.
- Backend can later send directly to FCM HTTP v1 and APNs.
- Keep the internal `devices` table provider-neutral enough to support migration.

---

## 3. Repository structure

Create a monorepo unless an existing repository dictates otherwise:

```text
alarm-system/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── notifications/
│   │   │   ├── screens/
│   │   │   ├── storage/
│   │   │   ├── types/
│   │   │   └── validation/
│   │   ├── app.json
│   │   ├── eas.json
│   │   └── package.json
│   └── api/
│       ├── src/
│       │   ├── config.ts
│       │   ├── server.ts
│       │   ├── db/
│       │   ├── auth/
│       │   ├── alarms/
│       │   ├── devices/
│       │   ├── notifications/
│       │   └── webhooks/
│       ├── prisma/
│       ├── tests/
│       └── package.json
├── packages/
│   └── contracts/
│       ├── src/
│       └── package.json
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
└── app_plan.md
```

If the repository already has a structure, adapt instead of destroying it.

---

## 4. Domain model

### 4.1 Entities

- `User`: authenticated manager or administrator.
- `Device`: one mobile installation and one Expo push token.
- `Alarm`: durable alarm generated by an operation event.
- `AlarmRecipient`: which users should receive an alarm.
- `AlarmRead`: per-user read state.
- `PushDelivery`: each provider delivery attempt.
- `WebhookEvent`: idempotency record for incoming source events.

### 4.2 PostgreSQL schema using Prisma

Create `apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  MANAGER
  ADMIN
}

enum Platform {
  IOS
  ANDROID
}

enum AlarmSeverity {
  INFO
  WARNING
  CRITICAL
}

enum PushDeliveryStatus {
  PENDING
  ACCEPTED
  DELIVERED
  FAILED
  INVALID_TOKEN
}

model User {
  id              String           @id @default(uuid()) @db.Uuid
  email           String           @unique
  passwordHash    String           @map("password_hash")
  role            UserRole         @default(MANAGER)
  active          Boolean          @default(true)
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  devices         Device[]
  recipients      AlarmRecipient[]
  reads           AlarmRead[]

  @@map("users")
}

model Device {
  id              String           @id @default(uuid()) @db.Uuid
  userId          String           @map("user_id") @db.Uuid
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  expoToken       String           @unique @map("expo_token")
  platform        Platform
  appVersion      String?          @map("app_version")
  osVersion       String?          @map("os_version")
  locale          String?
  timezone        String?
  active          Boolean          @default(true)
  lastSeenAt      DateTime         @default(now()) @map("last_seen_at")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  deliveries      PushDelivery[]

  @@index([userId, active])
  @@map("devices")
}

model Alarm {
  id              String           @id @default(uuid()) @db.Uuid
  source          String
  sourceEventId   String?          @map("source_event_id")
  dedupKey        String?          @unique @map("dedup_key")
  severity        AlarmSeverity
  title           String
  body            String
  details         Json             @default("{}")
  occurredAt      DateTime         @map("occurred_at")
  createdAt       DateTime         @default(now()) @map("created_at")
  recipients      AlarmRecipient[]
  reads           AlarmRead[]
  deliveries      PushDelivery[]

  @@index([createdAt])
  @@index([severity, createdAt])
  @@map("alarms")
}

model AlarmRecipient {
  alarmId     String   @map("alarm_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  alarm       Alarm    @relation(fields: [alarmId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([alarmId, userId])
  @@map("alarm_recipients")
}

model AlarmRead {
  alarmId     String   @map("alarm_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  readAt      DateTime @default(now()) @map("read_at")
  alarm       Alarm    @relation(fields: [alarmId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([alarmId, userId])
  @@map("alarm_reads")
}

model PushDelivery {
  id            String             @id @default(uuid()) @db.Uuid
  alarmId       String             @map("alarm_id") @db.Uuid
  deviceId      String             @map("device_id") @db.Uuid
  alarm         Alarm              @relation(fields: [alarmId], references: [id], onDelete: Cascade)
  device        Device             @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  status        PushDeliveryStatus @default(PENDING)
  ticketId      String?            @map("ticket_id")
  receiptId     String?            @map("receipt_id")
  errorCode     String?            @map("error_code")
  errorMessage  String?            @map("error_message")
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  @@unique([alarmId, deviceId])
  @@index([status, createdAt])
  @@map("push_deliveries")
}

model WebhookEvent {
  id            String   @id @default(uuid()) @db.Uuid
  source        String
  eventId       String
  payloadHash   String   @map("payload_hash")
  receivedAt    DateTime @default(now()) @map("received_at")
  processedAt   DateTime? @map("processed_at")

  @@unique([source, eventId])
  @@map("webhook_events")
}
```

### 4.3 Why these constraints exist

- `Device` is separate from `User` because one manager can use several devices.
- `expoToken` is unique because tokens can move between accounts after reinstall or account changes.
- `AlarmRead` is separate because read status is per user.
- `WebhookEvent` prevents duplicate source-event processing.
- `PushDelivery` is unique per alarm/device, preventing duplicate sends caused by retries.
- `Alarm.details` stores structured source information while the push contains only the alarm ID.

---

## 5. Environment configuration

Create `.env.example`:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://alarm:alarm@localhost:5432/alarm_system?schema=public
JWT_SECRET=replace-with-a-long-random-development-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
INTERNAL_WEBHOOK_SECRET=replace-with-a-different-long-random-secret
EXPO_ACCESS_TOKEN=
EXPO_PROJECT_ID=
CORS_ORIGIN=http://localhost:8081
LOG_LEVEL=info
```

Rules:

- `.env` must be in `.gitignore`.
- Production secrets must be configured in the hosting provider.
- Never log `JWT_SECRET`, `INTERNAL_WEBHOOK_SECRET`, Expo access tokens, push tokens, or password hashes.

---

## 6. Local infrastructure

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: alarm
      POSTGRES_PASSWORD: alarm
      POSTGRES_DB: alarm_system
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U alarm -d alarm_system"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

Start it:

```bash
docker compose up -d postgres
```

Verify:

```bash
docker compose ps
```

---

## 7. Backend API contract

All JSON responses use this shape:

```json
{
  "data": {},
  "error": null
}
```

Errors use:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "..."
  }
}
```

### 7.1 Authentication endpoints

```text
POST /v1/auth/login
POST /v1/auth/refresh
POST /v1/auth/logout
```

### 7.2 Device endpoint

```text
POST /v1/devices/register
```

Authenticated request:

```json
{
  "expoToken": "ExponentPushToken[example]",
  "platform": "ios",
  "appVersion": "1.0.0",
  "osVersion": "18.0",
  "locale": "en-US",
  "timezone": "UTC"
}
```

Expected behavior:

- Validate token format with `Expo.isExpoPushToken`.
- Upsert by `expoToken`.
- Associate it with the authenticated user.
- If token was associated with another user, move it to the authenticated user only after explicit authenticated registration.
- Set `active=true` and update `lastSeenAt`.

### 7.3 Alarm endpoints

```text
GET  /v1/alarms?status=unread&limit=50&cursor=...
GET  /v1/alarms/:alarmId
GET  /v1/alarms/unread-count
POST /v1/alarms/:alarmId/read
```

Rules:

- User may only access alarms where an `AlarmRecipient` row exists.
- `GET /v1/alarms/:alarmId` must return `404` for both nonexistent and unauthorized alarms. Do not leak existence.
- `POST /read` is idempotent.
- Pagination must be cursor-based or stable timestamp+ID pagination.

Example list response:

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "severity": "CRITICAL",
        "title": "Temperature limit exceeded",
        "body": "Server room temperature is above the configured limit.",
        "occurredAt": "2026-08-11T10:30:00.000Z",
        "readAt": null
      }
    ],
    "nextCursor": null
  },
  "error": null
}
```

### 7.4 Internal webhook endpoint

```text
POST /v1/internal/alarms
```

Required header:

```text
X-Internal-Webhook-Signature: <HMAC-SHA256 hex digest>
```

Request body:

```json
{
  "eventId": "source-system-event-123",
  "source": "operations-server",
  "severity": "critical",
  "title": "Temperature limit exceeded",
  "body": "Server room temperature is above the configured limit.",
  "occurredAt": "2026-08-11T10:30:00.000Z",
  "dedupKey": "temperature:server-room-1:2026-08-11T10:30",
  "recipientUserIds": ["manager-user-uuid"],
  "details": {
    "site": "main-site",
    "metric": "temperature",
    "value": 42.5,
    "threshold": 35
  }
}
```

Signature calculation:

```text
HMAC-SHA256(INTERNAL_WEBHOOK_SECRET, raw_request_body_bytes)
```

Do not calculate the signature over parsed/re-serialized JSON. Use the exact raw request bytes.

Response for new event:

```json
{
  "data": {
    "alarmId": "uuid",
    "duplicate": false
  },
  "error": null
}
```

Response for duplicate event:

```json
{
  "data": {
    "alarmId": "existing-uuid",
    "duplicate": true
  },
  "error": null
}
```

The webhook transaction must:

1. Validate HMAC.
2. Validate JSON schema.
3. Insert `WebhookEvent` with `(source,eventId)` uniqueness.
4. Insert `Alarm`.
5. Insert `AlarmRecipient` rows.
6. Commit.
7. Send pushes after commit.

Do not hold a database transaction open while making an external Expo request.

---

## 8. Backend implementation examples

### 8.1 Zod contract

Create `packages/contracts/src/alarm.ts`:

```ts
import { z } from "zod";

export const alarmWebhookSchema = z.object({
  eventId: z.string().min(1).max(200),
  source: z.string().min(1).max(100),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  occurredAt: z.string().datetime(),
  dedupKey: z.string().min(1).max(300).optional(),
  recipientUserIds: z.array(z.string().uuid()).min(1).max(100),
  details: z.record(z.unknown()).default({}),
});

export type AlarmWebhook = z.infer<typeof alarmWebhookSchema>;
```

### 8.2 HMAC verification

```ts
import crypto from "node:crypto";

export function verifyWebhookSignature(
  rawBody: Buffer,
  suppliedSignature: string | undefined,
  secret: string,
): boolean {
  if (!suppliedSignature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const supplied = suppliedSignature.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(supplied)) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(supplied, "hex"),
  );
}
```

### 8.3 Expo push sender

Create `apps/api/src/notifications/expo-push.ts`:

```ts
import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { prisma } from "../db/prisma";

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
});

export async function sendAlarmPush(alarmId: string): Promise<void> {
  const alarm = await prisma.alarm.findUnique({
    where: { id: alarmId },
    include: {
      recipients: {
        include: {
          user: {
            include: {
              devices: { where: { active: true } },
            },
          },
        },
      },
    },
  });

  if (!alarm) throw new Error(`Alarm not found: ${alarmId}`);

  const messages: ExpoPushMessage[] = [];
  const deviceIds: string[] = [];

  for (const recipient of alarm.recipients) {
    for (const device of recipient.user.devices) {
      if (!Expo.isExpoPushToken(device.expoToken)) {
        await prisma.device.update({
          where: { id: device.id },
          data: { active: false },
        });
        continue;
      }

      const existing = await prisma.pushDelivery.findUnique({
        where: {
          alarmId_deviceId: {
            alarmId,
            deviceId: device.id,
          },
        },
      });

      if (existing && existing.status !== "FAILED" && existing.status !== "PENDING") {
        continue;
      }

      await prisma.pushDelivery.upsert({
        where: {
          alarmId_deviceId: {
            alarmId,
            deviceId: device.id,
          },
        },
        create: { alarmId, deviceId: device.id },
        update: { status: "PENDING", errorCode: null, errorMessage: null },
      });

      messages.push({
        to: device.expoToken,
        title: `[${alarm.severity}] ${alarm.title}`,
        body: alarm.body,
        sound: "default",
        priority: alarm.severity === "CRITICAL" ? "high" : "default",
        badge: 1,
        data: {
          type: "alarm",
          alarmId: alarm.id,
        },
      });
      deviceIds.push(device.id);
    }
  }

  for (const chunk of expo.chunkPushNotifications(messages)) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    await recordTickets(alarmId, deviceIds, tickets);
  }
}

async function recordTickets(
  alarmId: string,
  deviceIds: string[],
  tickets: ExpoPushTicket[],
): Promise<void> {
  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    const deviceId = deviceIds[index];

    if (ticket.status === "ok") {
      await prisma.pushDelivery.update({
        where: { alarmId_deviceId: { alarmId, deviceId } },
        data: { status: "ACCEPTED", ticketId: ticket.id },
      });
    } else {
      await prisma.pushDelivery.update({
        where: { alarmId_deviceId: { alarmId, deviceId } },
        data: {
          status: "FAILED",
          errorCode: ticket.details?.error ?? "UNKNOWN",
          errorMessage: ticket.message,
        },
      });
    }
  }
}
```

Important implementation correction: if the sender supports multiple chunks, maintain a per-message mapping of `deviceId` rather than assuming a single global array aligns with every chunk. The production implementation must create explicit objects such as `{ deviceId, message }`, chunk those objects, and map each ticket back to its exact device.

### 8.4 Correct chunk mapping

Use this pattern instead of relying on a global index:

```ts
type DeviceMessage = {
  deviceId: string;
  message: ExpoPushMessage;
};

const pending: DeviceMessage[] = [];

// Add one DeviceMessage per target device.

for (const chunk of expo.chunkPushNotifications(pending.map((x) => x.message))) {
  // If the SDK chunking loses mapping, chunk the array yourself in matching sizes.
  // Keep each message and device ID together.
}
```

Preferred helper:

```ts
function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

for (const group of chunks(pending, 100)) {
  const tickets = await expo.sendPushNotificationsAsync(
    group.map((item) => item.message),
  );

  for (let i = 0; i < tickets.length; i += 1) {
    const item = group[i];
    const ticket = tickets[i];
    // Update item.deviceId using ticket result.
  }
}
```

### 8.5 Receipt processing

Implement a scheduled job or endpoint that:

1. Selects `PushDelivery` rows with `status=ACCEPTED` and a ticket ID.
2. Waits at least several seconds before querying receipts.
3. Calls Expo receipt API.
4. Marks successful receipts as `DELIVERED`.
5. Marks failures as `FAILED`.
6. Marks `DeviceNotRegistered` devices inactive and removes their token if appropriate.
7. Logs error codes without logging the token itself.

For low volume, a simple process can run every minute. Do not add Redis until this process demonstrates a real scaling problem.

---

## 9. Mobile app configuration

### 9.1 Create project

Use the current Expo template at implementation time:

```bash
npx create-expo-app@latest apps/mobile
```

Do not hard-code an old SDK version in this plan. Check the current Expo SDK compatibility page before installation.

Install packages:

```bash
cd apps/mobile
npx expo install expo-notifications expo-device expo-constants expo-secure-store
npm install @tanstack/react-query zod react-hook-form
npx expo install expo-dev-client
```

### 9.2 Expo configuration

`app.json` or `app.config.ts` must include the notifications config plugin. Example:

```json
{
  "expo": {
    "name": "Alarm Manager",
    "slug": "alarm-manager",
    "scheme": "alarmmanager",
    "version": "1.0.0",
    "orientation": "portrait",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#b91c1c",
          "defaultChannel": "alarms"
        }
      ]
    ],
    "android": {
      "package": "com.example.alarmmanager"
    },
    "ios": {
      "bundleIdentifier": "com.example.alarmmanager"
    },
    "extra": {
      "apiBaseUrl": "https://api.example.com"
    }
  }
}
```

Use a white-on-transparent notification icon for Android.

### 9.3 Development build

Create `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

Configure EAS:

```bash
npm install --global eas-cli
eas login
eas build:configure
eas build --profile development --platform android
eas build --profile development --platform ios
```

A physical device is strongly recommended for final notification testing.

### 9.4 Push registration code

Create `apps/mobile/src/notifications/registerPush.ts`:

```ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("alarms", {
      name: "Alarms",
      description: "Operational alarms",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error("EAS project ID is missing");
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
```

### 9.5 Register token after authentication

The token must be registered:

- After successful login.
- On every app launch while authenticated.
- When the push-token listener reports a changed token.
- After logout, do not continue associating a device with the previous user.

Example:

```ts
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerForPushNotifications } from "./registerPush";
import { api } from "../api/client";

export function usePushRegistration(isAuthenticated: boolean): void {
  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    let subscription: Notifications.Subscription | undefined;

    void (async () => {
      const token = await registerForPushNotifications();
      if (!active || !token) return;

      await api.registerDevice({
        expoToken: token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      });

      subscription = Notifications.addPushTokenListener(async (next) => {
        if (!next.data) return;
        await api.registerDevice({
          expoToken: next.data,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
      });
    })();

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [isAuthenticated]);
}
```

### 9.6 Foreground notification handler

Create this at application startup, before rendering navigation:

```ts
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

Use the response shape appropriate to the current Expo SDK. If the SDK uses deprecated fields such as `shouldShowAlert`, follow the current official type definitions rather than forcing old examples.

### 9.7 Notification tap handling

Handle both:

- App already running/backgrounded.
- App launched from a terminated state.

```ts
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

export function installNotificationResponseHandlers(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        alarmId?: string;
      };

      if (data.type === "alarm" && data.alarmId) {
        router.push({
          pathname: "/alarms/[id]",
          params: { id: data.alarmId },
        });
      }
    },
  );

  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (!response) return;

    const data = response.notification.request.content.data as {
      type?: string;
      alarmId?: string;
    };

    if (data.type === "alarm" && data.alarmId) {
      router.replace({
        pathname: "/alarms/[id]",
        params: { id: data.alarmId },
      });
    }
  });

  return () => subscription.remove();
}
```

Prevent duplicate navigation if both startup handling and listener fire. Use a short-lived handled-response ID or alarm ID guard.

---

## 10. Mobile screens

Create these routes:

```text
app/
├── _layout.tsx
├── login.tsx
├── (authenticated)/
│   ├── _layout.tsx
│   ├── index.tsx                 # dashboard / unread alarm list
│   └── alarms/
│       └── [id].tsx              # alarm detail
```

### 10.1 Dashboard

Display:

- Header.
- Unread badge count.
- Filter: all/unread/critical.
- Alarm list.
- Pull-to-refresh.
- Empty state.
- Error state with retry.
- Last refresh time.

When screen becomes active:

1. Fetch unread count.
2. Fetch alarm list.
3. Update native badge count.

### 10.2 Detail screen

On route load:

1. Validate route parameter as UUID.
2. Fetch alarm from API.
3. Render title, severity, timestamp, body, and safe structured details.
4. Mark read after successful fetch or explicit user action, according to product decision.
5. Invalidate alarm list and unread count queries.

Do not trust notification payload details. The payload only identifies the alarm.

### 10.3 Badge behavior

Use server unread count as authoritative:

```ts
await Notifications.setBadgeCountAsync(unreadCount);
```

Do not increment the badge blindly for every push. Multiple devices, duplicate pushes, and read operations make local increments inaccurate.

---

## 11. Authentication

For version 1:

- Email/password login or existing SSO if available.
- Short-lived access token.
- Long-lived refresh token stored securely.
- Access token sent as `Authorization: Bearer <token>`.
- Passwords hashed with Argon2id or bcrypt.
- Rate-limit login.
- Never store access tokens in plain AsyncStorage.

If the existing server already has authentication, integrate with it rather than introducing a second identity system.

---

## 12. Security requirements

### 12.1 Webhook security

- HTTPS only in production.
- HMAC signature over raw body.
- Event ID uniqueness.
- Timestamp header and replay window if the source supports it.
- Request body size limit.
- Rate limiting.
- Audit logging without sensitive payloads.

### 12.2 API security

- Validate every request with Zod.
- Authorize every alarm query through `AlarmRecipient`.
- Never accept `userId` from the client as an authorization decision.
- Derive current user from the verified JWT.
- Avoid leaking whether another user's alarm exists.
- Use parameterized queries through Prisma/Drizzle.
- Configure CORS narrowly.
- Add security headers.

### 12.3 Push privacy

Push payload example:

```json
{
  "data": {
    "type": "alarm",
    "alarmId": "uuid"
  }
}
```

Do not include:

- Passwords.
- Access tokens.
- Internal credentials.
- Full sensitive alarm details.
- Personal data not needed for the notification.

The visible title/body should also be reviewed for lock-screen privacy.

---

## 13. Testing plan

### 13.1 Backend unit tests

Test:

- Valid and invalid webhook signatures.
- Invalid JSON/schema.
- Duplicate `(source,eventId)`.
- Duplicate `dedupKey`.
- Unknown recipient.
- Inactive recipient.
- Unauthorized alarm detail access.
- Idempotent mark-read.
- Device token upsert.
- Token reassignment behavior.
- Expo ticket success.
- Expo ticket error.
- `DeviceNotRegistered` cleanup.
- Receipt processing.

### 13.2 Backend integration tests

Scenario:

1. Create manager.
2. Register two devices.
3. Post signed alarm webhook.
4. Confirm one alarm row.
5. Confirm one recipient row.
6. Confirm two delivery rows.
7. Post the exact event again.
8. Confirm no second alarm.
9. Confirm no second delivery.
10. Query unread count.
11. Mark read.
12. Confirm unread count is zero.

### 13.3 Mobile tests

- Login.
- Token registration.
- Permission granted.
- Permission denied.
- Android notification channel creation.
- Foreground notification display.
- Background notification tap.
- Cold-start notification tap.
- Invalid/missing alarm ID.
- Expired authentication.
- API offline state.
- Alarm list refresh.
- Badge reset after read.

### 13.4 Manual device matrix

Minimum:

- One recent Android device.
- One recent iPhone.
- Android 13+.
- iOS current supported version.
- App foreground.
- App background.
- App terminated by OS.
- User force-quit behavior documented separately.
- Notification permission granted/denied.
- Wi-Fi and cellular.

Test multiple Android manufacturers if the application is operationally critical.

---

## 14. Observability

### 14.1 Log events

Use structured logs with a request ID:

```json
{
  "level": "info",
  "event": "alarm_created",
  "requestId": "uuid",
  "alarmId": "uuid",
  "source": "operations-server",
  "recipientCount": 1
}
```

Log these events:

- `webhook_received`
- `webhook_rejected`
- `webhook_duplicate`
- `alarm_created`
- `alarm_duplicate`
- `push_send_started`
- `push_ticket_accepted`
- `push_ticket_failed`
- `push_receipt_delivered`
- `push_receipt_invalid_token`
- `device_registered`
- `alarm_read`

Never log full push tokens or full sensitive details.

### 14.2 Metrics

Track:

- Alarms received per hour.
- Duplicate webhook rate.
- Push acceptance rate.
- Push receipt success rate.
- Invalid-token rate.
- Active devices per user.
- Unread alarms.
- API latency.
- Webhook rejection count.
- Notification-to-open conversion if product analytics is approved.

### 14.3 Alerting

Alert operators when:

- Webhook failures exceed threshold.
- Push receipt errors spike.
- Invalid-token rate spikes.
- Database is unavailable.
- No alarms are processed despite expected source activity.

---

## 15. Deployment sequence

### Phase 1 — repository and local API

Deliver:

- Monorepo.
- TypeScript configuration.
- Docker Compose PostgreSQL.
- Prisma schema and migration.
- Health endpoint.
- Environment validation.
- Basic logging.

Verification:

```bash
pnpm install
pnpm lint
pnpm test
pnpm --filter api dev
curl http://localhost:3000/health
```

### Phase 2 — authentication and alarm API

Deliver:

- Login.
- Refresh.
- Device registration.
- Alarm list.
- Alarm detail.
- Unread count.
- Mark read.

Verification:

- Automated API tests pass.
- Unauthorized alarm access returns 404.
- Read operation is idempotent.

### Phase 3 — signed webhook

Deliver:

- HMAC verification.
- Webhook schema validation.
- Webhook idempotency.
- Alarm and recipient transaction.

Verification:

```bash
# Generate a signature using the implementation's test utility.
# Post the signed request and repeat it.
# Verify the second response says duplicate=true.
```

### Phase 4 — mobile shell

Deliver:

- Expo app.
- Authentication screen.
- Navigation.
- Alarm list.
- Detail screen.
- API client.

Verification:

- App runs in a development build.
- Login and API data work.

### Phase 5 — Android push

Deliver:

- Firebase Android configuration.
- Expo notification plugin.
- Android channel.
- Runtime permission.
- Expo token registration.
- Development build.

Verification:

- Push reaches physical Android device.
- Tap opens exact alarm.
- Cold-start tap opens exact alarm.

### Phase 6 — server push and receipts

Deliver:

- Expo Push Service sender.
- Ticket persistence.
- Receipt processor.
- Invalid-token cleanup.

Verification:

- Signed webhook causes notification.
- Duplicate webhook does not duplicate notification.
- Simulated invalid token becomes inactive.

### Phase 7 — iOS push

Deliver:

- Apple Developer account.
- APNs credentials through EAS/Expo setup.
- iOS development build.
- Physical iPhone test.

Verification:

- Permission prompt works.
- Push arrives in foreground/background.
- Tap and cold-start paths work.
- Badge reflects server count.

### Phase 8 — production hardening

Deliver:

- Production database.
- HTTPS API.
- Secret management.
- Backups.
- Error tracking.
- Health checks.
- Rate limiting.
- Monitoring.
- Store builds.

Verification:

- Restore database backup in a test environment.
- Run complete end-to-end test against staging.
- Review permissions and privacy behavior.
- Confirm no secrets in repository or build logs.

---

## 16. Acceptance criteria

The implementation is complete only when all are true:

1. A valid source alarm creates exactly one database alarm.
2. Repeating the same source event does not create a duplicate.
3. All intended managers receive the push on registered active devices.
4. Invalid push tokens are detected and deactivated.
5. Manager can open the alarm from a foreground notification.
6. Manager can open the alarm from a background notification.
7. Manager can open the alarm from a cold-start notification.
8. App displays alarm details fetched from the authenticated API.
9. User cannot access another user's alarm.
10. Read status is per user and idempotent.
11. App badge matches server unread count after refresh.
12. Alarm list remains available if push is dropped.
13. Backend tests pass in CI.
14. Mobile builds succeed for Android and iOS.
15. Production secrets are externalized.
16. Logs and metrics can distinguish webhook failure, database failure, provider rejection, invalid token, and successful receipt.

---

## 17. Decisions requiring user input before production

The implementing AI must ask these questions if the answers are not already available:

1. What is the existing server technology and where does it run?
2. What exact event format does the existing server produce?
3. How are managers identified — email, employee ID, existing account ID, or SSO?
4. Can one manager receive alarms from multiple sites or organizations?
5. Which severities should notify immediately?
6. Should all managers receive every alarm, or is routing based on site/team/role?
7. Should critical alarms bypass normal quiet hours? Note: platform restrictions still apply.
8. How long should alarms remain visible?
9. Should users be able to acknowledge or resolve alarms, or only mark them read?
10. What information is safe to display on a locked screen?
11. Is App Store distribution required, or will private/internal distribution be used?
12. What are the required data retention and privacy rules?
13. What hosting provider and domain are available?
14. What is the expected alarm volume and peak burst rate?
15. Are there compliance requirements such as GDPR, HIPAA, SOC 2, or local regulations?

Do not invent answers to these questions.

---

## 18. Recommended first command sequence

After confirming the repository is empty or identifying its existing structure:

```bash
mkdir -p apps packages
pnpm init
printf "packages:\n  - 'apps/*'\n  - 'packages/*'\n" > pnpm-workspace.yaml
mkdir -p apps/api apps/mobile packages/contracts
cd apps/api
pnpm init
pnpm add fastify @fastify/cors @fastify/helmet @fastify/jwt zod pino expo-server-sdk argon2
pnpm add -D typescript tsx vitest prisma @types/node
pnpm exec prisma init
cd ../mobile
npx create-expo-app@latest .
npx expo install expo-notifications expo-device expo-constants expo-secure-store expo-dev-client
pnpm add @tanstack/react-query zod react-hook-form
```

Do not execute these commands blindly if the repository already has package-management conventions. Inspect first.

---

## Final architecture summary

```text
Existing operations server
        |
        | HTTPS + HMAC webhook
        v
Node/TypeScript API
        |
        +--> PostgreSQL: alarms, recipients, users, devices, reads, delivery logs
        |
        +--> Expo Push Service
                |
                +--> FCM --> Android
                |
                +--> APNs --> iOS

Mobile app
        |
        +--> registers Expo token after login and on token changes
        +--> fetches alarm list and unread count
        +--> receives notification containing only alarmId
        +--> opens /alarms/:id
        +--> fetches protected details
        +--> marks read
        +--> refreshes badge from server count
```

This design is intentionally simple for version 1, but preserves the boundaries needed for production: durable alarms, authenticated access, idempotency, multi-device support, provider receipts, token cleanup, and a later migration path away from Expo Push Service if required.

---
---

# 開發歷程 / Development History

> **本節性質 / Nature of this section**
>
> 以上是 2026-08-11 由 JARVIS 產出的**原始建置規格**，保持原樣不修改。
> 以下是**實際開發的時間軸**：依日期記錄變更內容、當時的需求、以及偏離原規格的原因。本節只增補、不改寫既有條目。
>
> Everything above is the **original build specification** produced by JARVIS on 2026-08-11 and is preserved unmodified.
> What follows is the **actual development timeline**: dated entries recording what changed, the requests as they were made, and why the implementation departs from the specification above. Entries are appended, never rewritten.
>
> 分析性摘要見 `discussion_summary_0811.md` Part II；本節為時間軸。
> For the analytical summary see `discussion_summary_0811.md` Part II; this section is the timeline.

---

## 2026-08-11 — 需求釐清：從「直接建置」改為「先建模擬實驗室」
## 2026-08-11 — Requirement clarified: simulation lab before production build

### 使用者需求（原文）/ The request, as made

> 「請幫我開發，這個 server & Mobile APP（先做 android 版，確認無誤後，再移植到 ios 版）。做一個網頁，可以讓我模擬當告警成立時，operation 網頁會記錄並顯示，且系統觸發 notification，發送告警訊息到 mobile app。這個網頁，能讓我模擬整個過程，確認這是可行的（因此要作 operation server、operation 網頁、手機模擬器）。這網頁模擬完成後，我就會將它正式與客戶的 operation server 整合一起，手機模擬器也變成一個真正在 Android、iOS 上架的 app，變成一個正式的方案。」

### 影響 / Impact

**中文：** 這改變了整個專案的形狀。原規格（上方 §15）假設直接建置正式系統並以 Expo Push Service 發送推播；新需求則要求先建一座**可觀察、可重現的模擬實驗室**，證明可行性之後再替換兩端。

由此確立了貫穿全部設計的核心約束：

> **凡是 Phase A（模擬）專屬的東西，都必須被隔離在明確的介面之後，否則 Phase B（正式）會變成重寫而不是替換。**

**English:** This reshaped the project. The original specification (§15 above) assumed a direct production build using Expo Push Service. The new requirement is a **observable, reproducible simulation lab** first, proving feasibility before swapping both ends.

This established the constraint governing every subsequent decision:

> **Anything specific to Phase A (simulation) must sit behind an explicit interface, or Phase B (production) becomes a rewrite rather than a swap.**

### 與原規格的偏離 / Deviations from the specification above

| 原規格 Specification | 實作 As built | 原因 Reason |
|---|---|---|
| PostgreSQL（§2.2、§6 Docker Compose）| **SQLite**（Prisma，`better-sqlite3`）| 本機無 Docker。Schema 刻意不使用 `enum`、`Json`、`@db.Uuid`，改以 TEXT + Zod 聯集驗證，使切換至 PostgreSQL 只需更換 datasource 並重新產生 migration，**應用程式碼零修改**。所有 UNIQUE 約束與索引與原設計一致，沒有為了 SQLite 便利而放寬任何一項。<br>No Docker locally. The schema deliberately avoids `enum`, `Json` and `@db.Uuid`, using TEXT plus Zod unions instead, so switching to PostgreSQL is a datasource change and a fresh migration with **zero application code changes**. Every UNIQUE constraint and index matches the original design; none were relaxed for SQLite's convenience. |
| Expo Push Service（§2.4）| **`PushProvider` 介面 + `SimulatorPushProvider`**（WebSocket）| Phase A 需要可觀察、可重現的傳輸層。Expo 在 Phase B 只需新增一個實作類別。<br>Phase A needs an observable, reproducible transport. Expo becomes one more implementation class in Phase B. |
| 單一 webhook 格式（§7.4）| **來源格式轉接層**（`standard` + `legacy-ops-v1`）| 原規格 §17 Q1–Q2「客戶的實際事件格式為何」至今未答。加入轉接層使該答案到位時只需新增一個檔案，不必修改告警管線。<br>§17 Q1–Q2 (the customer's actual event format) remain unanswered. The adapter layer means the answer, when it arrives, is a new file rather than a change to the alarm pipeline. |
| 無模擬來源 No simulated source | **`apps/ops-server` 獨立行程 separate process** | 同行程呼叫無法驗證 HMAC、header 傳遞與 raw-body 驗簽 —— 而那正是到客戶現場最易失敗的部分。<br>An in-process call cannot exercise HMAC, header propagation or raw-body verification — precisely what breaks at a customer site. |
| `expoToken` 欄位（§4.2）| **`pushToken`** | 欄位命名保持供應商中立，使 Phase B 遷移不需資料庫變更。<br>Provider-neutral naming so the Phase B migration needs no schema change. |

---

## 2026-08-11 — P0：骨架 / Skeleton

建立 monorepo（`apps/api`、`apps/ops-server`、`packages/contracts`）、Prisma schema 與首次 migration、seed 資料、健康檢查端點、Zod 環境設定驗證、pino 結構化日誌（含 token 遮蔽）、統一的 `{data, error}` 回應信封。

Established the monorepo, the Prisma schema and first migration, seed data, a health endpoint, Zod-validated environment configuration, structured pino logging with token redaction, and the uniform `{data, error}` response envelope.

---

## 2026-08-11 — P1：通知後端核心 / Notification API core

**交付 Delivered:** 認證（JWT + Argon2id、refresh token 輪替）、裝置註冊（token 跨帳號改綁）、告警 API（cursor 分頁、逐人已讀）、HMAC webhook（轉接層 + 核心兩層、雙層去重）。

Auth (JWT + Argon2id, rotating refresh tokens), device registration with cross-account token reassignment, the alarm API (cursor pagination, per-user read state), and the HMAC webhook (adapter + core layers, dual deduplication).

**測試 Tests:** 77 個 / 6 檔案 — 77 across 6 files.

### 此階段的關鍵實作決定 / Key implementation decisions

| 決定 Decision | 理由 Rationale |
|---|---|
| 「別人的告警」與「不存在的告警」回應**完全相同**（狀態碼、錯誤碼、訊息三者）<br>Another user's alarm and a nonexistent one return byte-identical responses | 回 403 等於確認該告警存在。測試逐欄比對三者，任何人日後把訊息寫得「更有幫助」都會讓測試變紅。<br>A 403 confirms the alarm exists. The test compares all three fields, so any future "more helpful" message turns it red. |
| refresh token 以 SHA-256 儲存，且**輪替**（用過即失效）<br>Refresh tokens stored as SHA-256 and rotated | token 是 48 bytes CSPRNG 輸出，無低熵秘密需要慢雜湊；輪替使被竊 token 最多只能用一次。<br>The token is 48 bytes of CSPRNG output — nothing low-entropy to slow-hash — and rotation limits a stolen token to a single use. |
| 未知帳號與密碼錯誤**回應相同且耗時相近**<br>Unknown account and wrong password respond identically and in comparable time | 避免帳號列舉。未知帳號時仍執行一次假的密碼驗證。<br>Prevents account enumeration; a dummy verification runs for unknown accounts. |
| HMAC 對**原始位元組**驗簽<br>HMAC over raw bytes | 對重新序列化的 JSON 簽章必定失敗（§11 陷阱 13）。已寫成會失敗的測試。<br>Signing re-serialised JSON always fails (§11 trap 13); written as a test that proves it. |

---

## 2026-08-11 — 設計討論：送達確認與群組語意
## 2026-08-11 — Design discussion: acknowledgement and group semantics

### 使用者提問（原文）/ The question, as asked

> 「你是指推送 notification 給個人，3 single person（assume A, B, C）？若是這樣的話，送給 A 時，可以收到一個從 A ack 回來的信號嗎？若可以的話，這樣就知道誰有收到、誰沒有。若這 3 人是一個群組，則將群組成是一個人，只要推給他，他有回 ack，就完成整個程序。這樣的想法是對的嗎？」

### 討論結論 / Outcome

**中文：** 這個提問區分出兩個原本被混為一談的失敗點 —— **定址失敗**（收件人對應不到帳號，推播根本無從發生）與**送達失敗**（推播發出但未確認）。ack 機制解決後者，但無法解決前者。

然而使用者的 ack 構想**推翻了原本的部分收件人政策**：原先「整筆拒絕」的唯一理由是部分成功會靜默；一旦建立逐人帳本使失敗可見，該理由即不成立。

「群組當一個人」的構想經評估後**未採用**，列出五個弱點（責任分散、ack≠已處理、失去逐人視角、成員變動未快照、升級無處可去），改採**兩層分離**：政策層決定結案條件，帳本層永遠逐人逐裝置記錄。

**English:** The question separated two failure points that had been conflated — **addressing failure** (a recipient that maps to no account, so no push can occur) and **delivery failure** (a push sent but unconfirmed). Acknowledgement solves the latter, not the former.

The acknowledgement proposal nonetheless **overturned the existing partial-recipient policy**: the sole justification for rejecting the whole webhook was that partial success is silent; a per-recipient ledger removes that.

Group-as-one-recipient was **not adopted**, with five weaknesses recorded. A **two-layer split** was adopted instead: a policy layer decides what closes an alarm; the ledger layer always records per person and per device.

### 三項定案（改變資料模型，故於 P2 動工前決定）/ Three decisions (settled before P2 because they change the data model)

| # | 決策 Decision | 結果 Outcome |
|---|---|---|
| 1 | 部分收件人無效 Partial recipient failure | 由「整筆拒絕 400」改為「**建立告警、送達可送達者、其餘記錄為 `UNDELIVERABLE`**」<br>From reject-all to **accept, deliver to whoever is reachable, record the rest** |
| 2 | ack 深度 Acknowledgement depth | 做到**人 ack**，且 acknowledge（我看到了）與 resolve（已處理）**分成兩個狀態**<br>Human acknowledgement, with acknowledge and resolve as **distinct states** |
| 3 | 結案政策 Closure policy | v1 採 **ALL**（逐人追蹤、全員狀態各自可見），ANY_ONE 與升級留待政策層<br>v1 uses **ALL**; ANY_ONE and escalation are deferred to the policy layer |

**使用者另確認 / Also confirmed by the user:** SQLite 上的並發測試不等於 PostgreSQL 的保證，須列為「換 Postgres 後必須重測」。
The SQLite concurrency test is not a PostgreSQL guarantee and must be listed as requiring retest.

### 由此產生的 schema 變更 / Resulting schema changes

```prisma
model AlarmRecipient {           // 新增 / added
  state               String     // PENDING|DELIVERED|ACKED|RESOLVED|UNDELIVERABLE
  deliveredAt         DateTime?
  ackedAt             DateTime?  // 「我看到了」 I have seen this
  resolvedAt          DateTime?  // 「已處理完」 this has been dealt with
  undeliverableReason String?
}

model AlarmUnresolvedRecipient { // 全新資料表 / new table
  // 對應不到帳號的收件人。不能放進 alarm_recipients，因為沒有 user 可指向。
  // Recipients with no account — cannot live in alarm_recipients, no user to point at.
  identifier String
  reason     String              // UNKNOWN_USER | INACTIVE_USER
}

model PushDelivery {
  deviceConfirmedAt DateTime?    // ⚠ 僅模擬器可得 / SIMULATOR-ONLY
}
```

---

## 2026-08-11 — P2：推播抽象層與 ack 帳本 / Push abstraction and acknowledgement ledger

**交付 Delivered:** `PushProvider` 介面、`SimulatorPushProvider`（WebSocket）、逐人 ack 帳本與狀態機、ticket/receipt 生命週期、`DeviceNotRegistered` 死 token 清理、ack/resolve 端點、admin SSE 事件流與逐人送達帳本端點。

The `PushProvider` interface, `SimulatorPushProvider` over WebSocket, the per-recipient ledger and state machine, the ticket/receipt lifecycle, `DeviceNotRegistered` dead-token cleanup, acknowledge/resolve endpoints, and the admin SSE stream plus ledger endpoint.

**測試 Tests:** 108 個 / 9 檔案 — 108 across 9 files（含真實 HTTP + 真實 WebSocket 的完整旅程測試 / including a full journey over real HTTP and a real WebSocket）。

### 新增的兩個送達狀態 / Two delivery states added beyond the specification

| 狀態 Status | 意義 Meaning | 為何加入 Why added |
|---|---|---|
| `DEVICE_CONFIRMED` | 手機本身確認收到 The handset itself confirmed | 模擬器的 WebSocket 能提供此證據；**FCM/APNs 不能**，故明確標示為模擬器專屬。<br>The simulator's WebSocket can prove this; **FCM/APNs cannot**, hence the explicit simulator-only marking. |
| `SUPPRESSED` | 到達裝置但系統未顯示 Arrived but the OS did not display it | 模擬 Android 13+ `POST_NOTIFICATIONS` 遭拒（§11 陷阱 9）。這是全系統最有說服力的一格：**確定送達、確定沒被看到** —— 單看送達報告會被算成成功。<br>Models an Android 13+ `POST_NOTIFICATIONS` denial. The sharpest state in the system: **provably arrived, provably unseen** — a delivery report alone would score it a success. |

### ⚠ 必須寫入 Phase B 的三條規則 / Three rules that must survive into Phase B

1. **`DEVICE_CONFIRMED` 在 Phase B 永遠不會亮。** 換到 FCM/APNs 後，裝置收到與否只能靠 App 自行回報；iOS 靜默推播從不保證送達，Android OEM 省電機制會殺背景 App。**任何依賴這一格的邏輯都會靜默停止運作。**
   **`DEVICE_CONFIRMED` will never light up in Phase B.** After the swap, device receipt can only come from the app itself. **Any logic depending on this column stops working silently.**
2. **ack 沒回來 ≠ 沒送到。** 逾時要**升級（escalate）**，不是重推（retry）—— 否則訊號不良時會瘋狂重送。
   **A missing acknowledgement is not proof of non-delivery.** Escalate on timeout; never retry harder.
3. **ticket ≠ 送達，receipt ≠ 人看到了。** 只有人的 ack 是真憑證。
   **A ticket is not a delivery and a receipt is not "the person saw it".** Only a human acknowledgement proves that.

上述警告已寫入三處程式碼註解：`notifications/provider.ts`、schema 的 `deviceConfirmedAt` 欄位、`notifications/receipts.ts` 的狀態轉換處。
These warnings are embedded in three code comments so whoever implements Phase B cannot miss them.

---

## 2026-08-11 — P3：模擬營運伺服器 / Simulated operations server

**交付 Delivered:** 獨立行程（:4000）、6 個真實情境目錄、伺服器自有事件記錄、HMAC 簽章、故障注入（錯誤簽章 / 無簽章）、感測器抖動示範、legacy 格式觸發。

A separate process on :4000, a six-scenario catalogue, the server's own event log, HMAC signing, fault injection (invalid / missing signature), the flapping-sensor demonstration, and legacy-format triggering.

**測試 Tests:** 143 個 / 11 檔案 — 143 across 11 files。

### 設計要點 / Design notes

- **獨立行程是刻意的。** 同行程呼叫無法驗證 HMAC、header 傳遞與 raw-body 驗簽 —— 那正是到客戶現場最易失敗的部分。
  **The separate process is deliberate**: an in-process call cannot exercise the parts most likely to break at a customer site.
- **伺服器保有自己的事件記錄。** 營運端必須能獨立回答「我們送了什麼、對方怎麼回」，不依賴通知系統的資料庫。若唯一紀錄只存在下游，被拒絕的 webhook 將在營運團隊看得到的地方**不留任何痕跡**。
  **The server keeps its own event log.** Operations must be able to answer "what did we send and what did they say" without access to the notification database — otherwise a rejected webhook leaves no trace anywhere they can see.
- **消防情境刻意不去重。** 第二次氣體釋放是全新的緊急事件，折疊掉會藏起真正的災難。
  **The fire-suppression scenario is deliberately not deduplicated**: a second discharge is a new emergency, not a repeat.
- **去重鍵的價值可量化。** 抖動 6 次：有去重鍵 → 手機響 1 次；無去重鍵 → 響 6 次（§11 陷阱 2 的實證）。
  **The dedup key's value is quantified**: six flaps become one buzz with a key, six without.

---

## 2026-08-11 — 實作中發現的設計問題與修復
## 2026-08-11 — Design defects found during implementation, and their fixes

> 以下每一項都**不是原規格預見的**，而是動手寫程式或跑測試時才浮現。完整分析見 `discussion_summary_0811.md` §II.5。
>
> None of these were anticipated by the specification above; each surfaced only while implementing or testing. Full analysis in `discussion_summary_0811.md` §II.5.

| # | 問題 Defect | 嚴重度 Severity | 修復 Fix | 加上的防護 Guard added |
|---|---|---|---|---|
| **D-1** | `makeSimulatorPushToken()` 會產出 `isSimulatorPushToken()` 拒絕的 token（標籤含空格時）。**建構函式可以產出自己驗證器會拒絕的值。**<br>The constructor could emit a token its own validator rejects. | 🔴 高 High | 改為 slugify；無可用字元時**拋錯**而非回傳 `SimulatorPushToken[]`<br>Slugifies; **throws** rather than emitting an invalid token | `unit/push-token.test.ts` 26 個 round-trip 測試<br>26 round-trip tests |
| **D-2** | 測試輔助函式呼叫裝置註冊但**未斷言回應狀態**，吞掉 D-1 的 400 錯誤<br>A test helper never checked the registration response, swallowing D-1's 400 | 🟠 中 Medium | 註冊失敗直接拋出，附狀態碼與內容<br>Throws on non-200 with status and body | 同上 Same |
| **D-3** | 測試共用資料庫，5 分鐘去重桶跨測試污染，導致抖動測試建立 0 則告警<br>A shared test database let the five-minute dedup bucket leak across tests | 🟠 中 Medium | `beforeEach` 清除 `alarms` 與 `webhook_events`<br>`beforeEach` clears both tables | — |
| **D-4** | 具體 pino 型別特化 Fastify logger 泛型，導致約 20 個路由註冊型別錯誤<br>A concrete pino type specialised Fastify's logger generic, breaking ~20 route registrars | 🟡 低 Low | 在**單一源頭**放寬為 `FastifyBaseLogger`，而非在 20 個檔案重複標註<br>Widened at the single source rather than annotating 20 files | typecheck |
| **D-5** | 日誌遮蔽把**刻意保留的 token 指紋**也蓋成 `[REDACTED]`<br>Redaction blanked the intentionally-truncated fingerprint too | 🟡 低 Low | 改鍵名為 `pushTokenFp`，並註明為何不能叫 `pushToken`<br>Renamed to `pushTokenFp` with an explanatory comment | `unit/logger.test.ts` |
| **D-6** | 政策改變後 `UNKNOWN_RECIPIENT` 成為死錯誤碼，仍留在契約中<br>`UNKNOWN_RECIPIENT` became unreachable after Decision 1 but remained in the contracts | 🟡 低 Low | 從 `contracts/common.ts` 與 `lib/errors.ts` 移除<br>Removed from both | — |
| **D-7** | 兩份設定 schema 缺少 `silent` 日誌等級，測試輸出淹沒斷言失敗<br>Both config schemas lacked a `silent` log level | 🟡 低 Low | 兩個 workspace 的 `LOG_LEVEL` enum 補上 `silent`<br>Added to both enums | — |
| **D-8** | ops-server 用 `import.meta.url` 比對判斷是否被直接執行，脆弱難懂<br>An over-clever entry-point guard | 🟡 低 Low | 拆為 `server.ts`（建構）+ `main.ts`（啟動），與 api 一致<br>Split into `server.ts` and `main.ts`, matching the API | typecheck |

### D-1 為何列為高嚴重度 / Why D-1 is rated high

**中文：** 它的失敗模式是**靜默的，而且讓測試因為錯誤的理由變綠**。裝置註冊回 400 → 沒有裝置 → 告警仍被接受（收件人數 = 1）→ 收件人被標為「無裝置可送達」→ 所有「沒有推播到達」的斷言全部通過。**安全測試看起來是綠的，但它實際證明的是「推播從來沒通過」。** 若未察覺，整個 P3 的安全驗證都會是假的。

**English:** Its failure mode was **silent and turned tests green for the wrong reason**. Registration 400'd → no device → the alarm was still accepted → the recipient was marked undeliverable → every "no push arrived" assertion passed. **The security tests looked green while actually proving that push never worked at all.** Undetected, the entire P3 security verification would have been worthless.

---

## 2026-08-12 — 文件規範釐清與回寫
## 2026-08-12 — Documentation convention clarified and applied

### 使用者提問 / The question, as asked

> 「你知道 我在每個 project 都有自己的 PROMPT.md & README.md，這兩個文件的定義是什麼?」

### 結果 / Outcome

釐清了兩份文件的分工，並據此重寫：

| 檔案 | 回答的問題 |
|---|---|
| **README.md** | 「這個專案是怎麼走到今天這樣的？」 |
| **PROMPT.md** | 「只讀這份檔案，能不能重建出一模一樣的東西？」 |

**本檔案開頭新增了閱讀導讀**，標明原始建置規格區段僅供歷史參考、現行規格請看 `PROMPT.md`。原規格逐字保留未動；`requirement/` 內的原始輸入亦完全未動。

同時將此規範回寫至全域 `~/.claude/CLAUDE.md`，新增四條（其中三條來自當天實際踩到的錯）：轉寫規則（**絕不寫出未查證的數字**）、不用行號做交叉引用、繼承內容的處理、互相參照不重複。

Clarified the split, added a reading guide, and wrote the convention back into the
global CLAUDE.md — three of the four new rules came from mistakes made that day.

---

## 2026-08-12 — P4：三欄模擬網頁 / Three-column simulation console

**交付 Delivered:** `apps/web`（Vite + React 19 + TypeScript，:5173）—— 營運事件觸發台、伺服器事件流（SSE）、逐人送達帳本、兩支 WebSocket 手機模擬器。

### 在真實瀏覽器中驗證的場景 / Scenarios verified in a real browser

| 場景 | 結果 |
|---|---|
| 觸發告警 | `webhook_received → alarm_created → push_ticket_accepted ×2 → push_receipt_delivered ×2`，兩支手機都收到，帳本 `DEVICE_CONFIRMED` |
| 簽章 invalid | `REJECTED` / HTTP 401 / `INVALID_SIGNATURE`，**通知數 4→4，零新推播** |
| 感測器抖動 ×6 | 送出 6 · 建立 1 · 攔截 5，每支手機只多一則通知 |
| 拒絕通知權限 | 裝置 `SUPPRESSED/PERMISSION_DENIED`，手機顯示「系統攔截，使用者從未看到」 |
| 開啟 → ack | 人變 `ACKED`，時間軸顯示「送達 → 已看到」兩個時間點 |

### ⚠ 未能驗證的部分 / What could NOT be verified

**真人滑鼠點擊未經測試。** Browser pane 未顯示、頁面不合成畫面，CDP 合成滑鼠事件無法命中元素，所有互動是以頁內事件驅動的。**應用邏輯已驗證，「真人用滑鼠點」未驗證。**

Real mouse clicks were not exercised: the browser pane was not compositing, so
synthetic CDP mouse events could not hit elements. Application logic is verified;
human clicking is not.

---

## 2026-08-12 — P4 期間發現的設計問題與修復
## 2026-08-12 — Defects found during P4

> 前兩項**只有真實瀏覽器能揭露** —— 144 個測試全部測不到。
> The first two could only be revealed by a real browser; no test could catch them.

| # | 問題 Defect | 嚴重度 | 修復 Fix |
|---|---|---|---|
| **D-10** | 兩個 SSE 端點都用 `reply.raw.writeHead()` 接管原始 socket，**繞過 `@fastify/cors` 的 `onSend` 階段**，因此串流從未帶 `Access-Control-Allow-Origin`，瀏覽器一律靜默拒收<br>Both SSE endpoints bypassed the CORS plugin entirely | 🔴 高 | 新增 `lib/sse.ts`，明確寫出 CORS 標頭，且**只回應白名單內的 origin**（不用 `*`）|
| **D-11** | 被系統攔截的推播**仍把「人」推進成 `DELIVERED`** —— 因為模擬器回條同時帶 `deviceConfirmed: true` 與 `suppressedReason`，兩個判斷不互斥<br>A suppressed push still advanced the RECIPIENT | 🔴 高 | 改為 `deviceConfirmed && !suppressedReason`；人停在 `PENDING`，由裝置列說明原因 |
| **D-12** | `vite.config.ts` 缺 `envDir`，根目錄 `.env` 的三個 `VITE_*` **從未真的傳進前端**；因 fallback 恰好等於正確埠號而未爆<br>Root `.env` never reached the web app | 🟡 低 | 加上 `envDir` 指向 repo 根目錄 |

### D-10 的第一次修法是錯的 / The first fix for D-10 was wrong

最初嘗試把 `reply.getHeaders()` 展開進 `writeHead()`，**沒有作用** —— 因為 `onSend` 從未執行，那個時間點 reply 上根本還沒有 CORS 標頭。必須明確自行寫出。

The first attempt spread `reply.getHeaders()` into `writeHead()`. It did nothing:
`onSend` never runs, so the headers were not on the reply yet.

### D-11 為何是高嚴重度 / Why D-11 is rated high

**中文：** 經理的名字旁邊會顯示「已送達」，而他證實什麼都沒看到 —— 這恰好是整套系統存在的目的所在。`SUPPRESSED` 的全部價值就是區分「到達」與「被看到」，而人的狀態卻抹掉了這個區分。

既有的攔截測試**只斷言了裝置列**，從未斷言人的狀態 —— 這就是它存活的原因。已補上斷言，並新增一個「一支被攔截、一支正常送達」的混合測試（一支能用的手機就足以觸達本人）。

**English:** The person-level ledger said "delivered" beside a manager who
provably saw nothing — in exactly the case the system exists to expose. The
existing suppression test asserted only the device row, which is how it survived.

---

## 2026-08-12 — P6：補上流程的第 1 步（門檻評估與輪詢擷取）
## 2026-08-12 — P6: the missing first step — threshold evaluation and pull ingestion

### 使用者說明的真實流程 / The real flow, as described

> 「客戶會設定條件，例如『水溫 >30 黃燈 警告』『水溫 >50 紅燈 告警，必須緊急處理』，並將此結果寫到資料庫，並立 flag=1。flag=1 觸發 notification 程式，將此告警內容取出來變成訊息內容，傳給名單中的人。」

以及對收件人的說明：

> 「客戶、廠商都有自己的帳號可以進來此系統看系統的運作……因此每個帳號，都有手機的 token 資訊，依據該資訊一一傳送。」

### 這段話同時確認與推翻了什麼 / What it confirmed and what it overturned

| 先前的假設 | 使用者的說明 | 結果 |
|---|---|---|
| 收件人身分需要串接 AD / SSO | **帳號在我們系統裡，各自帶手機 token** | ✅ 現有 `users` + `devices` 設計已正確，未改動 |
| 來源系統會主動 POST webhook | **只寫入資料庫並立 flag** | ⚠️ 需新增**拉取式擷取**（原有 webhook 路徑保留）|

### 我原先低估的缺口 / The gap I had underestimated

使用者的一句反問點出了真正的問題：

> 「不然，你怎知道水溫 50 度跟 90 度的差別？」

模擬台的六個情境是**寫死的訊息字串**，不是被評估的條件 —— 裡面根本沒有「水溫」這個值。因此它演示不出流程的第 1 步，只能從「告警內容已經產生好了」開始。

The six scenarios were canned message strings, not evaluated conditions: there
was no reading anywhere, so the console could not show the first step at all.

### 交付 / Delivered

| 元件 | 內容 |
|---|---|
| `ops-server/sensors.ts` | 三個門檻感測器（水溫 30/50、機房溫度 28/40、水壓 7/9），讀值可調 |
| `ops-server/source-store.ts` | 模擬客戶的 `source_alarm_events` 表，含 `flag` 1→2 |
| `api/ingest/source-reader.ts` | `SourceEventReader` 擷取縫隙 + HTTP 實作 |
| `api/ingest/source-poller.ts` | 5 秒輪詢、收件人政策、韌性處理 |
| `api/webhooks/adapters/sensor-threshold-v1.ts` | 門檻表轉接器 |
| `web/SensorPanel.tsx` | 感測器滑桿 + 客戶資料庫檢視（看得到 flag 交接） |

**告警管線完全未動** —— 去重、帳本、推播、ack 全部沿用。

### 兩個關鍵設計選擇 / Two critical design choices

**① 去重鍵必須包含燈號。** 若不含 `level`，同一個 5 分鐘桶內從黃燈升級到紅燈會被當成黃燈的重複而**吞掉最需要送出的那一則**。已寫成測試鎖住。

**② 事件識別必須包含建立時間，不能只用主鍵。** 這是在瀏覽器實測時發現的 —— 見下方 D-13。

### 瀏覽器實測 / Verified in a real browser

```
水溫滑桿 24 → 35   → 黃燈成立 → 寫入 id=3 flag=1
                   → 5 秒內 flag→2、source_row_picked_up
                   → alarm_created → 兩支手機收到「水溫 黃燈警告（TANK-01）」

水溫滑桿 35 → 55   → 紅燈成立 → 寫入 id=4
                   → 兩支手機再收到「水溫 紅燈告警（TANK-01）」
                     ← 升級沒有被去重吃掉

帳本自動跟到最新告警，兩位收件人皆 DELIVERED
```

---

## 2026-08-12 — P6 期間發現的問題與修復

| # | 問題 Defect | 嚴重度 | 修復 |
|---|---|---|---|
| **D-13** | 事件識別只用來源主鍵（`row-1`）。ops-server 重啟後記憶體資料表的 **id 空間重置回 1**，新資料列與先前已擷取的 id 撞號，**兩筆真實告警被靜默判為重複、完全沒有通知**<br>A reset id space collided with previously-ingested ids | 🔴 高 | 識別改為 `row-{id}-{createdAt}`；兩者對同一列都穩定，但可免疫 id 空間重置 |
| **D-14** | 新增的 `source_*` 事件未加入網頁事件流的分組過濾，**取件那一刻在畫面上看不到** | 🟡 低 | 新增「取件 Source」分組 |
| **D-15** | 輪詢產生的告警不是點擊的結果，**帳本會一直空著**，手機卻在響 | 🟡 低 | 事件流自動跟隨最新 `alarm_created` |

### D-13 為何是高嚴重度 / Why D-13 is rated high

**中文：** 失敗是完全靜默的 —— 資料列成功寫入、成功取件、`flag` 正常變成 2，事件流也顯示 `source_row_picked_up`，看起來一切正常。**唯一的症狀是手機沒響。** 若不是在瀏覽器裡實際盯著手機面板，這個缺陷會直接活到正式環境。

在正式環境，客戶的表是持久的自增主鍵，id 不會重置 —— 所以這**原本是模擬器的產物**。但它暴露一個真實風險：**客戶若曾 truncate 或重建那張表，新告警就會被吃掉**。修掉它的成本只是鍵長一點，壓掉一則真實告警的代價高得多。

**English:** The failure was entirely silent — the row was written, collected,
and flagged, and the stream showed the pickup. The only symptom was that the
phones stayed quiet. In production the customer's id space does not reset, so
this began as a simulator artefact — but it exposes a real risk: a truncated or
recreated source table would silently swallow new alarms.

---

## 2026-08-13 — D-16：手機只顯示連線期間收到的推播（漏做第一條設計規則）
## 2026-08-13 — D-16: the handset showed only live pushes

### 使用者回報 / Reported

> 「我 click notification 小紅點，沒反應。應該要展開，看到 queue 在裡面的 11 個通知才對。」

附圖顯示紅點是 **11**，手機畫面卻寫「尚未收到通知」。

### 根因比「紅點不能點」嚴重得多 / The root cause was worse than an unclickable badge

紅點取的是**伺服器的未讀數**，而畫面上的托盤只顯示**這次 WebSocket 連線期間**收到的推播。重新載入頁面後托盤就空了，但伺服器仍有 11 則未讀。

**這代表本專案的第一條設計規則沒有被實作：**

> 推播是提示，資料庫才是真相 —— App 必須在啟動／前景化時重新拉取清單。

`phoneApi.listAlarms` 早就寫好了，**但從來沒有被呼叫過**。手機完全依賴 socket 上收到的東西 —— 正是這條規則要防的失敗模式。若照此上線，任何一次推播遺失都會變成**永久看不到的告警**。

`phoneApi.listAlarms` existed but was never called: the handset depended entirely
on what arrived over the socket, which is precisely the failure the rule exists
to prevent.

### 修復 / Fix

| 變更 | 內容 |
|---|---|
| 手機分成兩個檢視 | **通知欄**（socket 收到的）與**收件匣**（`GET /v1/alarms`）|
| 拉取時機 | 登入連線後、**每次回到前景**、開啟／ack／resolve 之後 |
| 不一致變成可見 | 通知欄為空但未讀數不為零時，直接顯示「但收件匣有 N 則未讀 — 開啟」|
| 收件匣可操作 | 點開 → 走認證 API 取詳情 → 標已讀 → 可 ack / resolve |

**通知欄與收件匣刻意不合併** —— 兩者本來就會不一致，而那個不一致就是要展示的東西：**掉掉的推播不等於掉掉的告警**。

### 瀏覽器實測 / Verified in a real browser

```
重新載入後登入        通知欄：空 · 收件匣：11
                     畫面顯示「但收件匣有 11 則未讀 — 開啟」

開啟收件匣            11 則全部列出，11 則標為未讀
點開第一則            詳情自認證 API 取得：
                     「TANK-01 水溫 55°C，已超過紅燈門檻 50°C，須立即處理。」
                     未讀數 11 → 10，未讀標記同步

按「我看到了」        帳本 manager=ACKED、admin 仍 DELIVERED
                     事件流出現 alarm_acknowledged
```

---

## 2026-08-13 — 通知時間戳與待送佇列可視化
## 2026-08-13 — Notification timestamps and queue visibility

### 使用者需求 / Requested

> 「幫我將每個 notification，內容中加上 timestamp。內容中必須有該告警發生的時間及發送 notification 的時間。並且 server 要記錄該訊息何時？何人？打開閱讀(ack)。這樣的話，user 可以知道該告警是何時發生？user 何時收到通知？server 何時收到他的 ack。」

> 「在事件流中，我哪裡可以查到 queuedPushes（裝置離線時暫存的推播）？可以開一個欄位顯示該訊息，並讓我點進去查閱。」

### 先確認手上已有什麼 / What already existed

伺服器**早已記錄全部時間點**（`occurredAt`、`createdAt`、`sentAt`、`deviceConfirmedAt`、`AlarmRead.readAt` 含 userId、`ackedAt`、`resolvedAt`）。缺的是**兩件事**：

1. 這些時間**沒有出現在通知內容裡**
2. API **沒有把讀者本人的 ack 時間回傳給 App**，所以 App 無法顯示「伺服器何時收到我的 ack」

The server already recorded every timestamp; what was missing was putting them
in the notification content and returning the reader's own ack time to the app.

### 交付 / Delivered

| 項目 | 內容 |
|---|---|
| 通知內容 | body 第二行固定為 `發生 08/13 15:04:12 ｜ 發送 08/13 15:04:17 ｜ GMT+8` |
| 時區處理 | 以**該裝置註冊時回報的時區**渲染；壞時區退回伺服器時區而非拋錯；**一律標示時區** |
| `data` payload | 加入 `occurredAt`、`sentAt`（ISO），供 App 以讀者語系重繪 |
| 收件匣 | 顯示六個時間戳：發生／建立／送達／已讀／伺服器收到 ack／已處理 |
| 帳本 | 時間軸加入「開啟」（`AlarmRead.readAt`）—— 開啟與確認是**兩個不同的動作** |
| ⑥ 裝置與待送佇列 | 新面板：逐裝置顯示在線狀態、App 狀態、待送數，**可點進去看佇列內每一則的標題與時間** |

### 一個容易混淆、我在 UI 上明確分開的概念

| 概念 | 意義 |
|---|---|
| **待送 queued** | 供應商已接受，但手機當時不在線，**尚未抵達裝置** |
| **未讀 unread** | 已存進資料庫，**人還沒開啟** |

待送佇列是「ack 沒回來不等於訊息遺失」的**具體證據**。面板上永久顯示這句對照，避免把兩個數字當成同一件事。

### 瀏覽器實測 / Verified in a real browser

```
通知內容    PUMP-03 水壓 9.5bar，已超過紅燈門檻 9bar，須立即處理。
           發生 08/13 08:24:49 ｜ 發送 08/13 08:24:52 ｜ GMT+8
           本機收到 08:24:52

待送佇列    Pixel-8   manager@demo.local  在線  待送 0  BACKGROUND
           Galaxy-S24 admin@demo.local   離線  待送 5  TERMINATED
           點開後列出 6 則待送，各自帶 發生／發送 時間與 ticket、alarm id

收件匣      發生 08:25:10 · 建立 08:25:11 · 送達 08:25:16
           已讀 08:25:30 · 伺服器收到 ack 08:25:33 · 已處理 —

帳本        manager: 送達 08:25:16 / 開啟 08:25:30 / 已看到 08:25:33
```

### 兩個測試正確地攔住了這次改動 / Two tests caught the change

`push-delivery` 與 `end-to-end` 都斷言 payload 的 `data` **深度等於** `{type, alarmId}`。加入時間戳後它們紅了 —— 這是它們在做該做的事。

我**沒有放寬斷言**，而是改成鎖定**確切的鍵集合**：

```
expect(Object.keys(push.envelope.data).sort())
  .toEqual(["alarmId", "occurredAt", "sentAt", "type"]);
```

任何人日後多加一個欄位就會紅。時間戳是唯一的例外，因為它們不敏感，而且讀者在決定要不要開啟之前就需要它們。

---

## 2026-08-13 — 告警編號：設備-日期-序號
## 2026-08-13 — Alarm reference codes: device-date-sequence

### 山姆哥的要求（附截圖標註）/ The request, annotated on a screenshot

> 將告警編上編號 `設備名-日期-序號`，日期 `YYYYMMDD`，序號正整數從 01 開始，標示時為了美觀先取兩碼，但超過時可自動調整碼長（01, 99, 101, 199, 1001）。依據 device 不同獨立編號，例如 `TANK01`（拿掉 `TANK` 與 `01` 之間的 `-`），不同 device 序號獨立編列，每天凌晨 00:00 歸零重新計算。
>
> 例如：
> `"[CRITICAL] 水溫 紅燈告警 (TANK01-20260811-99)"`
> `"[CRITICAL] 水溫 紅燈告警 (TANK02-20260813-1001)"`
> `alarm-resolved, manager@demo.local 已將 "水溫 紅燈告警 (TANK01-20260811-99)" 標記為處理完成`

### 為什麼這件事有價值 / Why this matters

告警原本只有 UUID。對機器正確，對人無用 —— 沒有人會在凌晨三點的電話裡念 `9f2c1a7e-…`。編號是人**唸得出來、寫在交接單上、事後搜得到**的名字。

An alarm had only a UUID: correct for machines, useless on a phone call.

### 四個設計決定 / Four design decisions

**1. 每日歸零是「鍵」的結果，不是排程。**
`alarm_sequences` 以 `(device_key, date_key)` 為複合主鍵。跨過當地午夜後，新日期沒有對應列，第一則告警自然從 1 開始。

原本可以寫一個 00:00 的 cron 去清計數器 —— 那是一個**會在午夜、無聲地、正好在最要緊的那一晚失敗**的額外元件。鍵化之後，沒有任何東西需要在午夜執行。同一個性質也讓遲到事件安全：23:58 發生、00:05 才抵達的事件會接續**前一天**的號碼，而不是與之衝突。

The composite key *is* the reset — no job runs at midnight, so no job can fail there.

**2. 日期取自 `occurredAt`，不是當下時鐘。**
編號說的是水槽何時過熱，不是輪詢器何時取件。

**3. 時區是全系統唯一的，不隨讀者變化。**
這一點與通知內文的規則**刻意相反**，值得寫清楚：

| | 時區來源 | 為什麼 |
|---|---|---|
| 通知內文的時間 | 該台裝置回報的時區 | 讀者要判斷「現在是不是正在沸騰」，得看自己牆上的鐘 |
| 編號中的日期 | 全系統唯一 `ALARM_REFERENCE_TIMEZONE` | 編號是**共用的名字**。若隨讀者變化，同一則告警在台北叫 `…-20260813-01`、在倫敦叫 `…-20260812-01`，客戶與廠商無法討論同一件事 |

**時間是給個人讀的，編號是給大家共用的。**

**4. 重複事件不消耗號碼。**
配號在建立告警的同一個交易內、且在兩層去重**之後**。若抖動的感測器能消耗序號，一則真實告警在天亮前會把該裝置的編號推到 `…-40`，而那個數字會被讀成四十次事故。已寫成會斷言 `alarm_sequences.lastSeq` 的測試。

### 連字號必須移除 / The hyphen has to go

`TANK-01` → `TANK01` 不只是美觀。連字號是編號本身的分隔符：保留會產生 `TANK-01-20260813-01`，四段無法解析回去，**裝置從自己的編號裡變得不可復原**。

同時：**沒有**剝成 ASCII。`/[^\p{L}\p{N}]/gu` 只移除分隔符與標點，保留非拉丁字母（`水槽-01` → `水槽01`）。若剝成 ASCII，所有中文命名的裝置會塌縮成同一組計數器。

### 順帶移除了一處重複 / One duplication removed along the way

`sensor-threshold-v1` 的 title 原為 `水溫 紅燈告警（TANK-01）`。編號已含裝置，兩者併存會產生：

```
水溫 紅燈告警（TANK-01）(TANK01-20260813-07)
```

同一個事實、兩種寫法，讀者會開始懷疑它們是否不同。因此 title 改為 `水溫 紅燈告警`，裝置由編號承載。輪詢器的 `source_row_picked_up` 訊息則**明確補上 `deviceId`** —— 取件發生在配號之前，那一行還沒有編號可用。

### 一個測試正確地攔住了我 / A test correctly caught me

`source-poller.test.ts` 斷言 `alarm.title` 含 `TANK-01`。裝置移出 title 後它紅了。

那個斷言的**意圖**（讀者必須能分辨是哪一個水槽）仍然成立，所以我把它**移到編號上**而不是刪掉：

```
expect(alarm.reference).toMatch(/^TANK01-\d{8}-\d{2,}$/);
expect(formatAlarmLabel(alarm.title, alarm.reference)).toContain("TANK01");
```

「無法追溯到裝置的告警」正是那一行當初要防的缺陷。

### 自己寫出來、又自己抓到的一個錯 / A bug I introduced and then caught

營運伺服器那側的 note 一開始輸出：

```
告警 OPERATIONSSERVER-20260813-01已建立並派送給 1 位收件人。
                                ↑ 少一個空格
```

原因是我把「有編號」與「沒有編號」兩種前綴寫成 `告警 ${reference}` 與 `告警`，卻在使用端直接接 `已建立` —— 有編號時少了分隔，把空格加在使用端則會讓沒編號時變成 `告警 已建立`。

修法是**讓分隔符屬於片語本身**（`告警 ${reference} ` 帶尾隨空格）。這種錯誤「讀起來夠順，足以通過審閱」，但會出現在操作人員讀到的每一行，所以補了一個**明確斷言空格**的測試 —— 只斷言 `toContain(reference)` 是抓不到它的。

A missing separator: readable enough to survive review, wrong in every line an operator ever reads. Now asserted explicitly, since `toContain(code)` cannot catch it.

### 舊告警不回填 / Old alarms are not backfilled

`reference` 可為 null，migration **沒有**回填。本方案之前建立的告警從未被配號，現在捏一個給它們，等於把一個**會被引用、卻對不到任何東西**的字串寫進稽核軌跡。它們顯示裸標題。

### 實測輸出 / Verified output

真實瀏覽器、三個伺服器、走完整條路徑（拖感測器 → 客戶資料庫 flag=1 → 5 秒輪詢 → 配號 → 推播 → 手機 → ack/resolve）：

```
事件流 event stream
  alarm_created       [WARNING]  水溫 黃燈警告 (TANK01-20260813-01)
  alarm_created       [CRITICAL] 水溫 紅燈告警 (TANK01-20260813-02)
  alarm_created       [CRITICAL] 機房溫度 紅燈告警 (ROOMR12-20260813-01)
  alarm_created       [CRITICAL] 水壓 紅燈告警 (PUMP03-20260813-01)
  alarm_read          manager@demo.local 已開啟告警「水溫 紅燈告警 (TANK01-20260813-02)」
  alarm_acknowledged  manager@demo.local 已確認收到告警「水溫 紅燈告警 (TANK01-20260813-02)」
  alarm_resolved      manager@demo.local 已將告警「水溫 紅燈告警 (TANK01-20260813-02)」標記為處理完成
  alarm_duplicate     dedupKey 命中既有告警 水溫 紅燈告警 (TANK01-20260813-02)，未重複通知
                      ← 去重後編號仍是 02，沒有被消耗掉

手機通知欄 lock-screen tray
  [CRITICAL] 機房溫度 紅燈告警 (ROOMR12-20260813-03)
  ROOM-R12 機房溫度 50°C，已超過紅燈門檻 40°C，須立即處理。
  發生 08/13 15:27:29 ｜ 發送 08/13 15:27:29 ｜ GMT+8

收件匣 inbox（標題與編號分行）
  機房溫度 紅燈告警 / ROOMR12-20260813-03
  機房溫度 黃燈警告 / ROOMR12-20260813-02
  水溫 黃燈警告   / TANK01-20260813-03      ← 三台裝置各自獨立編號
  水壓 紅燈告警   / PUMP03-20260813-01

舊告警 pre-numbering alarms
  WAN 主線路狀態不穩 / （無編號，無佔位符）
```

`TANK01` 走到 03、`ROOMR12` 走到 03、`PUMP03` 停在 01 —— 三個計數器互不影響，這正是「依 device 獨立編列」。

### 尚未做的 / Not done

* **沒有**依編號搜尋的端點。`parseAlarmReference()` 已可解析，但沒有 `GET /v1/alarms?reference=`；目前只能拿它在事件流與日誌裡 grep。
* **併發配號只在 SQLite 上被證明過。** SQLite 是單寫入者，交易由檔案鎖序列化。PostgreSQL 上 Prisma 的 `upsert` 會編譯成 `INSERT … ON CONFLICT DO UPDATE`（原子），但我沒有實測 —— 與併發去重的重測列為同一項上線前待辦。

---

## 2026-08-13 — 無裝置告警的編號改為 SYS_Manual_Test
## 2026-08-13 — Device-less alarms renamed to SYS_Manual_Test

### 山姆哥的要求 / The request

> 順帶一提：console 手動觸發的情境沒有 deviceId，會退回 source 名稱變成 `OPERATIONSSERVER-20260813-02` >>> 要改成 `SYS_Manual_Test`

### 改了什麼 / What changed

`deviceKeyForAlarm()` 不再由 source 名稱推導退回鍵，改為常數 `SYS_Manual_Test`：

```
之前 before:  OPERATIONSSERVER-20260813-02
之後 after:   SYS_Manual_Test-20260813-01
```

移除 source 推導沒有損失資訊 —— 是哪個系統發出的，`Alarm.source` 已經記錄，帳本與收件匣都看得到。`deviceKeyForAlarm()` 與 `allocateAlarmReference()` 的 `source` 參數因此一併移除，不留無用引數。

### 這個鍵的形狀本身在傳遞訊息 / The key's shape carries meaning

`SYS_Manual_Test` **混合大小寫、含底線** —— 而 `normaliseDeviceKey()` 會轉大寫並移除底線，所以**任何真實裝置 id 都不可能正規化成這個鍵**。

讀者一眼就能分辨「這則告警沒有指定裝置」與「有一台叫 SYS 的設備」。已寫成測試，以 `SYS_Manual_Test`、`sys-manual-test`、`SYS Manual Test` 三種寫法斷言不會碰撞。

### 一個會無聲失敗的陷阱 / A trap that would have failed silently

退回鍵含底線，而我原本的解析器字元集是 `[\p{L}\p{N}]` —— **不收底線**。

如果沒發現：`composeAlarmReference()` 照樣產生 `SYS_Manual_Test-20260813-01`（組合端不檢查字元集），但 `parseAlarmReference()` 會對它回傳 `null`。**每一則無裝置告警的編號都變成不可讀，而所有顯示看起來完全正常** —— 直到有人想用編號回查。

修法是讓第一段接受 `_`（底線安全，正因為它不是 `-` 分隔符），並補上一個明確的 round-trip 測試：解析器**必須**能讀回自己的退回鍵。

### 我自己的正則又出手擋了自己一次 / My own regex bit me again

`ops-server.test.ts` 裡我上一輪寫的斷言是手抄的格式：

```
expect(...reference).toMatch(/^[A-Z0-9]+-\d{8}-\d{2,}$/);
```

退回鍵一加底線它就紅了 —— 但**沒有任何東西真的壞掉**，只是我在測試裡複製了一份格式定義，然後它漂移了。改成呼叫真正的 `parseAlarmReference()`：格式只有一個定義處，測試不再自帶一份會過期的副本。

### 一個必須說清楚的風險 / One risk worth stating

**這個鍵同時斷言「這是人工測試」。** 對今天所有會走到它的呼叫者都成立 —— 只有模擬網頁手動觸發的情境不帶 deviceId，感測器路徑一定帶。

但**如果 Phase B 出現真實來源合法地發出無裝置告警，這個鍵就變成謊言** —— 一則真實事故會被標記成人工測試，而那正是最容易被忽略的標籤。已記入 PROMPT.md §4.5 的警告區塊。

The key also asserts "manual test" — true for every caller today, but it would mislabel a real device-less alarm in Phase B, and "manual test" is precisely the label people ignore.

### 另外 / Also

改名不會搬動舊資料。`alarm_sequences` 中舊的 `OPERATIONSSERVER` 列還在，只是不再被使用；新鍵從 01 重新起算。這是鍵化計數器的正常行為。

### 實測 / Verified

真實 console 觸發路徑：

```
webhook 回應      "reference":"SYS_Manual_Test-20260813-01"
營運端自有紀錄     告警 SYS_Manual_Test-20260813-01 已建立並派送給 1 位收件人。
事件流            [CRITICAL] UPS 電池故障 (SYS_Manual_Test-20260813-01)
帳本標頭          SYS_Manual_Test-20260813-01
```

**213 測試 / 16 檔案通過**，typecheck 四個 workspace 全綠。

---

## 2026-08-13 — F-1：裝置識別改為宣告式契約；測試資料 3 天保留
## 2026-08-13 — F-1: device identity becomes a declared contract; 3-day retention

### F-1 —— 一個只會在接上真實資料時才發作的缺陷

在「要把這段 code 放進正式應用」之前的完整性檢查中發現的。編號的裝置來源原本是：

```ts
const raw = details.deviceId;   // details: Record<string, unknown>
```

**`details` 是自由格式的袋子，編譯器完全不會提醒你這個欄位存在。**

而且這個缺陷**已經在畫面上發生過了，只是被誤讀了**：`ops-server` 的情境用的是 `device: "UPS-2"`、`rack: "R12"`，那才是它們全部變成 `SYS_Manual_Test` 的真正原因 —— 不是「沒有裝置」，而是**欄位拼法不同**。

接上真實來源時，只要對方叫它 `device`、`equipment`、`assetId`、`tag`，或送**數字** `deviceId: 12345`：

* 不報錯、不寫 log
* 每則真實告警編為 `SYS_Manual_Test-…`
* **所有設備共用同一組計數器** →「今天這台響了幾次」直接失效
* 每則真實事故被貼上「人工測試」
* **編號依然格式正確**，所以沒有人會發現

我先前把它列為「Phase B 風險」，講得太輕：它不需要一個真的沒有裝置的來源，只需要一個欄位拼法不同的來源 —— 那幾乎是必然。

### 修法：把它變成編譯器管得到的東西

`NormalisedAlarmEvent.deviceId: string | null` —— **必填，刻意不設 optional。** 漏掉就是編譯錯誤，轉接器作者不可能略過這個問題。

三個轉接器各自明確對應：

| 轉接器 | 來源怎麼叫它 | 對應 |
|---|---|---|
| `sensor-threshold-v1` | `deviceId` | 直接帶過 |
| `standard` | 頂層 `deviceId`（新）／`details.deviceId`（舊慣例仍支援）| 兩者依序取 |
| `legacy-ops-v1` | 埋在 `meta`，名稱由廠商決定 | `meta.device` → `meta.equipment` → `meta.deviceId` |

`legacy-ops-v1` 那一行**就是這個修正的示範**：一個沒有 `deviceId` 欄位的格式，把裝置藏在 `meta` 裡用自己的名字 —— 對應它，正是轉接層存在的全部意義。

新增 `coerceDeviceId()`：接受 string / number / bigint，其餘回 `null`。數字資產編號極為常見，拒收它們會讓整個來源掉進退回鍵；但它**不會**把物件硬轉成 `[object Object]`。

**改完之後 typecheck 只有測試檔壞掉，production 程式碼全部通過** —— 因為三個轉接器都已經明確設定了這個欄位。那正是把它變成必填要達成的效果。

> 注意：console 手動觸發的情境**行為不變**，仍然是 `SYS_Manual_Test`（那是你要的）。F-1 改變的是**接上真實來源之後**會發生什麼。

### 測試資料 3 天保留 —— 做行為，不只做標籤

你要求把「測試資料只保留最近 3 天內的資訊與紀錄」放在標題後面。**我把它實作成真的會刪，而不是只顯示。**

理由很直接：一個宣告了保留政策卻沒人執行的介面，**正是這個 session 花了很久從備份文件裡清掉的那種缺陷**。三個月後你看到那行字，會以為舊資料早就不在了。

| | 內容 | 理由 |
|---|---|---|
| **會刪** | `alarms`（依 `createdAt`）+ 其 cascade 子表 | 「資訊與紀錄」對看畫面的人就是「何時存下」|
| **會刪** | `webhook_events` | **不會 cascade** —— 指向告警的欄位是純 String 沒有外鍵，只刪告警會讓冪等表無限成長 |
| **不刪** | `alarm_sequences` | 刪掉計數器會讓下一則告警從 01 重來，**重發一個既有告警仍持有的編號** → 線上 ingest 撞 UNIQUE。為省幾十位元組不值得 |
| **不刪** | `users`、`devices` | 清掉經理的裝置註冊會讓他從此收不到告警 |

三個刻意的決定：

1. **`0` 代表停用，永遠不代表「全部刪除」。** 未設定的零，其破壞性解讀絕不能是意外發生的那一個。
2. **標題的數字不寫死。** 前端從 `GET /v1/admin/policy` 取得，與清除器讀同一份設定；API 沒回應就**整句不顯示** —— 誠實地不講，勝過講一個沒查證的數字。
3. **掃到 0 筆時不發事件。** 每小時一則「刪除 0 筆」會訓練操作者忽略它；但掃描**失敗**會發 `test_data_purge_failed`，因為一個悄悄停止運作的保留政策，是主控台仍在宣告的政策。

### 實測 / Verified

```
GET /v1/admin/policy
  {"testDataRetentionDays":3,"testDataRetentionSweepMs":3600000,
   "alarmReferenceTimezone":"Asia/Taipei"}

API 啟動日誌
  testDataRetention: "3 days, swept every 3600000ms"

標題列（真實瀏覽器）
  告警通知模擬台  測試資料只保留最近 3 天內的資訊與紀錄
  → margin-left 8px、11px、faint 色、nowrap、無水平溢位
```

**227 測試 / 17 檔案通過**（數字取自 vitest JSON reporter），typecheck 四個 workspace 全綠。

### 同時回報但未動手的 / Reported, not actioned

* **F-2 沒有版本控制** —— 你說整合前會先進 git。
* **F-3 `alarm_sequences` 無保留** —— 現在有了明確理由**不做**：見上表。

---

## 2026-08-13 — 整合前最終核對；文件漂移修正；一個跨專案的編碼缺陷
## 2026-08-13 — Final pre-integration re-check, doc drift corrected, and a cross-project encoding defect

### 你的要求 / What you asked

> 「我要將這段 code 加到我的應用中，所以在此之前，我必須確定他的完整性與最終良好的狀態」
> 三個任務：(1) A 部分的文件我已依序修改完畢，請檢查 (2) `Backup-ClaudeProject.ps1 -Trigger manual` 的錯誤訊息 (3) 處理 F-1、F-3。

F-1 與保留機制的實作內容見上一則條目，此處不重複；本條目記錄的是**核對本身的結果**。
The F-1 and retention work is the previous entry; this one records what the verification found.

### 1. 文件核對（跨專案：`Claude_Desk_APP_Backup`）/ Documentation check

先前回報的 5 處 Markdown 結構破損（表格被空行截斷、粗體不對稱、缺空行導致 `---` 變成 setext H2、孤兒表格列與註記黏成幻影第 4 欄、樹狀圖殘留條目）**全部修正正確**，兩處應刪除的不實設定確認已不存在。

僅剩一個外觀層級的小瑕疵，未動手：`BACKUP_README.md` 中兩行 `>` 引言現在相鄰，Markdown 會把它們算成同一段。要分開，中間插一行只有 `>` 的空引言列即可。
One cosmetic nit remains: two adjacent `>` lines merge into a single blockquote.

### 2. 備份腳本執行失敗 —— 是編碼缺陷，不是操作錯誤 / A BOM defect, not an operator error

錯誤訊息看起來像程式壞掉（8 個 parser error，從 `Unexpected token 'only'` 開始），實際成因是位元組層級的：

| 觀察 Observation | 值 Value |
|---|---|
| `Backup-ClaudeProject.ps1` 開頭 4 bytes | `23 20 3d 3d` → `# ==`，**沒有 BOM** |
| 第 149 行含 | `E2 80 94`（UTF-8 的破折號 `—`）|
| 全檔含非 ASCII 的行數 | **10 行** |
| 系統 ANSI codepage | **950（Big5）** |

**Windows PowerShell 5.1 讀取沒有 BOM 的腳本時，會用系統 ANSI codepage 解碼。** 該檔是 UTF-8，於是多位元組字元被 Big5 誤解，其中一個解出來的字元提前終止了字串字面值，`only` 之後的內容全部變成散落的 token —— 那八個錯誤是同一個原因的連鎖結果，不是八個問題。

> PowerShell 5.1 decodes BOM-less scripts with the system ANSI codepage (950 here). The file is UTF-8, so a multibyte character terminated a string literal early and every subsequent token cascaded.

兩種修法（皆已交付給你，未由我執行 —— 該路徑在專案邊界守衛之外）：
1. **立即可用：** 用機器上已安裝的 `pwsh 7.6.4` 執行 —— PowerShell 7 對無 BOM 檔案預設以 UTF-8 解碼。
2. **永久修法：** 先備份，再將檔案重存為 **UTF-8 with BOM**；之後 `powershell` 與 `pwsh` 皆可執行。

**附帶事實：** 這支腳本是該備份系統唯一還活著的元件，而 `backup_history.log` 顯示它自 2026-07-23 起未曾成功執行。先前每一次手動執行大概都撞上同一個錯誤。
The script is the backup system's only live component, and it has not run successfully since 2026-07-23.

> **為什麼記在這個專案的 README：** 這項發現屬於 `Claude_Desk_APP_Backup`，但**專案邊界守衛（project-boundary guard）阻擋本專案以外的所有寫入**，該處無法寫入。與其讓這個診斷只存在於一次對話裡，寧可記在能寫的地方並註明歸屬。
> Recorded here because the boundary guard blocks writes outside this project; the finding belongs to the backup project.

### 3. 本專案文件的漂移修正 / Doc drift found in this project

核對 PROMPT.md 時逐項對照磁碟，發現三處**規格與現況不符**（都是新增檔案後未同步造成）：

| 位置 | 錯誤 | 修正 |
|---|---|---|
| §2.3 目錄樹 | 缺 `src/maintenance/` | 補上 `retention.ts`（保留清除器）|
| §2.3 目錄樹 | `integration/ (9 檔)` | 更正為 **10 檔**（`retention.test.ts` 新增後未同步）|
| §4.6 結尾 | 連續兩條 `---` | 移除多餘的一條 |

同時逐一核對：§10.1 宣稱的 **27 個事件名稱**與 `packages/contracts/src/events.ts` 完全一致（實際數過，非估算）。

> 這正是「重建規格裡的一個未查證數字比省略它更糟」的實例：`(9 檔)` 讀起來完全合理，而按照它重建的人會少寫一個測試檔，且不會有任何徵兆。
> An unverified figure in a rebuild spec is worse than an omitted one, because it will be trusted.

### 實測狀態 / Verified state（2026-08-13，重跑非回憶）

```
vitest --reporter=json  numTotalTests 227 · numFailedTests 0 · 17 檔案（unit 7 + integration 10）
typecheck               四個 workspace 全綠
web production build    成功
GET /v1/admin/policy    {"testDataRetentionDays":3,"testDataRetentionSweepMs":3600000,
                         "alarmReferenceTimezone":"Asia/Taipei"}
標題列（真實瀏覽器）      告警通知模擬台  測試資料只保留最近 3 天內的資訊與紀錄
```

### 整合前仍在你手上的事 / Left with you before integration

1. **F-2：`git init`** —— 本專案仍無版本控制。你說整合前會先進 git。
2. **備份腳本重存為 UTF-8 with BOM**（或改用 `pwsh` 執行）。
3. 下方「⚠ 上線前必須處理」7 項**未因本次核對而減少** —— 完整性核對確認的是「現況與文件一致」，不是「可以上線」。
   The completeness check confirms the docs match reality; it does not clear the pre-production list.

---

## 目前狀態 / Current status（2026-08-13）

| 項目 Item | 狀態 Status |
|---|---|
| 測試 Tests | **227 通過 / 17 檔案** — 227 passing across 17 files（數字取自 vitest JSON reporter 實測，非估算）|
| 型別檢查 Typecheck | 四個 workspace 全綠 — clean across all four workspaces |
| 完成階段 Phases complete | P0〜P6 |
| Phase A | **功能完整，並涵蓋客戶流程的第 1 步** |
| 擷取方式 Ingestion | 推（webhook + HMAC）與拉（5 秒輪詢）兩種，共用同一條管線 |
| 告警編號 Reference codes | `裝置-YYYYMMDD-序號`，逐裝置獨立、每日歸零（歸零來自複合鍵，非排程）|
| 測試資料保留 Retention | **3 天，由 `maintenance/retention.ts` 實際執行**；標題列的數字取自 `GET /v1/admin/policy`，不寫死 |
| 版本控制 Version control | **仍未建立（F-2）** — not yet under git |
| 啟動 Run | `npm run dev` → api:3000 + ops:4000 + web:5173 |

### ⚠ 上線前必須處理 / Must be addressed before production

1. **`/v1/admin/*` 目前無認證。** 本機模擬可接受（操作台即自己的螢幕），任何超出 localhost 的部署**必須先加上管理員角色**。已於 `routes/admin.ts` 檔頭註明。
   **`/v1/admin/*` is unauthenticated.** Acceptable for a local simulation; any deployment beyond localhost must gate it behind an admin role first. Noted in the file header.
2. **換 PostgreSQL 後必須重測並發去重。** SQLite 是單寫入者模型，現有測試證明的是程式邏輯路徑正確（唯一索引攔截 + P2002 處理分支確實被執行），**不是** PostgreSQL 在真實併發下的行為。
   **Retest concurrent deduplication on PostgreSQL.** SQLite is single-writer; the existing test proves the code path, not PostgreSQL's behaviour under real concurrency.
   **同一項也包含編號的併發配號**（`alarm_sequences` 的 upsert-increment）—— 同樣只在 SQLite 的單寫入者模型下被證明過。
   This also covers concurrent reference allocation, proven only under SQLite's single-writer model.
3. **實作 `ExpoPushProvider` 並移除對 `DEVICE_CONFIRMED` 的依賴。**
   Implement `ExpoPushProvider` and remove any dependence on `DEVICE_CONFIRMED`.
4. **逾時升級政策層** —— 帳本已支援，政策尚未實作。
   The escalation policy layer — supported by the ledger, not yet implemented.
5. **Apple Developer Program 註冊**（約 US$99/年，需數日，會擋住 iOS 階段）。
   Apple Developer Program enrolment (~US$99/yr, takes days, blocks the iOS phase).
6. **`VITE_DEMO_PASSWORD` 絕不可進入正式建置。** Vite 會把所有 `VITE_*` 變數內聯進前端 bundle。
   Never ship `VITE_DEMO_PASSWORD`: Vite inlines every `VITE_*` into the client bundle.
7. **`/ws/device` 目前僅以 push token 認證**，Phase B 應改為 JWT。
   The device WebSocket authenticates on the push token alone; use a JWT in Phase B.

### 原規格 §17 中仍未回答的問題 / Still-unanswered questions from §17 above

以下答案會直接決定 Phase B 的轉接器與路由邏輯，目前以模擬值代替：
These determine the Phase B adapter and routing logic; simulated values stand in for now:

1. 客戶營運伺服器的實際事件格式為何？ / What exact event format does the customer's server produce?
2. 經理如何識別 —— email、員工編號、既有帳號 ID、或 SSO？ / How are managers identified?
3. 告警路由 —— 全員收到，還是依站點 / 團隊 / 角色？ / Routing — everyone, or by site / team / role?
4. 預期告警量與尖峰突發率？ / Expected alarm volume and peak burst rate?
5. 合規與資料保存要求？ / Compliance and data-retention requirements?
6. 真實來源是否會發出「沒有裝置」的告警？ / Does any real source raise device-less alarms?
   若會，退回鍵 `SYS_Manual_Test` 會把真實事故標記成人工測試。
   If so, the `SYS_Manual_Test` fallback key would mislabel a real incident as a test.
