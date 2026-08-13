# Conversation Summary — Mobile Notification System Research & Design

**Date:** 2026-08-11
**Participants:** User (building a mobile alarm-notification app) + JARVIS
**Deliverables produced:** `app_plan.md` (1604-line AI-executable build spec), `summary.md` (this file)

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
