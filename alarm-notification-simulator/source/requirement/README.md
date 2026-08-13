# APP_notification
Mobile APP with notification function

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
