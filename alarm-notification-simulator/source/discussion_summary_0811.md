# Conversation Summary — Mobile Notification System Research & Design

**Date:** 2026-08-11
**Participants:** User (building a mobile alarm-notification app) + JARVIS
**Deliverables produced:** `app_plan.md` (1604-line AI-executable build spec), `summary.md` (this file)

---

> ## 導讀 / Reading guide
>
> **本檔是 2026-08-11 當時的對話與設計快照，不是現行權威規格。** 之後的每一項變更（P4 模擬網頁、P6 門檻評估與輪詢擷取、通知時間戳、待送佇列可視化、告警編號）都**沒有**回寫到這裡，因此本檔的測試清單（§II.8）與待辦（§II.9）已過時。
>
> 保留未修改是刻意的：它是「當時討論了什麼、決定了什麼」的紀錄本身。
>
> * **現行行為與重建規格** → `PROMPT.md`
> * **開發歷程與每項決策的來由** → `README.md`
> * **未經修改的原始輸入** → `requirement/`
>
> **This file is a snapshot of the 2026-08-11 discussion, not the current spec.** Its test inventory and open items are out of date by design; see `PROMPT.md` for current behaviour and `README.md` for the timeline.

---

## Table of contents

1. [Conversation arc](#1-conversation-arc)
2. [Topic 1 — Free push notification solutions](#2-topic-1--free-push-notification-solutions)
3. [Topic 2 — Can notifications trigger calls?](#3-topic-2--can-notifications-trigger-calls)
4. [Topic 3 — Full system design for iOS + Android](#4-topic-3--full-system-design-for-ios--android)
5. [Topic 4 — Beginner path and the alarm use case](#5-topic-4--beginner-path-and-the-alarm-use-case)
6. [Verified facts reference](#6-verified-facts-reference)
7. [Corrections made during the conversation](#7-corrections-made-during-the-conversation)
8. [Claims that could NOT be verified](#8-claims-that-could-not-be-verified)
9. [Final recommended architecture](#9-final-recommended-architecture)
10. [Cost summary](#10-cost-summary)
11. [Known traps](#11-known-traps)
12. [Open questions for the user](#12-open-questions-for-the-user)
13. [Next actions](#13-next-actions)

---

## 1. Conversation arc

The discussion moved through four distinct phases, each narrowing scope:

| Phase | User question | Outcome |
|---|---|---|
| 1 | "What is a good and free notification solution?" | Comparison of 7 services; FCM recommended |
| 2 | "Do any of them have a call function? Can the user call back?" | No — push is transport only. Split into "dial-back" (easy) vs "in-app VoIP" (hard) |
| 3 | "Forget calling. Design this for iOS & Arduino [sic] as a senior engineer" | Clarified to iOS + Android. Full stack, schema, and architecture proposed |
| 4 | "I know nothing. Still React Native + Expo? What about the server? Here's my alarm use case" | Recommendation confirmed but **two corrections made**; produced `app_plan.md` |

A key characteristic of this conversation: **three rounds of independent verification** were run before presenting conclusions, and each round produced corrections to the draft answer. Those corrections are catalogued in [Section 7](#7-corrections-made-during-the-conversation).

---

## 2. Topic 1 — Free push notification solutions

### 2.1 Options reviewed

| Solution | Free? | Best for | Catch |
|---|---|---|---|
| **FCM (Firebase)** | Yes — messaging free, no volume cap | Own app, full control | You build token storage + send logic. Google dependency |
| **OneSignal** | Generous free tier | Dashboard, segments, scheduling, zero backend | Third party holds user data; tier limits change |
| **Expo Push** | Yes | React Native / Expo apps | Wraps FCM+APNs; Expo-only |
| **AWS SNS** | Free tier ~1M publishes/mo | Already on AWS | Clunky for mobile-specific features |
| **Novu** (OSS) | Free self-hosted | Multi-channel (push + email + SMS + in-app) | You run the infra |
| **ntfy** (OSS) | Free self-hosted | Internal/ops alerts, no app to build | Not for consumer-facing apps |
| **Gotify** (OSS) | Free self-hosted | Same as ntfy | Android only |

### 2.2 Recommendation given

- **Building a real consumer app → FCM.** Direct integration, no vendor limits, no per-message cost.
- **Want it working fast with minimal backend → OneSignal.**
- **Just alerting yourself/your team, no app dev → ntfy** (self-host in Docker, `curl -d "message" https://your-host/topic`).

### 2.3 Unavoidable costs identified early

- **iOS: Apple Developer Program ~$99/year — mandatory.** All iOS push goes through APNs; no free solution bypasses this.
- Android: Google Play listing ~$25 one-time, or sideload free.
- Your own backend to store device tokens and trigger sends.

### 2.4 Caveats raised

- Push delivery is **best-effort, not guaranteed**. Pair with in-app fetch on launch.
- iOS requires explicit permission; expect meaningful opt-out rates.
- Android OEMs (Xiaomi, Huawei, Oppo) aggressively kill background apps — delivery there is less reliable and **not fully fixable**.
- Free-tier numbers change often; verify before committing.

---

## 3. Topic 2 — Can notifications trigger calls?

### 3.1 Direct answer

**No.** None of the push services provide calling. Push is a *transport/wake-up signal*. Calling requires a separate media + signaling layer (WebRTC or SIP).

**But calling back is possible** — and the cost depends entirely on which of two very different things is meant.

### 3.2 The critical fork

| | **A. Dial a real phone number** | **B. In-app VoIP call** |
|---|---|---|
| What happens | Notification tap opens device dialer, number pre-filled | WhatsApp-style native incoming-call screen, audio over internet |
| Push service needed | Any — plain FCM or OneSignal | Special VoIP push path |
| Effort | Hours | Weeks to months |
| Cost | Free | Free software, but real infra + high complexity |

**Assessment given:** most people asking this actually want **A**.

### 3.3 Option A implementation

```
Notification payload: { "type": "callback", "phone": "+1234567890" }
      ↓ user taps
Android: Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
iOS:     UIApplication.shared.open(URL(string: "tel://\(phone)")!)
```

- Use `ACTION_DIAL` not `ACTION_CALL` — no permission needed, user confirms, avoids Play Store scrutiny.
- Call goes over carrier network; user pays normal charges; app costs nothing.

### 3.4 Option B — iOS constraints (verified)

Requires **PushKit VoIP push + CallKit**. Apple enforces this harshly. Per Apple's PushKit documentation:

> "On iOS 13.0 and later, if you fail to report a call to CallKit, the system will terminate your app. Repeatedly failing to report calls may cause the system to stop delivering any more VoIP push notifications to your app."

`reportNewIncomingCall()` must be called **before the `pushRegistry` delegate returns**. An Apple DTS engineer described two enforcement layers in the Apple Developer Forums:
1. `PKPushRegistry` checks a CallKit flag on delegate return; crashes the app if unset.
2. `callservicesd` runs a separate check ~7 seconds later, killing the app with exception code `0xbaadca11`.

**Consequence:** you must ring the user for *every* VoIP push, even if the call no longer exists. By the time the app wakes, registers, and receives the SIP INVITE, the caller may have hung up. You ring anyway, then tear down with `reportCall(with:endedAt:reason:)`.

### 3.5 Which service can send iOS VoIP push

| Service | iOS VoIP push? |
|---|---|
| **FCM** | Effectively no. Firebase's own community thread states FCM "cannot be used as a singleton solution"; PushKit must be implemented separately. Twilio's official docs state their Programmable Voice iOS SDK "only supports Apple's VoIP Service certificate for incoming call push notifications." *(Unofficial `.p8` + `apns-push-type: voip` workarounds reported but fragile.)* |
| **OneSignal** | Yes, with constraints |
| **Direct APNs** | Yes — the reliable path |

OneSignal constraints, per their own docs:
> "OneSignal supports **sending** VoIP pushes, but the OneSignal SDK does **not** handle VoIP token registration."

Requires: separate OneSignal app, VoIP Services Certificate (not standard APNs cert), token registration via REST API, and `"test_type": 1` for development builds. **No Android VoIP support** — uses data-only pushes to simulate call behavior.

### 3.6 Option B — Android constraints (verified)

Per AOSP "Full-screen intent limits":
> "In Android 14 and higher, to prevent ad spam and credential phishing, the default USE_FULL_SCREEN_INTENT permission to send full-screen notifications can be granted only to apps that provide calling and alarm functionalities."

- Changed from `normal` auto-granted (API 29–33) to `special` app access (API 34+).
- Genuine calling apps can get it pre-granted, but require a **Play Console declaration**.
- Not approved → must prompt via `ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT`; **app crashes** if it fires a full-screen intent without permission.
- Always gate on `NotificationManager.canUseFullScreenIntent()`.
- Do **not** use `checkSelfPermission()` — that's for dangerous permissions and returns `GRANTED` misleadingly.
- Enforcement deadlines already shifted once (Oct 31 2024 → Jan 22 2025). Check the current Play Console Help page.

### 3.7 Free calling backends (licenses verified)

| Project | License | Notes |
|---|---|---|
| **WebRTC** | Protocol/API, not a server | Transport standard; still need signaling + TURN |
| **LiveKit** | Apache-2.0 (verified) | Permissive, self-hostable. Good modern default |
| **mediasoup** | ISC (verified) | Permissive SFU library |
| **Jitsi** | Apache-2.0 | Self-hostable, mature |
| **Janus** | **GPLv3** (verified) | **Copyleft** — distributing modified binary obliges source release. Commercial license available from Meetecho |
| **Asterisk** | **GPLv2** (verified) | **Copyleft**, dual-licensed commercially by Sangoma/Digium |
| **FreeSWITCH** | Commonly cited MPL 1.1 — **NOT verified** | Confirm before committing |

**Licensing split matters:** LiveKit/mediasoup are permissive; Janus/Asterisk are copyleft. Also unavoidable: TURN servers for NAT traversal (coturn is free software, but relayed media consumes paid bandwidth).

### 3.8 Recommendation given

1. Dial-back suffices → **Option A**. Free, days of work.
2. Need in-app voice → direct APNs+PushKit (iOS) + FCM (Android) + LiveKit/Jitsi. Or pay Twilio/Vonage/Sinch.
3. **Do not try to make FCM alone deliver iOS VoIP calls** — the single most common wasted effort.

---

## 4. Topic 3 — Full system design for iOS + Android

User initially wrote "iOS & Arduino"; this was flagged as a likely autocorrect and confirmed as **iOS & Android**.

### 4.1 Cross-platform vs native

| Approach | Effort | When to pick |
|---|---|---|
| **Flutter** | 1 codebase, ~1.2x | No strong JS team. Good default for small team |
| **React Native + Expo** | 1 codebase, ~1.2x | Already know TypeScript. Same language as backend |
| **Native (Swift + Kotlin)** | 2 codebases, ~2x | Deep OS integration, or separate iOS/Android devs |

**Reasoning specific to notifications:** this is one area where cross-platform frameworks are genuinely mature — the wrapper libraries are well-maintained and heavily used. Notifications are also mostly a *backend* problem, which is platform-agnostic. Native buys little for 2x client work.

### 4.2 Core design rule established

> **Push is a hint, not delivery. The database holds the truth; push just tells the app to look.**

This single rule drives the entire schema design and is the reason a durable `notifications`/`alarms` table exists server-side.

### 4.3 Data model principles (carried into final plan)

Four decisions explained in depth:

1. **`fcm_token`/`expo_token` UNIQUE** — tokens migrate between users (shared device, reinstall). Without UNIQUE, user A receives user B's notifications. **A real privacy incident, not theoretical.**
2. **`dedup_key`** — retries and duplicate events won't double-notify. Deterministic value like `order_shipped:{order_id}`.
3. **Durable notifications table** — app fetches list on launch, so a dropped push isn't a lost notification.
4. **`delivery_attempts` log** — when a user says "I got nothing," you can answer definitively.

### 4.4 Payload discipline

Send IDs, not content:
```json
{
  "notification": { "title": "New message", "body": "Alice sent you a message" },
  "data": { "type": "message", "conversation_id": "abc123", "notification_id": "n_789" }
}
```
Keep it small (APNs caps payload size). Never put sensitive data in the payload — it passes through Google and Apple and lands on a lock screen.

### 4.5 Skills checklist given

**Must have:** TypeScript (or Dart), SQL + relational modelling, REST API design + JWT, async job/queue thinking (retries, idempotency, backoff), Git/CI-CD basics, ability to read Apple's and Android's notification docs.

**Will need soon:** Docker, Xcode + Android Studio (build/sign/read logs), App Store Connect / Play Console submission, basic observability.

### 4.6 Arduino contingency

If Arduino *was* meant as a notification source, the mobile architecture is unchanged — only an ingestion path is added:

```
ESP32 (not classic Uno — needs WiFi/BLE + TLS headroom)
   │  MQTT over TLS
   ▼
Mosquitto / EMQX broker  ── or ── AWS IoT Core
   │
   ▼
Backend (MQTT subscriber) → same notification module → FCM → phones
```

Critical: per-device auth (certs/tokens) and **server-side rate limiting** — a stuck sensor firing 1000 events/min will spam users and burn quota. Debounce at the backend, not the device. Reuse the same `dedup_key` mechanism.

---

## 5. Topic 4 — Beginner path and the alarm use case

User revealed: **"I know nothing"** and described the concrete scenario — an existing server records operation events; on alarm, notify a manager; manager taps notification or red dot; sees details.

### 5.1 Recommendation confirmed with two corrections

**Still React Native + Expo**, but:

**Correction 1 — Skip Expo Go entirely.**
Expo Go is the "scan a QR code, no build needed" tool normally recommended to beginners. It no longer works for push on Android. Per expo/expo commit `54d0207`:

> "We first deprecated push notifications not working on Expo Go on Android in SDK 52... For SDK 55 that console logging will become an error - a promise rejection."

Verified source behavior in `warnOfExpoGoPushUsage.ts`:
```
if (Platform.OS === 'android') { throw new Error(message); }
else if (__DEV__) { didWarn = true; console.warn(message); }
```
**Android throws; iOS only warns.** iOS Expo Go still functionally supports remote push via Expo's shared credentials. However, Expo Go for recent SDKs is unavailable on the Apple App Store with no published timeline. **Decision: route around Expo Go entirely via development builds** — this sidesteps both the Android throw and the iOS App Store outage, and removes a whole class of "works here, breaks there" bugs.

**Correction 2 — Backend simplified.**
The earlier proposal (Node + Fastify + Postgres + Redis + BullMQ) was **over-engineered for this use case**. `expo-server-sdk-node` already handles the batching and throttling that BullMQ would provide:

> "automatically gzips requests... and automatically throttles your requests to smooth out the load"

**Redis/BullMQ dropped from v1.** Add only if measured load justifies it.

### 5.2 Alarm flow designed

```
Existing server detects alarm
        │  HTTP POST (webhook, HMAC-signed)
        ▼
Notification service ── writes alarm row ──► Postgres
        │
        │ looks up manager's device tokens
        ▼
Expo Push Service ──► FCM ──► Android phone
                 └──► APNs ──► iPhone
        │
   manager taps notification
        ▼
App deep-links to /alarms/{id} ──► GET /alarms/{id} ──► detail screen
```

The red dot is `GET /alarms/unread-count` polled on app foreground, plus the native badge set from server count.

### 5.3 Build order established

**Android completely first** — no $99 gate, faster credential setup, and the whole architecture is learned before touching Apple.

| Phase | Work |
|---|---|
| 1 | Backend: Postgres, login, `/devices/register`, `/internal/alarms`, `/alarms` list. Test with curl |
| 2 | Expo app skeleton with hardcoded data |
| 3 | Wire screens to real API |
| 4 | Android push: Firebase, EAS dev build, permission + token |
| 5 | Server-side sending + receipts + dead-token cleanup |
| 6 | Tap → deep link → detail. Red dot. Cold-start case |
| 7 | iOS: Apple enrollment, `.p8` key, EAS iOS build, iPhone test |
| 8 | Dedup, quiet hours, severity mapping, delivery dashboard |

Estimate: **4–8 weeks part-time as a beginner** (judgment, not measurement). Phase 7 has external waiting — start Apple enrollment during phase 4.

### 5.4 `app_plan.md` produced

1604-line AI-executable specification with 20 sections. Structured as phase gates with verification commands so an implementing agent can self-check rather than drift.

Notable design choices:
- **Section 0**: 14 mandatory engineering rules (no guessing, no secrets, phase gates).
- **Section 17**: 15 questions the AI must ask rather than invent answers to.
- **No Expo SDK version pinned** — §9.1 instructs checking the current compatibility page at implementation time. A stale pin is worse than no pin.
- **§8.3/§8.4 wrinkle disclosed**: the naive ticket-mapping example (global `deviceIds` array indexed against tickets) breaks across multiple chunks since tickets return per-chunk. §8.4 immediately shows the correct `{deviceId, message}` pairing pattern.

---

## 6. Verified facts reference

Every fact below was confirmed against a primary source during the conversation.

### 6.1 iOS / Apple

| Fact | Source |
|---|---|
| VoIP push must be reported to CallKit before delegate returns, or app is terminated | Apple PushKit documentation |
| Two enforcement layers: `PKPushRegistry` crash + `callservicesd` ~7s check → `0xbaadca11` | Apple DTS engineer, Apple Developer Forums |
| Repeated failure → system stops delivering VoIP pushes | Apple PushKit documentation |
| Silent/background push is throttled and "never guaranteed to be delivered" | Apple engineering, Developer Forums |
| `.p8` Auth Keys recommended over deprecated `.p12` certs; one key works for all apps, never expires | CometChat iOS APNs docs |
| Paid Apple Developer Account required to generate push credentials | Expo push setup docs |
| Sandbox vs production APNs environments are separate; mismatch = silent non-delivery | Multiple sources |

### 6.2 Android / Google

| Fact | Source |
|---|---|
| Android 14+: `USE_FULL_SCREEN_INTENT` restricted to calling/alarm apps by default | AOSP "Full-screen intent limits" |
| Permission changed from `normal` (API 29–33) to `special` (API 34+) | AOSP + AWAKE permission reference |
| Play Console declaration required; unapproved apps must prompt user | Google Play Console Help |
| App crashes if full-screen intent used without permission and without checking | Google Play Console Help |
| `checkSelfPermission()` unreliable for this; use `NotificationManager.canUseFullScreenIntent()` | Stack Overflow, answer by CommonsWare |
| Android 13+ requires `POST_NOTIFICATIONS` runtime permission | Android official docs |
| Notification channels mandatory since Android 8 | Android official docs |
| Channel must exist before permission prompt appears | expo-notifications issues |
| Play targetSdk floor: Aug 31 2024 → API 34; rises annually | Google Play policy update |
| FCM legacy endpoint (`fcm.googleapis.com/fcm/send`) sunset June 2024, now 404s | Multiple; Expo FCM v1 migration blog |

### 6.3 FCM / Expo

| Fact | Source |
|---|---|
| FCM uses APNs to deliver iOS messages with user-visible payload | Firebase Google Group, Tingmui Li (Firebase team) |
| FCM cannot practically send iOS VoIP/PushKit pushes | Firebase community thread; Twilio official docs |
| Expo Go Android push: deprecated SDK 52, throws SDK 55 | expo/expo commit `54d0207` |
| iOS Expo Go only `console.warn`s (does not throw) | `warnOfExpoGoPushUsage.ts` source |
| Expo Go SDK 56 unavailable on both App Store and Play Store at release | Expo SDK 56 upgrade guide (Keith Kurak) |
| Expo Go SDK 55 iOS App Store approval pending as of May 4 2026 | Expo blog (Brent Vatne) |
| Expo Push Service free, no per-notification fee, no volume cap | Expo docs + Courier guide |
| EAS Build free tier: 15 Android + 15 iOS builds/month, low-priority queue, 45-min timeout | Expo docs |
| `expo-notifications` must be in `plugins` array or iOS lacks APNs entitlements | expo/expo issue #38893 |
| `expo-server-sdk-node` auto-gzips and auto-throttles | expo-server-sdk-node docs |
| Expo caps push batches at 100 (`chunkPushNotifications` required) | Expo docs |
| SDK 55 breaking: `notification` key removed from app.json | Expo SDK 55 changelog |
| SDK 55 breaking: `eas update` requires `--environment` | Expo docs |
| SDK 55 breaking: New Architecture mandatory, `newArchEnabled` removed | Expo SDK 55 changelog |

### 6.4 Open-source licensing

| Project | License | Verified |
|---|---|---|
| LiveKit | Apache-2.0 | Yes — official LICENSE file |
| mediasoup | ISC | Yes — official LICENSE file |
| Janus | GPLv3 (copyleft) | Yes — meetecho/janus-gateway repo |
| Asterisk | GPLv2 (copyleft), dual-licensed | Yes |
| FreeSWITCH | MPL 1.1 (commonly cited) | **No — unverified** |

---

## 7. Corrections made during the conversation

This section documents where independent verification changed the answer. It is included because the corrections are as informative as the conclusions.

| # | Original draft claim | Correction | Why it mattered |
|---|---|---|---|
| 1 | "iOS has a ~3 VoIP pushes/min rate limit" | **Removed.** No official Apple doc specifies a numeric limit. An Apple DTS engineer appeared to dispute it, but the exact quote could not be verified (forum blocked automated access). Reframed as unverified folklore | Widely repeated in secondary sources; would have caused unnecessary architectural workarounds |
| 2 | "Repeated VoIP failure requires app reinstall to restore delivery" | **Softened.** No Apple source found for the reinstall claim; only "system will stop delivering" | Avoided stating an unsourced remediation step |
| 3 | "Twilio maintainer states..." | **Re-attributed** to Twilio's official documentation, not a named forum maintainer | Attribution accuracy |
| 4 | "FCM cannot send iOS VoIP pushes" | **Softened** to acknowledge an unofficial `.p8` + `apns-push-type: voip` workaround exists but is fragile | "Cannot" was too absolute |
| 5 | Janus/Asterisk listed alongside LiveKit as equivalently "free" | **Flagged as copyleft** (GPLv3/GPLv2) vs permissive (Apache-2.0/ISC) | Material legal difference if shipping modified binaries |
| 6 | FreeSWITCH license stated | **Marked unverified** | Not confirmed in session |
| 7 | Android 14 FSI deadline cited as a specific date | **Deadline conflict resolved** — Google communicated Oct 31 2024, then moved to Jan 22 2025. Advised citing the live Play Console page instead of hardcoding | The date had already moved once |
| 8 | "Remote push no longer works in Expo Go" (unqualified) | **Qualified** — Android throws; iOS only warns and still works via Expo's shared credentials | Would have caused unnecessary panic-migration on iOS |
| 9 | "Expo Go is dead" framing | **Corrected** — Play Store tracks recent SDKs reasonably; App Store is the stuck one | Android beginners may still install normally |
| 10 | Backend: Node + Fastify + Postgres + Redis + BullMQ | **Redis/BullMQ dropped from v1** — `expo-server-sdk-node` already throttles | Removed unnecessary infrastructure for a beginner |
| 11 | Expo SDK version pinned in plan | **Removed pin** — SDK 56 confirmed shipped; SDK 57 signals in npm registry could not be corroborated with an official announcement | Stale pin worse than no pin |

---

## 8. Claims that could NOT be verified

Stated explicitly to avoid false confidence:

1. **iOS VoIP push rate limit.** The "3/min" figure is widely repeated but has no official Apple documentation. A DTS engineer reportedly disputed it, but the exact quote could not be retrieved — Apple Developer Forums blocked automated access. **Treat as unverified folklore; do not architect around it either way.**
2. **FreeSWITCH license.** Commonly documented as MPL 1.1; not independently confirmed in this session.
3. **Current Expo SDK version.** SDK 56 confirmed shipped (May 21–22 2026). npm registry `dist-tags` showed `latest: 57.x` with changelog entries into July 2026, but no official SDK 57 announcement blog post was found. **Verify at build time via `expo.dev/versions`.**
4. **iOS Expo Go remote push "still works."** Based on one third-party guide plus consistent asymmetric source-code behavior. No single authoritative Expo doc states it in those words. **Test directly before relying on it.**
5. **Expo Go App Store restoration timeline.** Expo's own words: "we cannot provide a timeline." Open GitHub issue unresolved as of July 2026.
6. **4–8 week build estimate.** Engineering judgment, not measurement. Phases 1–3 may take a beginner longer; phases 4–7 are more predictable since they follow documented steps.

---

## 9. Final recommended architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Existing operations server (user's, already exists)        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS POST + HMAC-SHA256 signature
                         │ X-Internal-Webhook-Signature header
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Notification API — Node + TypeScript + Fastify             │
│                                                              │
│  1. Verify HMAC over RAW body bytes                         │
│  2. Validate schema (Zod)                                   │
│  3. Insert WebhookEvent (source, eventId) UNIQUE  ← dedup   │
│  4. Insert Alarm (dedup_key UNIQUE)               ← dedup   │
│  5. Insert AlarmRecipient rows                              │
│  6. COMMIT                                                   │
│  7. Send push AFTER commit (never hold txn open)            │
└──────────┬───────────────────────────────┬──────────────────┘
           │                               │
           ▼                               ▼
┌────────────────────────┐   ┌──────────────────────────────┐
│  PostgreSQL            │   │  Expo Push Service (free)    │
│  users, devices,       │   │  chunked at 100/batch        │
│  alarms, recipients,   │   │  returns TICKETS not delivery│
│  reads, push_deliveries│   └────┬───────────────┬─────────┘
│  webhook_events        │        │               │
└────────────────────────┘        ▼               ▼
                              ┌───────┐      ┌─────────┐
                              │  FCM  │      │  APNs   │
                              └───┬───┘      └────┬────┘
                                  ▼               ▼
                              Android          iPhone
                                  │               │
                                  └───────┬───────┘
                                          │ tap notification
                                          ▼
                        ┌──────────────────────────────────┐
                        │  Expo app (React Native + TS)    │
                        │  • dev build, NOT Expo Go        │
                        │  • payload has ONLY alarmId      │
                        │  • deep-link /alarms/:id         │
                        │  • GET details (authenticated)   │
                        │  • badge = server unread count   │
                        │  • fetch list on foreground      │
                        └──────────────────────────────────┘

  Separate periodic job: fetch RECEIPTS by ticketId
                         → DeviceNotRegistered → deactivate token
```

### Stack summary

| Layer | Choice |
|---|---|
| App | React Native + Expo + TypeScript + Expo Router |
| Push client | `expo-notifications`, `expo-device`, `expo-constants`, `expo-secure-store` |
| Data fetching | `@tanstack/react-query` |
| Push transport | Expo Push Service (migration path to direct FCM/APNs preserved) |
| Backend | Node LTS + TypeScript + Fastify |
| ORM | Prisma |
| DB | PostgreSQL 16 |
| Push sending | `expo-server-sdk-node` |
| Validation | Zod (shared contracts package) |
| Logging | pino (structured) |
| Queue | **None in v1** |
| Hosting | Railway / Render / Fly.io |

---

## 10. Cost summary

| Item | Cost | Notes |
|---|---|---|
| Expo SDK, CLI, Push Service | **Free** | No per-notification fee, no volume cap |
| **Apple Developer Program** | **~$99/yr** | **Mandatory** for iOS builds, signing, push |
| Google Play registration | ~$25 one-time | Only for public publishing |
| EAS Build free tier | Free | 15 Android + 15 iOS builds/mo, low-priority queue (1hr+ waits), 45-min timeout |
| EAS paid (optional) | ~$19/mo | Priority queue — buy only if waits become painful |
| Backend + Postgres | ~$0–20/mo | At this scale |
| Sentry | Free tier adequate | Early stage |

**Year one: roughly $125 + time.** Verify current figures — Expo tiers and Apple's fee both change.

---

## 11. Known traps

Each of these was identified as costing roughly a day of debugging:

| # | Trap | Consequence | Fix |
|---|---|---|---|
| 1 | Not handling `DeviceNotRegistered` | Delivery silently decays over months | Delete/deactivate token on receipt error |
| 2 | Missing `dedup_key` | Flapping sensor → 40 notifications at 3am → manager disables notifications permanently | Deterministic dedup key + UNIQUE index |
| 3 | Treating tickets as delivery confirmation | No idea what actually arrived | Fetch receipts separately after a delay |
| 4 | Testing only on your own phone | Miss OEM battery-killer behavior (Xiaomi/Huawei/Oppo) | Test multiple manufacturers; in-app list as safety net |
| 5 | Sensitive details in push payload | Lock-screen exposure + size limits | Send only `alarmId`; fetch authenticated |
| 6 | Treating push as guaranteed | Lost alarms | DB is truth; always fetch list on foreground |
| 7 | Skipping Android notification channel | Permission prompt never appears | Create channel BEFORE requesting permission |
| 8 | `expo-notifications` not in `plugins` array | iOS push silently fails (no APNs entitlement) | Add to `app.json` plugins |
| 9 | Missing `POST_NOTIFICATIONS` (Android 13+) | Notifications never appear, no error | Request at runtime |
| 10 | Not handling cold-start notification tap | Tap does nothing when app was terminated | `getLastNotificationResponseAsync()` |
| 11 | Not re-sending token on every launch | Token rotation breaks delivery silently | Re-register every launch (cheap, self-healing) |
| 12 | Asking notification permission on first launch | High denial rate, effectively permanent on iOS | Ask when value is obvious |
| 13 | HMAC over parsed/re-serialized JSON | Signature mismatch | Sign raw request bytes |
| 14 | Holding DB transaction open during Expo call | Connection pool exhaustion | Commit first, push after |
| 15 | Following tutorials >6 months old | Dead code (legacy FCM endpoint 404s) | Trust only `docs.expo.dev` |

---

## 12. Open questions for the user

From `app_plan.md` §17 — the implementing AI must ask rather than invent:

**Highest priority (block the webhook contract):**
1. What exact event format does the existing server produce?
2. How are managers identified — email, employee ID, existing account ID, or SSO?
3. What is the existing server technology and where does it run?

**Routing and policy:**
4. Should all managers receive every alarm, or is routing by site/team/role?
5. Which severities notify immediately?
6. Can one manager receive alarms from multiple sites/organizations?
7. Should critical alarms bypass quiet hours? (Platform restrictions still apply)
8. Should users acknowledge/resolve alarms, or only mark read?

**Operational:**
9. How long should alarms remain visible?
10. What information is safe to display on a locked screen?
11. Is App Store distribution required, or private/internal?
12. What hosting provider and domain are available?
13. Expected alarm volume and peak burst rate?
14. Data retention and privacy rules?
15. Compliance requirements (GDPR, HIPAA, SOC 2, local)?

---

## 13. Next actions

**Immediate:**
1. Answer §17 questions 1–3 (they define the webhook contract in `app_plan.md` §7.4).
2. Start Apple Developer Program enrollment if iOS is in scope — enrollment can take days and blocks phase 7.
3. Verify current Expo SDK at `expo.dev/versions` before running any install command.

**To begin implementation:**
Point an AI agent at the plan:
> "Implement app_plan.md, starting with Phase 1. Stop at each phase's verification step and show me the output."

**Optional cleanup offered but not yet done:**
- Rewrite `app_plan.md` §8.3 to be correct standalone (currently the naive chunk-mapping example is retained with §8.4 immediately showing the correct pattern). Say the word if you'd prefer the teaching aside removed.

**Files produced:**
- `/workspace/app_plan.md` — 1604 lines, 20 sections, AI-executable build spec
- `/workspace/summary.md` — this document

---
---

# Part II — 實作階段紀錄 / Implementation Session Record

**日期 Date:** 2026-08-11（與 Part I 同日 / same day as Part I）
**執行環境 Environment:** Claude Code, Windows 11, Node 24.16.0, npm 11.13.0, 無 Docker / no Docker
**專案根目錄 Project root:** `C:\Claude Projects\12_App_notification`

> **本節與 Part I 的關係 / Relationship to Part I**
>
> Part I 是研究與設計階段的產出（由 JARVIS 完成），包含已查證的事實、被推翻的草稿主張、以及一份 AI 可執行的建置規格。Part II 記錄實際動手建置的過程：哪些照計畫走、哪些偏離、以及**實作過程中才發現的設計缺陷與修復**。
>
> Part I is the research and design output (produced by JARVIS): verified facts, corrected draft claims, and an AI-executable build specification. Part II records the actual build: what followed the plan, what deviated, and — most importantly — **the design defects only discovered by implementing it**.

---

## II.1 需求的轉變 / How the requirement changed

### 中文

Part I 的目標是「設計一套 iOS + Android 告警通知系統」。Part II 開始時，需求變得更明確也更務實：

> 「做一個網頁，可以讓我模擬當告警成立時，operation 網頁會記錄並顯示，且系統觸發 notification、發送告警訊息到 mobile app……這網頁模擬完成後，我就會將它正式與客戶的 operation server 整合，手機模擬器也變成一個真正在 Android / iOS 上架的 app。」

這句話把整個專案從「直接蓋正式系統」改成**兩階段**：

- **Phase A（現在）** — 建一座**模擬實驗室**：模擬營運伺服器、通知服務、模擬手機、一個能看見整條鏈路的網頁。目的是**證明可行性**，而不是上線。
- **Phase B（之後）** — 把模擬的兩端換成真的：客戶的營運伺服器、以及真正上架的 Android / iOS App。

這個轉變帶來一個貫穿全部設計的約束：**凡是 Phase A 專屬的東西，都必須被隔離在一個明確的介面之後**，否則 Phase B 就會變成重寫而不是替換。

### English

Part I aimed to design an iOS + Android alarm notification system. Part II began with a sharper, more pragmatic requirement: build a **simulation lab** — a simulated operations server, the notification service, a simulated phone, and a web page that makes the whole chain visible — in order to **prove feasibility** before integrating with the customer's real operations server and shipping real store apps.

This split the project into two phases, and imposed the constraint that shapes every design decision below: **anything specific to Phase A must sit behind an explicit interface**, or Phase B becomes a rewrite instead of a swap.

---

## II.2 交付進度 / Delivery status

| 階段 Phase | 內容 Scope | 狀態 Status | 測試 Tests |
|---|---|---|---|
| **P0** | Monorepo 骨架、Prisma schema、seed、健康檢查、共用契約套件<br>Monorepo skeleton, Prisma schema, seed, health endpoint, shared contracts package | ✅ 完成 Complete | — |
| **P1** | 認證、裝置註冊、告警 API、HMAC webhook + 來源格式轉接層<br>Auth, device registration, alarm API, HMAC webhook + source-format adapter layer | ✅ 完成 Complete | 77 / 6 檔 files |
| **P2** | 推播抽象層、模擬推播供應商（WebSocket）、逐人 ack 帳本、回條與死 token 清理<br>Push abstraction, simulator provider (WebSocket), per-recipient ack ledger, receipts and dead-token cleanup | ✅ 完成 Complete | 108 / 9 檔 files |
| **P3** | 模擬營運伺服器（獨立行程 :4000）、情境目錄、故障注入、感測器抖動示範<br>Simulated operations server (separate process :4000), scenario catalogue, fault injection, flapping-sensor demo | ✅ 完成 Complete | 143 / 11 檔 files |
| **P4** | 三欄模擬網頁（:5173）：觸發台 / 事件流與帳本 / 手機模擬器<br>Three-column simulation web page: trigger console / event stream and ledger / phone simulator | ⏳ 未開始 Pending | — |
| **P5** | README 開發歷程、PROMPT.md 重建規格（中英雙語）<br>README development history, PROMPT.md rebuild spec (bilingual) | ⏳ 進行中 In progress | — |

**目前狀態 Current state:** 143 個測試全數通過，三個 workspace 的 TypeScript 型別檢查全綠。
143 tests passing, TypeScript typecheck clean across all three workspaces.

---

## II.3 實際建成的架構 / Architecture as built

```
┌──────────────────────────────────────────────────────────────────┐
│  apps/ops-server  :4000   模擬營運伺服器 / simulated ops server   │
│  · 6 個情境目錄 scenario catalogue                                │
│  · HMAC 簽章（對「實際送出的位元組」）signs the exact bytes sent  │
│  · 故障注入：錯誤簽章 / 無簽章 fault injection                    │
│  · 自己的事件記錄 its own event log                               │
└───────────────────────────┬──────────────────────────────────────┘
                            │  HTTPS POST + X-Internal-Webhook-Signature
                            │  （真實網路跳躍 / a real network hop）
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  apps/api  :3000   通知服務 / notification API                    │
│                                                                   │
│  webhooks/adapters/   來源格式轉接層 source-format adapters       │
│      standard  |  legacy-ops-v1  (數字等級、Unix 時間、email 收件)│
│              ↓  正規化 normalise                                  │
│  alarms/ingest.ts     雙層去重 + 交易 dual dedup + transaction     │
│              ↓  先 commit，再推播 commit BEFORE pushing            │
│  notifications/       PushProvider 介面 interface                 │
│      └─ simulator/    Phase A 專屬 Phase A only                   │
│              ↓                                                    │
│  ws/device.ts         WebSocket（Phase B 整個刪除 deleted in B）  │
└───────────┬──────────────────────────────────┬───────────────────┘
            │                                  │
            ▼                                  ▼
┌────────────────────────┐      ┌──────────────────────────────────┐
│  SQLite (Prisma)       │      │  模擬手機 simulated phone         │
│  users / devices       │      │  收 push → 回 ack                 │
│  alarms / recipients   │      │  receives push → sends ack        │
│  alarm_unresolved_...  │      └──────────────────────────────────┘
│  push_deliveries       │
│  webhook_events        │
│  refresh_tokens        │
└────────────────────────┘
```

### Phase B 需要替換的東西 / What Phase B replaces

| 元件 Component | Phase A | Phase B | 隔離介面 Isolating interface |
|---|---|---|---|
| 事件來源 Event source | `apps/ops-server` | 客戶營運伺服器 Customer's server | `webhooks/adapters/*` |
| 推播傳輸 Push transport | WebSocket | Expo / FCM / APNs | `notifications/provider.ts` |
| 手機 Handset | 瀏覽器模擬器 Browser simulator | React Native App | 同上 same |
| 資料庫 Database | SQLite | PostgreSQL | Prisma schema（無 enum/Json）|

**設計原則 Design principle:** 每一列的「Phase B」欄都只需新增一個實作，不需修改告警管線本身。
Each row's Phase B column requires only a new implementation — never a change to the alarm pipeline itself.

---

## II.4 與使用者共同做出的三個設計決策 / Three design decisions taken with the user

這三個決策改變了資料模型，因此在 P2 動工前就先定案。
These three changed the data model, so they were settled before P2 began.

### 決策一：部分收件人無效時的處理 / Partial recipient failure

| | 原本實作 Original | 改為 Changed to |
|---|---|---|
| 行為 Behaviour | 整筆拒絕 400，不建立告警<br>Reject the whole webhook, create nothing | 建立告警、送給可送達者、其餘標記記錄<br>Create the alarm, deliver to whoever is reachable, record the rest |

**中文：** 原本的理由是「部分成功會靜默」—— 來源系統收到 200，以為三個人都通知了，實際只到兩個。但使用者提出「能不能收到 ack，知道誰收到誰沒收到」的想法後，這個理由就不成立了：一旦建立**逐人帳本**，第三個人會被明確標成 `UNDELIVERABLE`，在營運網頁上是紅的、可查詢的。不再靜默，就沒有理由讓「設定檔裡一個離職員工的 email」把整條告警鏈打斷。

**English:** The original rationale was that partial success is *silent* — the source system reads HTTP 200 and assumes all three managers were told. The user's acknowledgement proposal dissolved that objection: with a **per-recipient ledger**, the third recipient is explicitly `UNDELIVERABLE`, visible and queryable. Once it is not silent, reaching two of three clearly beats letting one stale email in the customer's configuration break the entire alarm chain.

**額外保障 Additional safeguards:**
- Webhook 回應現在帶 `recipientCount` 與 `unresolvedRecipients`，整合方看得到真相。
  The webhook response now carries `recipientCount` and `unresolvedRecipients`.
- 區分 `UNKNOWN_USER`（設定打錯）與 `INACTIVE_USER`（員工離職）—— 兩者要找不同的人修。
  Distinguishes `UNKNOWN_USER` (a typo in configuration) from `INACTIVE_USER` (an offboarded employee) — different fixes, different owners.
- 完全無人可通知時仍建立告警，並發出 `alarm_no_recipients` 事件。丟棄它會摧毀「來源系統確實試過」的唯一證據。
  An alarm nobody can receive is still stored and raises `alarm_no_recipients`. Discarding it would destroy the only evidence the source system tried.

### 決策二：ack 要做到哪一層 / How deep the acknowledgement goes

**結論 Decision:** 做到「人 ack」，並且 **acknowledge（我看到了）與 resolve（已處理完）分成兩個狀態**。
Implement human acknowledgement, with **acknowledge (I have seen this) and resolve (this has been dealt with) as distinct states**.

**中文：** 理由是半夜三點的一次反射性點擊可以證明有人看到告警，但不能證明機房被修好了。若把兩者合併，一次點擊就會讓整組人失明。

**English:** A half-asleep tap at 3am proves someone saw the alarm; it does not prove the server room was fixed. Merging the two lets a single reflexive tap blind everyone.

### 決策三：結案政策 / Closure policy

**結論 Decision:** v1 採 **ALL（逐人追蹤、每個人的狀態各自可見）**，不採 ANY_ONE（任一人 ack 即結案）。
v1 uses **ALL** — per-person tracking with every recipient's state independently visible — not ANY_ONE.

使用者曾提出「把群組當成一個人，任一人 ack 就完成整個程序」。這個模式真實存在（PagerDuty 即有），但直接採用會有五個問題：
The user proposed treating a group as a single recipient where any one acknowledgement closes the alarm. That pattern is real (PagerDuty uses it), but adopting it directly has five problems:

| # | 弱點 Weakness | 說明 Explanation |
|---|---|---|
| 1 | 責任分散 Bystander effect | 三人都收到、任一人 ack 即關閉 → 三人都以為別人處理了<br>All three receive it, any one closes it → each assumes another handled it |
| 2 | ack ≠ 已處理 ack ≠ handled | 反射性點擊會替所有人關閉告警<br>A reflexive tap silences the alarm for everyone |
| 3 | 失去逐人視角 Loss of per-person visibility | 答不出「B 的手機到底有沒有收到」<br>Cannot answer "did B's phone actually get it?" |
| 4 | 成員會變動 Membership drifts | 未快照當下成員 → 稽核時無法證明那天是哪三個人<br>Without a membership snapshot, an audit cannot prove who "the ops group" was that day |
| 5 | 升級無處可去 No escalation path | 「群組當一個人」沒有結構可以升級<br>Group-as-one-person has no structure to escalate into |

**採取的架構 Architecture adopted — 兩層分離 / two-layer split:**

```
政策層 Policy layer  ── 決定「推給誰」「怎樣算結案」
                        ALL / ANY_ONE / ESCALATE   ← 之後隨時可加
                        ↑ reads from, never replaces
帳本層 Ledger layer  ── AlarmRecipient（逐人）+ PushDelivery（逐裝置）
                        現在就必須做對，事後補不回來
```

**中文：** 關鍵論點是「群組不是收件人的形狀，而是結案條件的政策」。帳本層若現在為了簡化而合併，將來要做升級或稽核時，資料已經永遠遺失。政策層則隨時可以加。

**English:** The key argument: a group is not a *shape of recipient*, it is a *policy about what closes an alarm*. If the ledger is collapsed now for simplicity, the data needed for escalation and audit is gone forever. The policy layer can be added at any time.

---

## II.5 實作中發現的設計問題與修復 / Design problems found during implementation

> 這一節是本文件最重要的部分。以下每一項都**不是規格書預見的**，而是動手寫程式或跑測試時才浮現的。
>
> This is the most important section. None of the following were anticipated by the specification — each surfaced only while writing the code or running the tests.

### 🔴 D-1 建構函式可以產出自己驗證器會拒絕的值
### 🔴 D-1 A constructor able to emit a value its own validator rejects

| | |
|---|---|
| **位置 Location** | `packages/contracts/src/device.ts` |
| **問題 Problem** | `makeSimulatorPushToken("Ops E2E Phone")` 產生 `SimulatorPushToken[Ops E2E Phone]`，但 `isSimulatorPushToken()` 的正規表示式 `[0-9a-zA-Z-]` 不允許空格，因此驗證失敗。<br>The constructor interpolated its label verbatim; the validator's `[0-9a-zA-Z-]` pattern rejects spaces. |
| **如何發現 How found** | P3 跨行程測試中，「簽章錯誤時不應有推播」的測試通過了，但「正常事件應送達手機」的測試也是零推播。<br>In P3 cross-process tests, the "no push on bad signature" assertions passed — but so did zero-push on the *success* path. |
| **為什麼嚴重 Why it mattered** | **失敗是靜默的，而且讓測試因為錯誤的理由變綠。** 裝置註冊回 400 → 沒有裝置 → 告警仍被接受（收件人數 = 1）→ 收件人被標為「無裝置可送達」→ 所有「沒有推播到達」的斷言全部通過。安全測試看起來是綠的，實際上證明的是「推播從來沒通過」。<br>**The failure was silent and made tests pass for the wrong reason.** Registration 400'd → no device existed → the alarm was still accepted → the recipient was marked undeliverable → every "no push arrived" assertion passed. The security tests looked green while actually proving "push never worked at all". |
| **修復 Fix** | `makeSimulatorPushToken` 改為先 slugify；若無任何可用字元則**直接拋錯**，而不是回傳 `SimulatorPushToken[]`（那種值會以字串形式通過，然後在離現場很遠的地方才爆）。<br>The constructor now slugifies its input and **throws** when nothing usable survives, rather than emitting `SimulatorPushToken[]` — a value that passes as a string and fails far from its cause. |
| **加上的防護 Guard added** | `tests/unit/push-token.test.ts`：26 個 round-trip 測試，鎖住「建構函式的輸出必然通過自己的驗證器」這個不變式。<br>26 round-trip tests locking the invariant that the constructor's output always satisfies its own validator. |

### 🟠 D-2 測試輔助函式未斷言前置條件
### 🟠 D-2 A test helper that did not assert its own preconditions

| | |
|---|---|
| **位置 Location** | `apps/api/tests/integration/ops-server.test.ts` → `createManagerWithPhone()` |
| **問題 Problem** | 輔助函式呼叫裝置註冊 API 但**沒有檢查回應狀態**，因此 D-1 的 400 錯誤被完全吞掉。<br>The helper called the device-registration endpoint but never checked the response status, swallowing D-1's 400 entirely. |
| **修復 Fix** | 註冊失敗時直接拋出，附上狀態碼與回應內容。<br>Throws on non-200, including status and body. |
| **教訓 Lesson** | 測試輔助函式的前置條件失敗，會讓整個測試檔的結論失效 —— 而且是往「通過」的方向失效。<br>A silent precondition failure in a test helper invalidates the whole file's conclusions — and it fails *towards green*. |

### 🟠 D-3 測試間共用資料庫導致去重桶互相污染
### 🟠 D-3 Shared test database causing dedup-bucket cross-contamination

| | |
|---|---|
| **問題 Problem** | 溫度情境的去重鍵是 `temperature:main-site:R12:{5 分鐘時間桶}`。同一檔案內先前測試建立的告警，會讓後續「感測器抖動」測試的第一筆事件就被判為重複，導致建立 0 則告警。<br>The temperature scenario's dedup key buckets to five minutes. An alarm left by an earlier test in the same file suppressed the flapping test's first event, yielding zero alarms created. |
| **修復 Fix** | `beforeEach` 清除 `alarms` 與 `webhook_events`，讓每個測試的去重行為屬於自己。<br>`beforeEach` clears `alarms` and `webhook_events` so each test owns its dedup behaviour. |
| **註記 Note** | 這同時證明了去重機制本身是有效的 —— 它「太有效」以致於跨測試生效。<br>This incidentally proved the dedup mechanism works: it worked *across tests*. |

### 🟡 D-4 pino 具體型別特化 Fastify 的 logger 泛型
### 🟡 D-4 A concrete pino type specialising Fastify's logger generic

| | |
|---|---|
| **位置 Location** | `apps/api/src/server.ts` |
| **問題 Problem** | 把具體的 pino `Logger` 實例傳給 `loggerInstance` 會特化 Fastify 的 logger 泛型，導致所有以 `FastifyInstance` 為參數型別的路由註冊函式型別不符（一次噴出約 20 個 TS2345）。<br>Passing a concrete pino `Logger` to `loggerInstance` specialises Fastify's logger generic, so every route registrar typed against plain `FastifyInstance` stops matching — roughly 20 TS2345 errors at once. |
| **錯誤的修法 Wrong fix** | 在每個路由檔案標註特化後的型別（20 處重複、且會隨每個新檔案增生）。<br>Annotating the specialised type in every route file — 20 duplications that grow with each new file. |
| **採用的修法 Fix applied** | 在**單一源頭**把型別放寬為 `FastifyBaseLogger`。<br>Widened to `FastifyBaseLogger` at the single source. |

### 🟡 D-5 日誌遮蔽把刻意保留的 token 指紋也蓋掉
### 🟡 D-5 Log redaction blanking an intentional token fingerprint

| | |
|---|---|
| **問題 Problem** | logger 對路徑 `pushToken` 做遮蔽（正確），但裝置註冊事件裡刻意記錄的**截斷指紋**也用了同一個鍵名，於是變成 `[REDACTED]`，功能等於失效。<br>The logger redacts the `pushToken` path (correct), but the deliberately-truncated fingerprint in the device-registration event used the same key and was blanked too. |
| **修復 Fix** | 改用 `pushTokenFp` 鍵名，並在註解說明為何**不能**叫 `pushToken`。<br>Renamed to `pushTokenFp`, with a comment explaining why it must not be called `pushToken`. |
| **註記 Note** | 這是「過度遮蔽」而非資安漏洞 —— 遮蔽機制本身被證明有效。<br>This was over-redaction, not a leak: the mechanism was proven to work. |

### 🟡 D-6 政策改變後遺留的死錯誤碼
### 🟡 D-6 A dead error code left behind by a policy change

| | |
|---|---|
| **問題 Problem** | 決策一把「整筆拒絕」改成「部分接受」後，`UNKNOWN_RECIPIENT` 錯誤碼再也不會被丟出，但仍留在契約與錯誤工廠中。<br>After Decision 1, `UNKNOWN_RECIPIENT` could no longer be thrown, yet remained in the contracts and the error factory. |
| **為什麼要刪 Why remove it** | 留著會讓日後讀 code 或寫整合的人以為 API 仍會回這個錯，寫出永遠不會執行的處理分支。<br>Leaving it would lead integrators to handle a response the API can no longer produce. |
| **修復 Fix** | 從 `packages/contracts/src/common.ts` 與 `apps/api/src/lib/errors.ts` 移除。<br>Removed from both. |

### 🟡 D-7 兩份設定 schema 都缺少 `silent` 日誌等級
### 🟡 D-7 `silent` log level missing from both config schemas

測試執行時需要靜音日誌，否則一次斷言失敗會被數千行 pino 輸出淹沒。兩個 workspace 的 `LOG_LEVEL` zod enum 都需補上 `silent`。
Tests need silenced logging or a single failed assertion is buried under thousands of pino lines. Both workspaces' `LOG_LEVEL` enums needed `silent` added.

### 🟡 D-8 過度取巧的進入點判斷
### 🟡 D-8 An over-clever entry-point guard

ops-server 原本用 `import.meta.url` 與 `process.argv[1]` 比對來判斷「是否被直接執行」，脆弱且難懂。改為與 api 相同的結構：`server.ts` 負責建構、`main.ts` 負責啟動。
The ops server originally compared `import.meta.url` against `process.argv[1]` to detect direct execution — fragile and opaque. Replaced with the same structure as the API: `server.ts` builds, `main.ts` starts.

---

## II.6 送達確認的天花板 / The acknowledgement ceiling

> 這張表是整個專案**最容易騙到自己**的地方：模擬器能給的確定性，正式環境給不了。
>
> This table is where the project is most likely to fool itself: the certainty the simulator provides is not available in production.

| 層級 Level | 資料庫狀態 DB status | 能證明什麼 Proves | Phase B 是否可得 Available in Phase B? |
|---|---|---|---|
| ① ticket | `ACCEPTED` | 供應商收下請求 Provider accepted the request | ✅ 可得 Yes |
| ② receipt | `DELIVERED` | 已交給 FCM/APNs 傳輸層 Handed to the transport | ✅ 可得 Yes |
| ③ 裝置確認 Device confirmation | `DEVICE_CONFIRMED` | **手機真的收到** The handset actually received it | ❌ **不可得** — FCM/APNs 不提供 per-message 即時回呼<br>**No** — no per-message realtime callback to your server |
| ④ 系統攔截 OS suppression | `SUPPRESSED` | 到了裝置但系統未顯示 Arrived but the OS did not display it | ⚠️ 需 App 回報 Requires the app to report it |
| ⑤ 人確認 Human ack | `ACKED` / `RESOLVED` | **人真的看到了 / 處理了** A human saw it / dealt with it | ✅ 可得（唯一的真憑證）Yes — the only real proof |

### 三條必須寫進正式系統的規則 / Three rules that must survive into production

**中文：**
1. **`DEVICE_CONFIRMED` 在 Phase B 永遠不會亮。** 換到 FCM/APNs 之後，「裝置收到了」只能靠 App 自己回報，而 iOS 靜默推播從不保證送達、Android OEM 省電機制會殺背景 App。任何依賴這一格的邏輯都會靜默停止運作。
2. **ack 沒回來 ≠ 沒送到。** 手機關機、在電梯裡、App 被小米/華為的省電管理殺掉 —— 這些都讓 ack 不回來，但通知可能正躺在通知欄。因此**逾時要升級（escalate），不是重推（retry）**，否則訊號不良時會瘋狂重送。
3. **`SUPPRESSED` 是最有說服力的一格：確定送達、確定沒被看到。** 單看送達報告，這會被算成成功。

**English:**
1. **`DEVICE_CONFIRMED` will never light up in Phase B.** After the FCM/APNs swap, device receipt can only come from the app itself — and iOS silent push is never guaranteed while Android OEM battery managers kill background apps. Any logic depending on this column stops working silently.
2. **A missing acknowledgement is not proof of non-delivery.** Escalate on timeout; never "retry harder", which floods the user whenever signal is poor.
3. **`SUPPRESSED` is the sharpest state: provably arrived, provably unseen.** A delivery report alone would score it a success.

這三條警告已寫入三處程式碼註解（`provider.ts`、schema 的 `deviceConfirmedAt` 欄位、`receipts.ts` 的狀態轉換處），確保未來實作 Phase B 的人必然會看到。
These warnings are embedded in three code comments (`provider.ts`, the schema's `deviceConfirmedAt` column, and the transition in `receipts.ts`) so whoever implements Phase B cannot miss them.

---

## II.7 已驗證與未驗證 / What is proven and what is not

### ✅ 已驗證（有測試佐證）/ Proven, with tests

| 項目 Item | 佐證 Evidence |
|---|---|
| 完整鏈路可行 The full chain works | 端到端測試走完「營運事件 → 簽章 webhook → 告警 → 推播 → 手機 → 認證取詳情 → 人 ack」，使用**真實 HTTP 與真實 WebSocket**<br>End-to-end test over real HTTP and a real WebSocket |
| HMAC 驗簽正確 HMAC verification is correct | 對「重新序列化的 JSON」簽章必定驗不過（測試證明）<br>A signature over re-serialised JSON provably fails |
| 簽章防護有效 The signature control works | 錯誤簽章與無簽章皆回 401、不建立告警、零推播<br>Bad and missing signatures: 401, no alarm, no push |
| 雙層去重有效 Dual deduplication works | 同 eventId 重送、不同 eventId 同 dedupKey、三筆並發 —— 皆只產生一則告警與一次推播<br>Retry, same-dedupKey, and 3-way concurrent delivery each yield exactly one alarm and one dispatch |
| 去重鍵的價值可量化 The dedup key's value is quantified | 抖動 6 次：有去重鍵 → 手機響 1 次；無去重鍵 → 響 6 次<br>Six flaps: one buzz with a dedup key, six without |
| 分塊對應正確 Chunk mapping is correct | 150 台裝置強制跨兩個批次，逐筆驗證每個 ticket 屬於它真正被送去的裝置<br>150 devices across two chunks; every ticket verified against its own device |
| 授權不洩漏存在性 Authorisation leaks nothing | 「別人的告警」與「不存在的告警」回應在狀態碼、錯誤碼、訊息三者上完全相同<br>Another user's alarm and a nonexistent one return byte-identical responses |
| 死 token 會被清理 Dead tokens are cleaned up | 送出後才解除安裝 → 回條回報 `DeviceNotRegistered` → 裝置停用 → 下一則告警不再送給它<br>Uninstall after send → receipt reports it → device deactivated → excluded next time |
| 推播不含敏感內容 Push carries no sensitive content | 斷言 payload 中不存在告警詳情數值<br>Asserts the detail values are absent from the payload |

### ⚠️ 未驗證 / NOT proven — 必須在 Phase B 重測 / must be retested

| 項目 Item | 為什麼未驗證 Why not proven |
|---|---|
| **PostgreSQL 並發行為** PostgreSQL concurrency | 「三筆並發只產生一筆告警」的測試在 **SQLite** 上通過。SQLite 是單寫入者模型，它證明了**程式邏輯路徑正確**（唯一索引攔截 + P2002 處理分支確實被走到），**沒有證明** PostgreSQL 在真實併發下的表現。<br>The concurrency test passed on **SQLite**, a single-writer engine. It proves the *code path* is correct (the unique index fires and the P2002 branch executes); it does **not** prove PostgreSQL's behaviour under real concurrency. |
| **真實 FCM / APNs 行為** Real FCM/APNs behaviour | 模擬器的 WebSocket 是可靠通道。真實推播的節流、延遲、OEM 省電機制、iOS 靜默推播限制**都無法在此重現**。<br>The simulator's WebSocket is reliable. Real-world throttling, delay, OEM battery managers and iOS silent-push limits cannot be reproduced here. |
| **App 層 ack 的可靠度** App-level ack reliability | Phase A 的 WS ack 必定送達；Phase B 的 App ack 是 best-effort。<br>The Phase A WebSocket ack always arrives; a Phase B app ack is best-effort. |
| **多廠牌 Android 實機** Multi-vendor Android hardware | 小米 / 華為 / OPPO 的背景限制需實機測試。<br>Xiaomi / Huawei / OPPO background restrictions require physical devices. |

---

## II.8 測試清單 / Test inventory

**143 個測試 / 11 個檔案 — 143 tests across 11 files**

| 檔案 File | 測試數 Tests | 涵蓋 Covers |
|---|---|---|
| `unit/signature.test.ts` | 13 | HMAC 驗簽、畸形簽章不拋例外、重新序列化必定失敗 |
| `unit/adapters.test.ts` | 23 | standard 與 legacy-ops-v1 正規化、時間戳三種格式、拒絕未知格式 |
| `unit/push-token.test.ts` | 26 | token 建構/驗證 round-trip 不變式（D-1 的防護）|
| `unit/logger.test.ts` | 3 | token 指紋絕不洩漏完整值 |
| `integration/auth-devices.test.ts` | 12 | 登入、refresh 輪替、裝置改綁、token 格式 |
| `integration/alarms.test.ts` | 13 | 授權 404、逐人已讀、cursor 分頁、篩選 |
| `integration/webhook.test.ts` | 13 | 簽章、schema、雙層去重、並發、轉接器 |
| `integration/push-delivery.test.ts` | 15 | 扇出、分塊對應、回條、死 token、帳本狀態 |
| `integration/acknowledge.test.ts` | 12 | ack/resolve 分離、不倒退、逐人獨立、部分收件人 |
| `integration/end-to-end.test.ts` | 4 | 真實 HTTP + 真實 WebSocket 完整旅程 |
| `integration/ops-server.test.ts` | 9 | 跨行程整合、故障注入、感測器抖動、legacy 格式 |

---

## II.9 待辦 / Open items

### 待完成階段 Remaining phases
- **P4** — 三欄模擬網頁：左欄觸發台、中欄事件流與逐人帳本、右欄手機模擬器。這是要拿去向客戶展示的畫面。
  The three-column simulation page — the screen intended for the customer demonstration.
- **P5** — README 開發歷程與 PROMPT.md 重建規格（中英雙語）。
  README development history and the bilingual PROMPT.md rebuild specification.

### 上線前必須處理 Must be addressed before production

| # | 項目 Item |
|---|---|
| 1 | `/v1/admin/*` 端點**目前無認證**。本機模擬可接受（操作台即自己的螢幕），任何超出 localhost 的部署必須先加管理員角色。<br>`/v1/admin/*` is **unauthenticated**. Acceptable for a local simulation; any deployment beyond localhost must gate it behind an admin role first. |
| 2 | 換 PostgreSQL 後重測並發去重。<br>Retest concurrent deduplication after moving to PostgreSQL. |
| 3 | 實作 `ExpoPushProvider`（或 FCM/APNs 直連）並移除 `DEVICE_CONFIRMED` 的依賴。<br>Implement `ExpoPushProvider` and remove any dependence on `DEVICE_CONFIRMED`. |
| 4 | 逾時升級（escalation）政策層 —— 帳本已支援，政策未實作。<br>The escalation policy layer — the ledger supports it, the policy is not implemented. |
| 5 | Apple Developer Program 註冊（約 US$99/年，需數日，會擋住 iOS 階段）。<br>Apple Developer Program enrolment (~US$99/yr, takes days, blocks the iOS phase). |

### Part I §17 中仍未回答的問題 Still-unanswered questions from Part I §17

以下問題的答案會直接影響 Phase B 的轉接器與路由邏輯，目前以模擬值代替：
These determine the Phase B adapter and routing logic; simulated values stand in for now:

1. 客戶營運伺服器的實際事件格式為何？What exact event format does the customer's server produce?
2. 經理如何識別 —— email、員工編號、既有帳號 ID、或 SSO？How are managers identified?
3. 告警路由規則 —— 全員收到，還是依站點 / 團隊 / 角色？Routing — everyone, or by site / team / role?
4. 預期告警量與尖峰突發率？Expected alarm volume and peak burst rate?
5. 合規要求（GDPR / 個資法 / 稽核保存期限）？Compliance and retention requirements?

---

*Part II 撰寫於 2026-08-11，記錄 P0–P3 完成時的狀態。*
*Part II written 2026-08-11, recording the state at completion of P0–P3.*
