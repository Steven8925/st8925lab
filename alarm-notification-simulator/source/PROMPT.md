# PROMPT.md — 重建規格 / Rebuild Specification

**專案 Project:** Mobile Alarm Notification System — Phase A Simulation Platform
**版本 Version:** 對應 2026-08-12 P0–P4 完成狀態 / as of P0–P4 completion, 2026-08-12
**狀態 Status:** Phase A 模擬平台功能完整 / Phase A simulation platform feature-complete

---

## 0. 本文件的定位 / What this document is

### 中文

**這是唯一的權威規格。** 一個 AI 只讀本檔案，應能重建出與現況功能等價的系統。

本文件的每一個值 —— schema 欄位、端點路徑、enum 成員、環境變數名稱與預設值、埠號、狀態轉換規則 —— **皆於撰寫當下自現行原始碼逐項讀取核對**，非憑記憶或依據較舊文件推導。

**與其他文件的關係：**

| 文件 | 用途 | 何時看它 |
|---|---|---|
| **PROMPT.md**（本檔）| 現行系統規格 | 要重建、要整合、要知道「現在是怎樣」 |
| `README.md` → `# 開發歷程` 區段 | 開發歷程 | 要知道「為什麼是這樣」「當初為何改變決定」 |
| `README.md` → `Javis 20260811` 之後的區段 | 2026-08-11 原始規格 | ⚠️ 僅供歷史參考，**部分已被本文件取代** |
| `discussion_summary_0811.md` | 研究與實作討論紀錄 | 要看已查證事實、已知陷阱、被推翻的主張 |
| `requirement/` | 收到當天的原始輸入，未經修改 | 要回溯「最初收到什麼」 |

**重要：本文件只描述現況。** 被推翻的設計決策不在此，那些在 README 的開發歷程裡。重建規格若記載已被取代的行為，那個行為就會被重建出來。

### English

**This is the sole authority.** An AI reading only this file should be able to rebuild a functionally equivalent system.

Every value here — schema columns, endpoint paths, enum members, environment variable names and defaults, ports, state-transition rules — was **read from the current source at writing time**, not recalled.

**This document describes only the current state.** Reversed design decisions live in README's development history, not here. A rebuild spec that documents superseded behaviour will cause it to be rebuilt.

---

## 1. 系統目的 / Purpose

### 1.1 兩階段策略 / The two-phase strategy

```
Phase A（現在 / current）             Phase B（之後 / later）
─────────────────────────            ─────────────────────────
模擬營運伺服器  apps/ops-server   →   客戶真實營運伺服器
通知服務        apps/api          →   同一份程式碼，不變 (unchanged)
WebSocket 推播  SimulatorProvider →   Expo Push / FCM / APNs
瀏覽器手機模擬  apps/web          →   React Native App (Android 先, iOS 後)
SQLite                            →   PostgreSQL
```

**核心約束 / The governing constraint:**

> 凡是 Phase A 專屬的東西，都必須被隔離在明確的介面之後，否則 Phase B 會變成重寫而不是替換。
>
> Anything specific to Phase A must sit behind an explicit interface, or Phase B becomes a rewrite rather than a swap.

### 1.2 三條不可違反的設計規則 / Three inviolable design rules

| # | 規則 Rule | 為什麼 Why |
|---|---|---|
| 1 | **推播是提示，資料庫才是真相**<br>Push is a hint; the database is the truth | 推播必然會掉。App 每次前景化都必須重新拉取清單。<br>Push will be lost. The app refetches the list on every foreground. |
| 2 | **推播內容只帶 ID，絕不帶詳情**<br>The payload carries an ID only | 內容會經過 Google/Apple 並顯示在鎖定畫面。詳情一律走認證 API 取得。<br>Content passes through third parties and lands on lock screens. |
| 3 | **ticket ≠ 送達，receipt ≠ 人看到了**<br>A ticket is not a delivery; a receipt is not "seen" | 只有人的明確 ack 能證明有人被通知到。<br>Only an explicit human acknowledgement proves a person was reached. |

---

## 2. 技術堆疊 / Technology stack

### 2.1 執行環境 / Runtime

| 項目 Item | 版本 Version | 備註 Note |
|---|---|---|
| Node.js | ≥ 20（開發用 24.16.0）| `package.json` `engines.node` |
| npm workspaces | 11.x | 不用 pnpm — 本機無 pnpm<br>Not pnpm — unavailable locally |
| Docker | **不使用 not used** | 本機無 Docker，故資料庫改用 SQLite<br>Unavailable, hence SQLite |

### 2.2 依賴 / Dependencies（`apps/api`，自 `package.json` 讀取）

```
fastify                        ^5.11.3
@fastify/cors                  ^11.3.0
@fastify/helmet                ^13.1.0
@fastify/jwt                   ^10.2.1
@fastify/rate-limit            ^11.2.0
@fastify/websocket             ^11.3.0
fastify-plugin                 ^6.0.0
@prisma/client                 ^7.9.1
@prisma/adapter-better-sqlite3 ^7.9.1
better-sqlite3                 ^13.0.3
@node-rs/argon2                ^2.0.2
pino                           ^10.3.1
pino-pretty                    ^13.1.3
zod                            ^3.25.76
dotenv                         ^17.4.2
```

測試 / testing: `vitest`、`ws`、`@types/better-sqlite3`、`tsx`、`typescript`、`prisma`

### 2.3 目錄結構 / Repository layout

```
alarm-notification-system/
├── apps/
│   ├── api/                        通知服務 notification API (:3000)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/         20260811100502_init,
│   │   │   │                       20260811103839_recipient_ack_ledger,
│   │   │   │                       20260813150224_alarm_reference_code
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── alarms/             ingest.ts, repository.ts, reference.ts
│   │   │   ├── auth/               password.ts, tokens.ts
│   │   │   ├── db/                 prisma.ts, json.ts
│   │   │   ├── events/             bus.ts
│   │   │   ├── ingest/             source-poller.ts, source-reader.ts（拉取模式 pull mode）
│   │   │   ├── lib/                errors.ts, duration.ts, sse.ts
│   │   │   ├── maintenance/        retention.ts（測試資料保留清除器 retention sweeper）
│   │   │   ├── notifications/      provider.ts, dispatch.ts, dispatcher.ts,
│   │   │   │                       receipts.ts, factory.ts, token.ts, format.ts,
│   │   │   │                       recipient-state.ts, simulator/{hub,provider}.ts
│   │   │   ├── plugins/            auth.ts
│   │   │   ├── routes/             auth, devices, alarms, acknowledge,
│   │   │   │                       internal, admin
│   │   │   ├── webhooks/           signature.ts, adapters/{index,types,standard,
│   │   │   │                       legacy-ops-v1,sensor-threshold-v1}.ts
│   │   │   ├── ws/                 device.ts
│   │   │   ├── config.ts  logger.ts  server.ts  main.ts
│   │   └── tests/                  unit/ (7 檔), integration/ (10 檔) —— 見 §13
│   ├── ops-server/                 模擬營運伺服器 simulated ops server (:4000)
│   │   └── src/                    scenarios.ts, webhook-client.ts, event-log.ts,
│   │                               routes.ts, sensors.ts, sensor-routes.ts,
│   │                               source-store.ts, config.ts, logger.ts,
│   │                               server.ts, main.ts
│   └── web/                        模擬網頁 simulation console (:5173)
│       ├── index.html  vite.config.ts  tsconfig.json  package.json
│       └── src/
│           ├── api/                client.ts (fetch 封裝), types.ts (console 專用型別)
│           ├── components/         SensorPanel, TriggerConsole, EventStream, Ledger,
│           │                       Phone, DeviceQueues, ui.tsx + 各自的 .css
│           ├── hooks/              useEventStream.ts (SSE), usePhone.ts (WS 手機)
│           ├── styles/             tokens.css, global.css
│           └── App.tsx  main.tsx  app.css  vite-env.d.ts
├── packages/
│   └── contracts/src/              index, enums, common, auth, device, alarm,
│                                   reference, events, simulator, client
├── data/                           SQLite 檔案（gitignored）
├── docs/
├── requirement/                    原始輸入，未經修改 untouched originals
├── .env / .env.example
├── package.json                    npm workspaces 根 root
└── tsconfig.base.json
```

---

## 3. 環境變數 / Environment configuration

**單一 `.env` 於 repo 根目錄**，三個 app 共用。`apps/api/src/config.ts` 與 `apps/ops-server/src/config.ts` 各自以 Zod 驗證並**啟動時失敗即拒絕啟動**（fail fast）。

A single root `.env` shared by all apps; each validates with Zod and **refuses to start** on misconfiguration.

| 變數 Variable | 型別/預設 Type / default | 用途 Purpose |
|---|---|---|
| `NODE_ENV` | `development｜test｜production` = `development` | |
| `LOG_LEVEL` | `silent｜fatal｜error｜warn｜info｜debug｜trace` = `info` | `silent` 供測試用 for tests |
| `API_PORT` | int 1–65535 = `3000` | |
| `DATABASE_URL` | string, 必填 required | `file:./data/dev.db` |
| `JWT_SECRET` | string, **min 32** | |
| `JWT_ACCESS_TTL` | string = `15m` | 格式 `\d+[smhd]` |
| `JWT_REFRESH_TTL` | string = `30d` | 同上 |
| `INTERNAL_WEBHOOK_SECRET` | string, **min 32** | **必須與 `JWT_SECRET` 不同** |
| `PUSH_PROVIDER` | `simulator｜expo` = `simulator` | |
| `SIMULATOR_RECEIPT_DELAY_MS` | int 0–60000 = `3000` | ticket→receipt 的模擬延遲 |
| `EXPO_ACCESS_TOKEN` | string, 選填 optional | Phase B |
| `EXPO_PROJECT_ID` | string, 選填 optional | `PUSH_PROVIDER=expo` 時**必填** |
| `TEST_DATA_RETENTION_DAYS` | int 0–3650 = `3` | 模擬資料保留天數，`0` 停用。**主控台標題會把這個數字講給操作者聽，因此它由 `maintenance/retention.ts` 的清除器實際執行，不是只顯示。** UI 的數字取自 `GET /v1/admin/policy`，與清除器讀同一份設定 —— 寫死在前端會讓宣告與行為無聲分岔。<br>Enforced, not merely displayed; the UI reads the same config the sweeper uses. |
| `TEST_DATA_RETENTION_SWEEP_MS` | int 60000–86400000 = `3600000` | 清除掃描間隔 |
| `ALARM_REFERENCE_TIMEZONE` | string min 1 = `Asia/Taipei` | 告警編號日期所依據的**唯一**時區，也決定每日序號在哪個時區的午夜歸零。**不得改為每台裝置各自的時區**（§4.5）。啟動時以 `Intl.DateTimeFormat` 驗證，無效即拒絕啟動。<br>The single timezone reference codes are dated in. Validated at startup. |
| `CORS_ORIGIN` | string = `http://localhost:5173` | 逗號分隔 comma-separated |
| `SEED_MANAGER_EMAIL` | email = `manager@demo.local` | |
| `SEED_ADMIN_EMAIL` | email = `admin@demo.local` | |
| `SEED_PASSWORD` | string min 8, 選填 optional | |
| `OPS_PORT` | int = `4000` | ops-server |
| `NOTIFICATION_API_BASE_URL` | url = `http://localhost:3000` | ops-server |
| `OPS_CORS_ORIGIN` | string = `http://localhost:5173` | ops-server |
| `VITE_API_BASE_URL` | url = `http://localhost:3000` | web |
| `VITE_OPS_BASE_URL` | url = `http://localhost:4000` | web |
| `VITE_DEMO_PASSWORD` | string, 選填 optional | web。**僅開發便利**：預填手機登入密碼欄。Vite 會把所有 `VITE_*` **內聯進前端 bundle**，絕不可放入正式建置。<br>**Dev convenience only** — Vite inlines every `VITE_*` into the client bundle. |

> ⚠️ **`apps/web/vite.config.ts` 必須設定 `envDir` 指向 repo 根目錄。**
> Vite 預設只在自己的專案目錄（`apps/web/`）找 `.env`，但本專案共用單一根目錄 `.env`。
> 少了 `envDir`，三個 `VITE_*` 會**全部無聲地退回預設值** —— 在 `.env` 改埠號後，API 搬家而 console 仍呼叫舊位址，任何地方都不會報錯。
> Without `envDir`, every `VITE_*` silently falls back to its default and a port
> change in `.env` moves the API while the console keeps calling the old one.

### 3.1 啟動時的跨欄位檢查 / Cross-field checks at startup

實作於 `apps/api/src/config.ts` 的 `load()`：

1. `JWT_SECRET === INTERNAL_WEBHOOK_SECRET` → 拋錯。兩者用途不同，共用會讓一個外洩同時毀掉兩道防線。
   Throws — sharing them means one leak breaks both defences.
2. `PUSH_PROVIDER === "expo"` 且無 `EXPO_PROJECT_ID` → 拋錯。
2a. `ALARM_REFERENCE_TIMEZONE` 以 `new Intl.DateTimeFormat("en-CA", { timeZone })` 試建，失敗即拋錯。**這道檢查是必要的**：執行期的 `alarmDateKey()` 刻意在時區無效時退回主機時區而不拋錯（無效時區絕不能導致告警掉失），所以若不在啟動時擋下，一個拼錯的時區會讓**每一個編號都無聲地落在錯誤的日期**，而且永遠不會有任何東西抱怨。
   Required precisely *because* the runtime formatter falls back silently — without this check a typo would misdate every code forever and nothing would complain.
3. `resolveDatabaseUrl()`：相對的 `file:` URL 錨定到 repo 根目錄，否則從 repo 根執行 API、從 `apps/api` 執行 Prisma CLI 會**無聲地開到兩個不同的資料庫**。
   Relative `file:` URLs are anchored to the repo root; otherwise the API and the Prisma CLI silently open different databases.

---

## 4. 資料模型 / Data model

### 4.1 可攜性約束 / Portability constraints（**必須遵守 must be honoured**）

Schema 以 SQLite 為目標，但寫法確保切換 PostgreSQL 只需改 datasource + 重新產生 migration，**應用程式碼零修改**：

| 不使用 Avoided | 改用 Used instead | 位置 Where |
|---|---|---|
| `enum` 區塊 | `String` 欄位 + Zod union | `packages/contracts/src/enums.ts` |
| `Json` 欄位 | `String` 存 JSON 文字 | 透過 `src/db/json.ts` 型別化存取 |
| `@db.Uuid` | `String @default(uuid())` | |

**所有 UNIQUE 約束與索引與原 PostgreSQL 設計一致，沒有任何一項為了 SQLite 便利而放寬。**
Every UNIQUE constraint and index matches the original PostgreSQL design; none were relaxed.

### 4.2 資料表 / Tables

完整定義見 `apps/api/prisma/schema.prisma`。以下為重建所需的約束重點：

| 資料表 Table | 主鍵 PK | 關鍵約束 Key constraints |
|---|---|---|
| `users` | `id` uuid | `email` UNIQUE |
| `refresh_tokens` | `id` uuid | `token_hash` UNIQUE；index `user_id` |
| `devices` | `id` uuid | **`push_token` UNIQUE**；index `(user_id, active)` |
| `alarms` | `id` uuid | **`dedup_key` UNIQUE**、**`reference` UNIQUE**；index `created_at`、`(severity, created_at)` |
| `alarm_recipients` | `(alarm_id, user_id)` | index `user_id`、`state` |
| `alarm_unresolved_recipients` | `id` uuid | UNIQUE `(alarm_id, identifier)`；index `alarm_id` |
| `alarm_reads` | `(alarm_id, user_id)` | index `user_id` |
| `push_deliveries` | `id` uuid | **UNIQUE `(alarm_id, device_id)`**；index `(status, created_at)` |
| `webhook_events` | `id` uuid | **UNIQUE `(source, event_id)`** |
| `alarm_sequences` | `(device_key, date_key)` | 無其他約束；**複合主鍵本身就是每日歸零機制**（見 §4.5）<br>No other constraints; the composite PK *is* the daily reset |

### 4.3 五個 UNIQUE 約束各自防止什麼 / What each UNIQUE prevents

> 這五個是整條管線正確性的來源。**移除任何一個都會產生無聲的錯誤行為。**
> These five are where the pipeline's correctness comes from. Removing any produces silent misbehaviour.

| 約束 Constraint | 防止的具體事故 The specific incident it prevents |
|---|---|
| `devices.push_token` | 使用者 A 收到使用者 B 的告警（裝置轉手或重裝後 token 移轉）。**這是隱私事故，不是理論風險。**<br>User A receiving user B's alarms after a device handover or reinstall. **A real privacy incident.** |
| `alarms.dedup_key` | 抖動的感測器在凌晨三點發出 40 則通知 → 經理永久關閉通知 → 系統對他而言失效。<br>A flapping sensor producing 40 notifications at 3am → the manager disables notifications permanently. |
| `push_deliveries (alarm_id, device_id)` | Webhook 重試導致同一裝置被通知兩次。<br>A webhook retry double-notifying the same device. |
| `webhook_events (source, event_id)` | 逾時重送（第一次其實成功了）建立第二則告警。<br>A retry after timeout — where the first attempt actually succeeded — creating a second alarm. |
| `alarms.reference` | 兩則告警共用同一個編號 → 交接單或電話上指的「TANK01-20260813-07」變成有兩種意思。<br>Two alarms answering to one code, making "TANK01-20260813-07" ambiguous on a handover sheet or a phone call. |

### 4.4 兩層帳本 / The two-layer ledger（**架構關鍵 architecturally critical**）

```
alarm_recipients   邏輯層：每位「應收此告警的人」一列，獨立追蹤
                   Logical: one row per intended human recipient
                   PENDING → DELIVERED → ACKED → RESOLVED
                           ↘ UNDELIVERABLE

push_deliveries    物理層：每次「送往一台裝置」的嘗試一列
                   Physical: one row per attempt to one device
                   PENDING → ACCEPTED → DELIVERED → DEVICE_CONFIRMED
                                     ↘ SUPPRESSED / FAILED / INVALID_TOKEN
```

**不得合併這兩層。** 結案政策（全員必須 ack／任一人 ack 即結案／逾時升級）是**疊在帳本之上的另一層**，它讀取帳本，不取代帳本。把一群經理折疊成單一列，會讓「B 的手機到底有沒有收到」**永遠無法回答** —— 而這個問題事後無法重建。

**Do not merge these layers.** The closure policy is a separate layer that *reads* the ledger. Collapsing a group into one row makes "did B's phone actually get it?" permanently unanswerable.

### 4.5 告警編號 / Alarm reference codes

格式 Format：**`DEVICEKEY-YYYYMMDD-NNN`**，例如 `TANK01-20260811-99`、`TANK02-20260813-1001`。

實作位置 Implementation:

| 職責 Responsibility | 檔案 File |
|---|---|
| 格式（正規化、日期鍵、序號寬度、組合／解析、單行標籤） | `packages/contracts/src/reference.ts` |
| 配號（讀寫 `alarm_sequences`）、`deviceKeyForAlarm(deviceId)` | `apps/api/src/alarms/reference.ts` |
| 裝置識別的宣告（必填欄位）| `apps/api/src/webhooks/adapters/types.ts` |
| 呼叫點（在建立告警的同一個交易內） | `apps/api/src/alarms/ingest.ts` |

#### 三段各自的規則 / The rule for each segment

| 段 Segment | 規則 Rule |
|---|---|
| `DEVICEKEY` | 取自 **`NormalisedAlarmEvent.deviceId`**（見下方「裝置識別是宣告過的契約」），移除所有非文字非數字字元並轉大寫：`TANK-01` → `TANK01`。**連字號必須移除**，因為它是編號本身的分隔符 —— 保留會產生 `TANK-01-20260813-01`，四段無法解析回去。保留非拉丁字母（`水槽-01` → `水槽01`），若剝成 ASCII 會讓所有中文命名裝置塌縮成同一組計數器。上限 `ALARM_DEVICE_KEY_MAX_LENGTH = 32`；截斷只損失可讀性，不損失唯一性（兩台裝置共用計數器時，序號仍讓每個編號互異）。**無 `details.deviceId` 時使用 `SYS_Manual_Test`**（見下節）。 |
| `YYYYMMDD` | `occurredAt`（**非** `createdAt`、**非**當下時鐘）在 `ALARM_REFERENCE_TIMEZONE`（預設 `Asia/Taipei`）的日曆日期。凌晨 00:05 才抵達的 23:58 事件屬於前一天 —— 編號說的是水槽何時過熱，不是輪詢器何時取件。 |
| `NNN` | 正整數，從 1 起算，`padStart(2, "0")`：`01`、`09`、`99`、`100`、`199`、`1001`。**補到兩碼後自然增長**；截斷在兩碼會導致回繞（兩則告警同編號）或停滯（當天第 100 則沒有編號）。 |

#### 裝置識別是宣告過的契約 / Device identity is a declared contract

`NormalisedAlarmEvent.deviceId: string | null` —— **必填欄位，刻意不設為 optional。**

早期版本是從自由格式的 `details` 袋子裡撈 `details.deviceId`。那個設計以**最糟的方式無聲失敗**：

* 來源把欄位叫成 `device`、`equipment`、`assetId`、`tag`，或送的是**數字** `deviceId: 12345`
* → 不報錯、不寫 log
* → 每一則告警都被編為 `SYS_Manual_Test-…`，**所有設備共用同一組計數器**
* → 每一則真實事故被貼上「人工測試」
* → **編號依然格式正確**，所以沒有人會發現

`ops-server` 的情境正是這樣：它們用 `device: "UPS-2"`、`rack: "R12"`，這才是它們全部落到退回鍵的真正原因 —— 不是「沒有裝置」，而是**欄位拼法不同**。

改成契約上的必填欄位後，轉接器作者不可能略過這個問題：**漏掉就是編譯錯誤。**

各轉接器的對應（重建時必須保留）：

| 轉接器 | 來源怎麼叫它 | 對應方式 |
|---|---|---|
| `sensor-threshold-v1` | `deviceId` | 直接帶過 |
| `standard` | 頂層 `deviceId`（新）或 `details.deviceId`（舊慣例，仍支援）| `coerceDeviceId(parsed.deviceId) ?? coerceDeviceId(parsed.details?.deviceId)` |
| `legacy-ops-v1` | 埋在 `meta` 裡，名稱由廠商決定 | `meta.device` → `meta.equipment` → `meta.deviceId`，**這正是轉接層存在的意義** |

`coerceDeviceId()`（`packages/contracts/src/reference.ts`）接受 string、number、bigint，其餘回 `null` —— 數字資產編號極為常見，拒收它們會讓整個來源掉進退回鍵。它**不會**把物件硬轉成 `[object Object]`。

#### 沒有裝置的告警 / Alarms that name no device

`ALARM_REFERENCE_FALLBACK_DEVICE_KEY = "SYS_Manual_Test"` → `SYS_Manual_Test-20260813-01`

| 設計點 | 理由 |
|---|---|
| **刻意使用混合大小寫與底線** | `normaliseDeviceKey()` 會轉大寫並移除底線，因此**任何真實裝置 id 都不可能正規化成這個鍵**。讀者一眼就知道「這則告警沒有指定裝置」，而不是去猜 `SYS` 是哪一台設備。有測試以 `SYS_Manual_Test`、`sys-manual-test`、`SYS Manual Test` 三種寫法斷言不會碰撞。 |
| **解析器必須接受 `_`** | `parseAlarmReference()` 的第一段字元集為 `[\p{L}\p{N}_]`。底線安全，正因為它不是 `-` 分隔符。**若解析器拒絕自己的退回鍵，每一則無裝置告警的編號都會變成不可讀，而組合端仍然正常，因此失敗是無聲的。** 已寫成 round-trip 測試。 |
| **不再由 source 名稱推導** | 原本會產生 `OPERATIONSSERVER-20260813-02` —— 又長，而且引導讀者去找一台叫「OPERATIONSSERVER」的設備。移除沒有損失：是哪個系統發出的，`Alarm.source` 已經記錄，帳本與收件匣都看得到。 |
| **所有無裝置告警共用一組計數器** | 與每一台真實裝置的計數器互不干擾。 |

> ⚠️ **這個鍵同時斷言「這是人工測試」。** 對今天所有會走到它的呼叫者都成立（只有模擬網頁手動觸發的情境不帶 deviceId；感測器路徑一定帶）。**若 Phase B 出現真實來源合法地發出無裝置告警，這個鍵就變成謊言，必須改名。**
>
> The key also asserts "manual test" — true for every caller today, but a lie if Phase B introduces a real source that legitimately raises device-less alarms.

> 註：改名不會搬動舊資料。`alarm_sequences` 中舊的 `OPERATIONSSERVER` 列仍在，只是不再被使用；新鍵從 01 重新起算。這是鍵化計數器的正常行為，不是錯誤。
> Renaming the key does not migrate old rows: the previous key's counter is simply orphaned and the new one starts at 01.

#### 每日歸零是鍵的結果，不是排程 / The daily reset is a consequence of the key

`alarm_sequences` 以 `(device_key, date_key)` 為複合主鍵。跨過當地午夜後，新日期沒有對應列，第一則告警自然從 1 開始。

**不得改成午夜排程歸零。** 排程是一個「會在午夜、無聲地、正好在最要緊的那一晚失敗」的額外元件；鍵化之後沒有任何東西需要在 00:00 執行。同一個性質也讓遲到事件安全：它接續前一天的號碼，而不是與之衝突。

The composite key *is* the reset. Do not replace it with a scheduled midnight job.

#### 時區是全系統唯一的 / One system-wide timezone

日期**不得**取自讀者的手機時區。同一則告警會變成台北的 `…-20260813-01` 與倫敦的 `…-20260812-01`，客戶與廠商無法用同一個名字討論它。時區改為在通知內文中明確標示（§11A.3）。

`ALARM_REFERENCE_TIMEZONE` 在啟動時以 `Intl.DateTimeFormat` 驗證並在無效時**拒絕啟動**（§3.1）；執行期的 `alarmDateKey()` 則退回主機時區而**不拋錯** —— 錯誤的日期可以修，掉掉的告警不能。

#### 重複事件不得消耗號碼 / Duplicates must not consume a number

配號在建立告警的**同一個交易內**進行，且在兩層去重**之後**。抖動的感測器若能消耗序號，一則真實告警在天亮前會把該裝置的號碼推到 `…-40`，而數字會被讀成四十次事故。

`IngestResult.reference` 在重複時回傳**既有告警**的編號，不是新號碼。

#### 顯示規則 / Rendering

`formatAlarmLabel(title, reference)` → `水溫 紅燈告警 (TANK01-20260813-01)`；`reference` 為 null 時回傳裸標題。

單行字串場合一律走這個函式：推播標題、每一則伺服器事件訊息、營運伺服器的 note。React 面板改為結構化渲染（標題元素 + 編號元素），以便各自套用樣式與截斷 —— **編號永不截斷**（`TANK01-202608…` 看起來可引用卻不可引用，比沒有編號更糟）；需要截斷時截標題。

`reference` 可為 null：本方案之前建立的告警**沒有**編號，也**不得**回填。稽核軌跡裡被捏造的編號會被引用，然後對不到任何東西。

#### 為什麼 `sensor-threshold-v1` 的 title 不再帶裝置 / Why the adapter title dropped the device

原為 `水溫 紅燈告警（TANK-01）`。編號已含裝置，兩者併存會產生 `水溫 紅燈告警（TANK-01）(TANK01-20260813-07)` —— 同一個事實、兩種寫法，讀者會開始懷疑它們是否不同。輪詢器的 `source_row_picked_up` 訊息則**明確補上 deviceId**，因為取件發生在配號之前，該行還沒有編號可用。

---

### 4.6 測試資料保留 / Test-data retention

實作：`apps/api/src/maintenance/retention.ts`（`purgeExpiredTestData()` + `RetentionSweeper`），於 `main.ts` 啟動時掛上，關機時停止。

**為什麼存在：主控台標題向操作者宣告「測試資料只保留最近 N 天內的資訊與紀錄」。這種宣告必須由程式執行，不能只是一句話。** 一個宣告了保留政策卻沒人實作的介面，正是本專案花了一整個 session 從自己的備份文件裡清掉的那種缺陷 —— 讀者會以為舊資料早就不在了。

| | 內容 | 理由 |
|---|---|---|
| **會刪** | `alarms`（依 `createdAt`）| 「資訊與紀錄」對看畫面的人而言就是「我們何時存下它」。其 recipients／reads／deliveries／unresolved 由 `ON DELETE CASCADE` 一併帶走 |
| **會刪** | `webhook_events`（依 `receivedAt`）| **不會 cascade** —— 指向告警的欄位是純 String、沒有外鍵，只刪告警會讓冪等表無限成長 |
| **不刪** | `alarm_sequences` | 刪掉某個計數器，會讓該裝置該日期的下一則告警從 01 重新起算，**重新發出一個既有告警可能仍持有的編號** → 線上 ingest 撞上 UNIQUE 違反。為了省下幾十個位元組承擔這個風險不划算 |
| **不刪** | `users`、`devices` | 這不是「測試資料」；清掉經理的裝置註冊會讓他從此收不到告警 |

**`0` 代表停用，永遠不代表「全部刪除」。** 一個未設定的零，其破壞性解讀絕不能是意外發生的那一個。

**邊界用 `lt`：** 剛好滿 N 天的告警**留下**，不刪。

**UI 的數字不得寫死。** 主控台從 `GET /v1/admin/policy` 取得天數，與清除器讀同一份設定；若 API 沒回應，標題**不顯示任何宣告**（誠實地不講，勝過講一個沒查證的數字）。保留天數為 `0` 時同樣不顯示。

**掃描為 0 筆時刻意不發事件** —— 每小時一則「刪除 0 筆」會訓練操作者忽略這個事件，而真正重要的是非零的那幾則。掃描失敗**會**發 `test_data_purge_failed`：一個已經悄悄停止運作的保留政策，是主控台仍在向操作者宣告的政策。

---

## 5. 列舉值 / Enumerations

自 `packages/contracts/src/enums.ts` 逐項讀取 / read verbatim:

```ts
AlarmSeverity        INFO | WARNING | CRITICAL            (SEVERITY_RANK: 0 | 1 | 2)
WebhookSeverity      info | warning | critical            (線路格式 wire format, 小寫)
Platform             IOS | ANDROID | SIMULATOR
WirePlatform         ios | android | simulator            (線路格式 wire format)
UserRole             MANAGER | ADMIN
UnresolvedReason     UNKNOWN_USER | INACTIVE_USER
UndeliverableReason  NO_ACTIVE_DEVICE | ALL_TOKENS_INVALID | ALL_SENDS_FAILED

PushDeliveryStatus   PENDING | ACCEPTED | DELIVERED | DEVICE_CONFIRMED
                     | SUPPRESSED | FAILED | INVALID_TOKEN

AlarmRecipientState  PENDING | DELIVERED | ACKED | RESOLVED | UNDELIVERABLE
```

轉換函式 / conversion: `toAlarmSeverity()`、`toPlatform()`（皆為 `toUpperCase()`）。

### 5.1 `PushDeliveryStatus` 各狀態的意義 / Meaning of each status

| 狀態 | 意義 | Phase B 是否可得 |
|---|---|---|
| `PENDING` | 已排入，尚未交給供應商 | ✅ |
| `ACCEPTED` | 供應商收下請求並發出 ticket | ✅ |
| `DELIVERED` | 供應商回條表示已到達傳輸層 | ✅ |
| `DEVICE_CONFIRMED` | **手機本身確認收到** | ❌ **模擬器專屬 SIMULATOR-ONLY**（見 §8.4）|
| `SUPPRESSED` | 到達手機，但作業系統拒絕顯示（如 Android 13+ `POST_NOTIFICATIONS` 被拒）| ⚠️ 需 App 回報 |
| `FAILED` | 非 token 問題的永久失敗 | ✅ |
| `INVALID_TOKEN` | `DeviceNotRegistered` → 裝置列停用 | ✅ |

**`SUPPRESSED` 是整個模型中最尖銳的一格：確定送達、確定沒被看到。** 單看送達報告會把它算成成功。
**`SUPPRESSED` is the sharpest state: provably arrived, provably unseen.** A delivery report alone scores it a success.

### 5.2 `AlarmRecipientState` 的進度排名與轉換規則 / Ranking and transition rules

實作於 `apps/api/src/notifications/recipient-state.ts`：

```ts
RANK = { UNDELIVERABLE: 0, PENDING: 0, DELIVERED: 1, ACKED: 2, RESOLVED: 3 }
```

**規則 / Rules:**

1. **只能前進，不能後退。** `nextRank < currentRank` → 拒絕寫入並回傳 `false`。
   遲到的回條**不得**把已 ack 的告警打回 `DELIVERED`。
   Forward only; a late receipt must not knock an acknowledged alarm back.
2. **`UNDELIVERABLE` 與 `PENDING` 同為 rank 0，故非終局狀態。**
   當時沒有裝置的經理，之後安裝 App 並 ack，該成功必須能覆蓋先前的失敗。
   `UNDELIVERABLE` is not terminal — a manager who had no device can install the app and acknowledge later.
3. **同 rank 只允許一種寫入**：`PENDING → UNDELIVERABLE`（僅補上原因，不宣稱進度）。
   Equal-rank writes are allowed only for the `PENDING → UNDELIVERABLE` annotation.
4. **`resolve` 隱含 `ack`。** 使用者不可能處理完一件他從未看見的事，故 `resolve` 會一併補上 `ackedAt` 與 `deliveredAt`（若尚未設定）。
   Resolving implies acknowledgement: one cannot have dealt with something never seen.
5. **被系統攔截的推播不得推進「人」。** 實作於 `receipts.ts`：僅當
   `receipt.deviceConfirmed && !receipt.suppressedReason` 才寫入 `DELIVERED`。
   兩個條件**刻意互斥** —— 模擬器對同一筆回條會同時回報 `deviceConfirmed: true`
   與 `suppressedReason`，因為兩者對「裝置」而言都為真。
   A suppressed push must NOT advance the person; both flags are true of the
   device, so the two conditions are deliberately mutually exclusive.

> ⚠️ **這是兩層帳本的分界線，也是最容易做錯的地方。**
>
> 裝置列標成 `SUPPRESSED`（裝置確實收到了），但**人停在 `PENDING`**（人什麼都沒看到）。
> 若讓它推進成 `DELIVERED`，經理的名字旁邊會出現一個令人安心的狀態 ——
> 而那恰好是整套系統存在的目的：**確定送達、確定沒被看到**。
>
> The device row is `SUPPRESSED`; the person stays `PENDING`. Advancing them
> would put a reassuring state next to the manager's name in exactly the case
> this system exists to expose.
>
> 一人多機時，**只要有一台真正送達就足以觸達本人** —— 另一台被攔截不影響。
> With several devices, one genuine delivery is enough to reach the person.

⚠️ **`PENDING` 不是「未送達」的證據。** 手機關機、在電梯裡、App 被 OEM 省電機制殺掉，都會讓 ack 不回來，但通知可能正躺在通知欄。**逾時要升級（escalate），不是重推（retry）** —— 否則訊號不良時會瘋狂重送。
**`PENDING` is not evidence of non-delivery. Escalate on timeout; never retry harder.**

---

## 6. API 契約 / API contract

### 6.1 回應信封 / Response envelope

**所有**回應一律使用此形狀 / Every response uses this shape:

```jsonc
// 成功 success
{ "data": { /* ... */ }, "error": null }

// 失敗 failure
{ "data": null, "error": { "code": "...", "message": "...", "requestId": "..." } }
```

錯誤碼 / error codes（`packages/contracts/src/common.ts`）：

```
VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND
INVALID_SIGNATURE | RATE_LIMITED | INTERNAL_ERROR
```

### 6.2 端點總表 / Endpoint inventory

自原始碼掃描取得的完整清單 / complete list, scanned from source:

| 方法 | 路徑 Path | 認證 Auth | 說明 |
|---|---|---|---|
| GET | `/health` | — | 含資料庫連線狀態；DB 不通回 503 |
| POST | `/v1/auth/login` | — | 限流 10/分 rate-limited |
| POST | `/v1/auth/refresh` | — | 限流 30/分 |
| POST | `/v1/auth/logout` | — | 冪等 idempotent |
| POST | `/v1/devices/register` | JWT | |
| GET | `/v1/devices` | JWT | |
| GET | `/v1/alarms` | JWT | cursor 分頁 |
| GET | `/v1/alarms/unread-count` | JWT | **必須註冊在 `:alarmId` 之前** |
| GET | `/v1/alarms/:alarmId` | JWT | |
| POST | `/v1/alarms/:alarmId/read` | JWT | 冪等 |
| POST | `/v1/alarms/:alarmId/ack` | JWT | |
| POST | `/v1/alarms/:alarmId/resolve` | JWT | |
| POST | `/v1/internal/alarms` | **HMAC** | 限流 300/分 |
| GET | `/v1/internal/source-formats` | — | 可用的來源格式 |
| GET | `/v1/admin/users` | ⚠️ **無 none** | |
| GET | `/v1/admin/policy` | ⚠️ **無 none** | 主控台顯示用的非機密政策值（保留天數、參考時區）|
| GET | `/v1/admin/devices` | ⚠️ **無 none** | |
| GET | `/v1/admin/alarms/:alarmId/ledger` | ⚠️ **無 none** | 逐人+逐裝置帳本；含 `reference` |
| GET | `/v1/admin/simulator/queue?pushToken=` | ⚠️ **無 none** | 唯讀查看待送佇列 |
| POST | `/v1/admin/simulator/uninstall` | ⚠️ **無 none** | 模擬解除安裝 |
| GET | `/v1/admin/stream` | ⚠️ **無 none** | SSE 事件流 |
| WS | `/ws/device?token=<pushToken>` | push token | 手機模擬器通道 |

> ⚠️ **`/v1/admin/*` 目前完全沒有認證。** 本機模擬可接受（操作台就是自己的螢幕），**任何超出 localhost 的部署都必須先加上管理員角色**。見 §12。
> **`/v1/admin/*` is entirely unauthenticated.** Acceptable locally only; see §12.

### 6.3 授權規則 / Authorisation rules

| 規則 Rule | 實作 Implementation |
|---|---|
| 目前使用者一律取自**已驗證的 JWT**，**絕不**取自請求內容 | `plugins/auth.ts` → `request.currentUser` |
| 每次請求都重新查 DB 並檢查 `active` | 已停用的帳號**立即**失去存取權，即使仍持有未過期的 access token |
| 告警存取一律經由 `alarm_recipients` 檢查 | `alarms/repository.ts` |
| **「別人的告警」與「不存在的告警」回應完全相同** | 狀態碼、錯誤碼、訊息三者皆同 → 回 403 等於確認該告警存在 |

### 6.4 分頁 / Pagination

cursor = `base64url("<createdAt.getTime()>:<id>")`，排序 `createdAt DESC, id DESC`。
多取一列判斷是否還有下一頁（避免 COUNT 查詢）。

**不可改用 offset 分頁** —— 告警清單在兩次請求間新增資料是常態而非邊緣情況，offset 會漏列或重複。
**Do not use offset pagination**: new alarms arriving between page requests is the normal case, and offset would skip or repeat rows.

### 6.5 內部 webhook / Internal webhook

```
POST /v1/internal/alarms
Header: x-internal-webhook-signature: <HMAC-SHA256 hex, 64 chars>
Header: x-source-format: standard | legacy-ops-v1     (選填，預設 standard)
```

**簽章計算 / Signature:** `HMAC-SHA256(INTERNAL_WEBHOOK_SECRET, 原始請求位元組 raw request bytes)`

> ⚠️ **必須對原始位元組驗簽，不可對解析後重新序列化的 JSON。**
> `JSON.stringify(JSON.parse(body))` 不保證保留送方的 key 順序與空白，必定驗簽失敗。
> 這是整合時最常見的失敗原因，已寫成會失敗的測試（`tests/unit/signature.test.ts`）。
>
> **Sign the raw bytes.** Re-serialising does not preserve key order or whitespace and always fails.

**驗簽實作細節 / Verification details**（`webhooks/signature.ts`）：

1. 先檢查長度與字元集（`/^[0-9a-f]{64}$/`），**再**呼叫 `timingSafeEqual`。
   順序不可顛倒：`timingSafeEqual` 遇長度不符會拋例外，而該例外本身會洩漏預期長度，且會讓畸形 header 變成 500。
   Check length/charset **before** `timingSafeEqual` — it throws on length mismatch, which leaks the expected length and turns a malformed header into a 500.
2. 接受大寫與前後空白；**拒絕陣列型 header**（重複 header 攻擊面）。

**回應 / Response:**

```jsonc
{
  "data": {
    "alarmId": "uuid",
    "reference": "TANK01-20260813-07",   // 重複時為既有告警的編號 the EXISTING alarm's code
    "duplicate": false,
    "recipientCount": 2,
    "unresolvedRecipients": [{ "identifier": "left@corp.com", "reason": "INACTIVE_USER" }]
  },
  "error": null
}
```

> `unresolvedRecipients` **必須回報**。裸的 200 會讓來源系統記錄「經理已通知」，而實際上收件人清單裡的過期項目使其中一人**從未被定址**。部分送達之所以可接受，正是因為它被回報了。
>
> A bare 200 would let the source system record "manager notified" when a stale list entry meant one was never addressed. Partial delivery is acceptable *because* it is reported.

> `reference` 回傳給**呼叫方**，是為了讓客戶系統的稽核記錄能存下操作人員在電話上會講的同一個編號。少了它，客戶那側留下 UUID、我們這側留下編號，事後對照一起事故只能靠時間戳去 join 兩份日誌。
>
> `reference` is returned so the *calling* system can log the same code its operators will quote; otherwise correlating an incident means joining two logs by timestamp.

---

## 7. 告警擷取管線 / Alarm ingestion pipeline

### 7.0 兩種擷取方式 / Two ingestion modes

客戶系統分兩類，**兩者共用同一條管線**：

| 方式 Mode | 客戶系統的能力 | 我們的入口 |
|---|---|---|
| **推 Push** | 能主動發 HTTP POST | `POST /v1/internal/alarms`（HMAC 驗簽）|
| **拉 Pull** | **只寫入自己的資料庫，等人來讀** | `ingest/source-poller.ts`（定期輪詢）|

```
① webhook  →┐
             ├→ 轉接層 → 去重 → 告警 → 推播 → 手機   （這整段完全相同）
② 輪詢器   →┘
```

> ⚠️ **輪詢間隔就是告警延遲的下限。** 紅燈讀值最久要等一個完整間隔才會有人被通知。
> 這是「來源無法主動推送」的代價，也是為何 `SOURCE_POLL_INTERVAL_MS` 是設定值而非常數。
> The poll interval is the floor on alarm latency.

**擷取縫隙 / The ingestion seam**（`ingest/source-reader.ts`）：

```ts
export type SourceEventReader = {
  readonly name: string;
  /** 必須可安全重複呼叫：重複回傳一列可接受，漏掉一列不可接受。*/
  fetchPending(): Promise<unknown[]>;
};
```

Phase A 提供 `HttpSourceEventReader`（讀模擬營運伺服器）。正式環境新增一個對客戶資料庫下 cursor 查詢的實作，**下游完全不變**。

> **輪詢器只讀，不寫客戶的表。** 送到一半失敗時沒有任何 flag 值是正確的（三人送到兩人，flag 該是 1 還是 2？），送達狀態屬於我們自己的逐人帳本。
> The poller never writes to the customer's schema.

### 7.1 兩層結構 / Two layers

```
轉接層 Adapter layer     webhooks/adapters/*     ← 每個來源格式一個檔案
      ↓ 正規化為 NormalisedAlarmEvent
核心層 Core layer        alarms/ingest.ts        ← 永遠不因新來源而修改
```

**新增客戶格式 = 新增一個檔案 + 註冊表加一列。告警管線完全不動。**
Onboarding a customer format is one new file plus one registry entry. The pipeline is untouched.

`NormalisedAlarmEvent`（`webhooks/adapters/types.ts`）：

```ts
{
  eventId: string; source: string; severity: AlarmSeverity;
  title: string; body: string; occurredAt: Date;
  dedupKey: string | null;
  recipientUserIds: string[];   // 以內部 user id 指定
  recipientEmails: string[];    // 以 email 指定，於擷取時解析
  details: Record<string, unknown>;
}
```

**現有轉接器 / Registered adapters:**

| name | 說明 |
|---|---|
| `standard` | 本系統的正規格式（`alarmWebhookSchema`），預設 |
| `legacy-ops-v1` | **範例轉接器**：數字等級（1/2/3）、Unix 秒或毫秒或 ISO 時間戳、**以 email 指定收件人**。存在的目的是證明轉接縫隙確實會轉換 |
| `sensor-threshold-v1` | **門檻告警表**：設備 + 指標 + 讀值 + 黃／紅燈。輪詢模式使用（§7.5）|

### 7.2.1 `sensor-threshold-v1` 的兩個關鍵設計 / Two critical choices

**① 事件識別同時包含主鍵與建立時間：** `row-{id}-{createdAt 毫秒}`

主鍵單獨使用在表永久存在的前提下沒問題，但 **id 空間可以被重置** —— 被 truncate 或重建的表會從 1 重新開始，裸的 `row-1` 會與數月前已擷取的 id 撞號並被靜默判為重複。**壓掉一則真實告警，代價遠大於鍵長一點。**
An id space can be reset; a bare `row-1` would collide with an id ingested months ago and be silently suppressed.

**② 去重鍵包含燈號：** `{deviceId}:{metric}:{level}:{5分鐘桶}`

若不含 `level`，**同一個 5 分鐘桶內從黃燈升級到紅燈會被當成黃燈的重複而吞掉** —— 那正是最需要送出的那一則。
Without the level, an escalation from yellow to red inside one bucket would be swallowed as a duplicate of the yellow — suppressing precisely the alarm that matters most.

### 7.5 輪詢器行為 / Poller behaviour（`ingest/source-poller.ts`）

| 行為 | 說明 |
|---|---|
| 收件人 | **v1 固定為「所有啟用中的帳號」**。客戶的表不知道我們的使用者是誰，路由是我們的決定；`resolveRecipients` 是未來真實路由規則唯一的落點 |
| 重疊執行 | 若上一輪還在跑，這一輪直接跳過，避免重複讀取同一批資料列 |
| 來源讀取失敗 | 發出 `source_poll_failed`，不拋例外 |
| 單列格式錯誤 | 發出 `source_row_rejected`、略過該列，**批次其餘資料列照常處理** |
| 無人可通知 | 告警**仍然儲存**（丟棄它會摧毀「條件確實成立過」的唯一證據）|

未知格式 → 400，**不猜測** / Unknown format → 400, never guessed.

### 7.2 收件人解析 / Recipient resolution

實作於 `ingest.ts` 的 `resolveRecipients()`：

- 查詢時**不加 `active` 過濾**，以便區分 `UNKNOWN_USER`（設定打錯）與 `INACTIVE_USER`（員工離職）—— 兩者要找不同的人修。
  Looked up without the active filter so the two reasons are distinguishable; they need different fixes by different people.
- **無法對應的收件人不會使 webhook 失敗。** 告警照樣建立、送給所有可送達者，未對應者寫入 `alarm_unresolved_recipients`。

> **設計理由 / Rationale:** 拒絕整筆是先前的行為，已被推翻 —— 客戶設定檔裡一個過期的 email 不應讓整條告警鏈斷掉。**送達三人中的兩人勝過送不到任何人，前提是第三人的失敗被大聲記錄下來**，而這正是 `alarm_unresolved_recipients` 與收件人帳本共同保證的事。
> （此決策的完整討論見 README 開發歷程 2026-08-11「設計討論」）

### 7.3 雙層去重 / Dual deduplication

兩層攔截**不同**的失敗，缺一不可 / Two layers catching different failures:

| 層 Layer | 鍵 Key | 攔截什麼 Catches |
|---|---|---|
| 1 | `(source, eventId)` | **同一個事件**送兩次 —— 逾時重送，而第一次其實成功了 |
| 2 | `dedupKey` | **不同事件但意義相同** —— 感測器每 30 秒重報同一個門檻突破 |

**執行順序 / Order of operations:**

```
1. 解析收件人（不因失敗中止）
2. 前置查詢 (source, eventId) → 命中則回 duplicate，不進交易
3. 前置查詢 dedupKey → 命中則連結 webhook_event 至既有告警，回 duplicate
4. 交易 transaction:
     建立 webhook_event
     建立 alarm
     建立 alarm_recipients（批次）
     建立 alarm_unresolved_recipients（若有）
     更新 webhook_event.alarmId / processedAt
5. COMMIT
6. commit 後才推播 push AFTER commit
```

**併發處理 / Concurrency:** 前置查詢會被競爭穿越；此時唯一索引攔截並拋出 Prisma `P2002`，catch 區塊重新查詢勝出者並回傳 `duplicate: true`。**這是索引在正常運作，不是錯誤。**
The pre-checks can be raced; the unique index then fires `P2002` and the catch block resolves the winner. That is the index doing its job.

> ⚠️ **此併發行為在 SQLite 上通過測試，但 SQLite 是單寫入者模型。** 測試證明的是**程式邏輯路徑正確**（唯一索引攔截 + `P2002` 分支確實被執行），**未證明** PostgreSQL 在真實併發下的表現。**換 PostgreSQL 後必須重測。**
> Proven on SQLite (single-writer). This validates the code path, **not** PostgreSQL's behaviour under real concurrency. **Retest after the swap.**

### 7.4 交易邊界 / Transaction boundary

**推播必須在 commit 之後，且不可 await。**

- commit 前推播 → 資料庫交易在等待外部 HTTP，連線池耗盡。
- await 推播 → 來源系統的 webhook 呼叫被推播供應商的延遲拖住。

失敗記錄於 `push_deliveries`，並以 `push_dispatch_failed` 寫入日誌。

---

## 8. 推播傳輸層 / Push transport

### 8.1 `PushProvider` 介面 / The transport seam

```ts
interface PushProvider {
  readonly name: string;
  supportsToken(token: string): boolean;   // 拒絕無法投遞的 token，而非無聲失敗
  readonly maxBatchSize: number;           // Expo 上限為 100
  send(messages: PushMessage[]): Promise<PushTicket[]>;      // 依位置回傳
  getReceipts(ticketIds: string[]): Promise<Map<string, PushReceipt>>;
}
export const DEVICE_NOT_REGISTERED = "DeviceNotRegistered";
```

介面之上的一切 —— 扇出、投遞帳本、回條處理、死 token 清理 —— **與傳輸方式無關**。
Everything above this interface is transport-agnostic.

`PushMessage.data` **只帶** `{ type: "alarm", alarmId }`。`priority` 使用 `default｜high`，刻意對齊 Expo/FCM 詞彙，使 Phase B 不需翻譯。

### 8.2 分塊與 ticket 對應 / Chunking and ticket mapping

> ⚠️ **重建時最容易做錯的地方。**

**錯誤做法：** 維護一個全域 `deviceIds[]` 陣列，用 ticket 的索引去查。ticket 是**逐批**回傳的，第二批的索引 0 會對應到全域陣列的索引 0 —— 於是**裝置 101 的投遞結果被寫到裝置 1 上**。

**正確做法：** 把 `{ deviceId, message }` 成對放入陣列，**對成對物件分塊**，每批內以位置對應。

```ts
type Pending = { deviceId: string; message: PushMessage };
for (const group of chunk(pending, provider.maxBatchSize)) {
  const tickets = await provider.send(group.map(p => p.message));
  tickets.forEach((ticket, i) => update(group[i].deviceId, ticket));
}
```

已有測試以 **150 台裝置強制跨兩個批次**，逐筆驗證每個 ticket 屬於它真正被送去的裝置。

### 8.3 回條處理 / Receipt processing

`notifications/receipts.ts`：

1. 挑出 `status = ACCEPTED` 且有 `ticketId` 的投遞列
2. **只處理 `sentAt` 距今超過 `minAgeMs` 的**（由 `SIMULATOR_RECEIPT_DELAY_MS` 設定，預設 3000ms）
3. 查詢回條 → `DELIVERED` / `DEVICE_CONFIRMED` / `SUPPRESSED` / `FAILED` / `INVALID_TOKEN`
4. `DeviceNotRegistered` → 標記 `INVALID_TOKEN` **且將裝置列 `active = false`**
5. **絕不記錄完整 token**，只記錄指紋

> ticket 與 receipt 之間的延遲**刻意非零**。把它壓成 0 會抹除整個投遞模型賴以成立的區分：`ACCEPTED`（供應商收下了）與 `DELIVERED`（真的到了）是**在不同時間到達的不同事實**。可見的時間差讓這件事在操作台上看得見，而非只是理論。正式的 Expo 部署此處是以分鐘計。
>
> The gap is deliberately non-zero: collapsing it would hide the distinction the delivery model rests on.

### 8.4 ⚠️ Phase B 的三條硬規則 / Three hard rules for Phase B

> **這三條是本專案最容易騙到自己的地方：模擬器能給的確定性，正式環境給不了。**

| # | 規則 | 後果 Consequence if ignored |
|---|---|---|
| 1 | **`DEVICE_CONFIRMED` 在 Phase B 永遠不會亮。** FCM 與 APNs **不提供 per-message 的即時送達回呼**給你的伺服器（FCM 只有 BigQuery 匯出的彙總數據）。裝置是否收到只能靠 App 自行回報，而 iOS 靜默推播**從不保證送達**、Android OEM 省電機制會殺背景 App。 | 任何依賴這一格的邏輯會**無聲地停止運作** |
| 2 | **ack 沒回來 ≠ 沒送到。** | 寫成「無 ack 則重推」會在訊號不良時瘋狂重送 |
| 3 | **ticket ≠ 送達；receipt ≠ 人看到了。** | 只有人的 ack 是真憑證 |

這三條警告已內嵌於三處程式碼註解：`notifications/provider.ts`、schema 的 `deviceConfirmedAt` 欄位、`notifications/receipts.ts` 的狀態轉換處 —— 確保實作 Phase B 的人必然會看到。

### 8.5 模擬器實作 / Simulator implementation（Phase A 專屬）

- `simulator/hub.ts` — 以 push token 為鍵的 WebSocket 連線登錄表
- `simulator/provider.ts` — 實作 `PushProvider`；未連線的裝置照樣接受並發出 ticket（模擬「手機關機」：供應商收下了，但永遠不會有送達）
- `ws/device.ts` — `/ws/device?token=<pushToken>`；連線時驗證裝置存在，未知 token 回 `error` 並關閉

**WebSocket 協定 / Protocol**（`packages/contracts/src/simulator.ts`）：

```ts
// 伺服器 → 手機 Server → phone
{ type: "registered"; deviceId; pushToken }
{ type: "push"; envelope: { ticketId, alarmId, title, body,
                            data: { type: "alarm", alarmId }, sentAt, priority } }
{ type: "error"; code; message }

// 手機 → 伺服器 Phone → server
{ type: "ack"; ticketId }                                       // 驅動 DELIVERED
{ type: "suppressed"; ticketId; reason: "PERMISSION_DENIED" }   // 驅動 SUPPRESSED
{ type: "state"; state: "LOCKED"|"FOREGROUND"|"BACKGROUND"|"TERMINATED" }
```

**Token 格式 / Token format:** `SimulatorPushToken[<slug>]`，slug 為 `[0-9a-zA-Z-]{1,64}`。

> ⚠️ `makeSimulatorPushToken()` **必須 slugify 輸入**，且在無可用字元時**拋錯**而非回傳 `SimulatorPushToken[]`。
> 曾有版本直接內插標籤，導致含空格的標籤產生出**自己的驗證器會拒絕的 token**。失敗是無聲的：裝置註冊回 400 → 沒有裝置 → 告警仍被接受但收件人永遠無法送達 → 所有「沒有推播到達」的測試斷言**因為錯誤的理由而通過**。
> A constructor must never be able to emit a value its own validator rejects.

---

## 9. 認證 / Authentication

| 項目 | 實作 |
|---|---|
| 密碼雜湊 | Argon2id，OWASP 基準：`memoryCost 19456`、`timeCost 2`、`parallelism 1` |
| Access token | JWT，`{ sub, role }`，TTL 由 `JWT_ACCESS_TTL` 決定 |
| Refresh token | 48 bytes CSPRNG → 明文回傳給用戶端，**只存 SHA-256 雜湊** |
| Refresh 輪替 | 每次 refresh 撤銷舊 token 並發新的 → 被竊 token 最多用一次 |
| 登出 | 冪等；撤銷未知或已撤銷的 token 也回成功 |

**為何 refresh token 用 SHA-256 而非 Argon2：** token 是 48 bytes 的 CSPRNG 輸出，沒有低熵秘密需要慢雜湊，而登入延遲是重要的。
The token is 48 bytes of CSPRNG output — nothing low-entropy to slow-hash.

**帳號列舉防護 / Enumeration defence:** 帳號不存在時**仍執行一次假的密碼驗證**，使「未知帳號」與「密碼錯誤」耗時相近且回應**完全相同**。
`verifyPassword()` 對格式損壞的雜湊回 `false` 而非拋例外 —— 500 會告訴攻擊者該帳號存在。

---

## 10. 事件與可觀測性 / Events and observability

### 10.1 伺服器事件 / Server events

`packages/contracts/src/events.ts` 定義 27 個事件名稱：

```
webhook_received  webhook_rejected  webhook_duplicate
source_row_picked_up  source_row_rejected  source_poll_failed
alarm_created  alarm_duplicate  recipient_unresolved  alarm_no_recipients
push_send_started  push_ticket_accepted  push_ticket_failed
push_receipt_delivered  push_receipt_failed  push_receipt_suppressed
push_receipt_invalid_token  recipient_undeliverable
device_registered  device_deactivated  device_connected  device_disconnected
alarm_read  alarm_acknowledged  alarm_resolved
test_data_purged  test_data_purge_failed
```

`events/bus.ts` 為行程內匯流排：**同一個事件物件**同時寫入結構化日誌與 admin SSE 串流，因此操作者看到的**就是**被記錄下來的東西，而非另一套比較漂亮的說法。緩衝最近 300 筆供新連線重播。

The same event object goes to both the log and the SSE stream, so what the operator sees *is* what was logged.

#### 事件訊息必須指名告警 / Event messages must name the alarm

以下事件的 `message` **必須**經由 `formatAlarmLabel()` 帶上編號（實測輸出）：

| 事件 Event | 訊息格式 Message |
|---|---|
| `alarm_created` | `[CRITICAL] 水溫 紅燈告警 (TANK01-20260813-02)` |
| `alarm_duplicate` | `dedupKey 命中既有告警 水溫 紅燈告警 (TANK01-20260813-02)，未重複通知` |
| `webhook_duplicate` | `重複事件 eventId=…，未建立新告警（已記錄為 水溫 紅燈告警 (TANK01-20260813-02)）` |
| `alarm_read` | `manager@demo.local 已開啟告警「水溫 紅燈告警 (TANK01-20260813-02)」` |
| `alarm_acknowledged` | `manager@demo.local 已確認收到告警「水溫 紅燈告警 (TANK01-20260813-02)」` |
| `alarm_resolved` | `manager@demo.local 已將告警「水溫 紅燈告警 (TANK01-20260813-02)」標記為處理完成` |
| `alarm_no_recipients` | `告警 水溫 紅燈告警 (…) 已建立，但沒有任何可通知的收件人 — 沒有人會收到這則告警` |

`context.reference` 亦一併帶上，供機器過濾。

**不可只寫 `alarmId`。** 稽核行若只有 UUID，任何「誰在什麼時候處理了哪一則」的追查都得先去 join 另一張表；而編號正是操作人員在電話上、在交接單上實際使用的名字。

Do not emit only the UUID: the code is the name humans actually use.

兩個**刻意不帶編號**的事件：
* `source_row_picked_up` —— 取件發生在配號之前，該行還沒有編號；改為明確帶上 `deviceId`。
* `webhook_received` —— 同理，且該路徑的 title 由客戶自訂、本就自我描述。

### 10.2 日誌遮蔽 / Log redaction

`logger.ts` 對 `pushToken` 等路徑自動遮蔽為 `[REDACTED]`。
需要記錄可辨識但不可用的值時，使用 `tokenFingerprint()` 並**以不同的鍵名**（如 `pushTokenFp`）—— 用 `pushToken` 當鍵會被遮蔽規則一併蓋掉。

### 10.3 SSE 串流 / SSE stream

`GET /v1/admin/stream` — 連線時先重播最近 80 筆（`serverEvents.recent(80)`），之後即時推送，每 15 秒送出 `: ping` 心跳。ops-server 的 `GET /v1/stream` 同理，重播 30 筆。

> ⚠️ **SSE 端點必須自行寫出 CORS 標頭。**
>
> SSE handler 以 `reply.raw.writeHead()` 接管原始 socket，這會**完全繞過 Fastify 的 reply 物件**，而 `@fastify/cors` 是在 `onSend` 階段才加標頭 —— 該階段永遠不會執行。結果是串流送出時**沒有 `Access-Control-Allow-Origin`**，所有瀏覽器一律靜默拒收。
>
> 實作見 `apps/api/src/lib/sse.ts`：只在來源位於既有白名單時回應該 origin（**不可用 `*`**，那會與整體的窄 CORS 政策不一致）。
>
> **此缺陷對測試不可見**：`app.inject()` 與 Node `fetch` 都不執行 CORS。只有真實瀏覽器會顯現。
>
> An SSE handler takes over the raw socket and bypasses @fastify/cors entirely.
> Write the CORS header explicitly, echoing the origin only when allow-listed.
> Invisible to inject()/fetch-based tests; only a real browser reveals it.

---

## 11. 模擬營運伺服器 / Simulated operations server

**獨立行程執行是刻意的。** 同行程呼叫無法驗證 HMAC、header 傳遞與 raw-body 驗簽 —— 而那正是到客戶現場最容易失敗的部分。
**A separate process on purpose:** an in-process call cannot exercise the parts most likely to break at a customer site.

### 11.1 端點 / Endpoints (`:4000`)

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/health` | |
| GET | `/v1/scenarios` | 情境目錄，標明各情境是否去重 |
| GET | `/v1/events` | **本伺服器自己的事件記錄** |
| POST | `/v1/trigger` | 觸發一則告警 |
| POST | `/v1/flap` | 連續觸發 N 次（感測器抖動示範）|
| GET | `/v1/recipients` | 代理至通知服務的使用者清單 |
| GET | `/v1/stream` | SSE：本伺服器的事件流 |

### 11.2 為何營運伺服器要有自己的記錄 / Why it keeps its own log

營運端必須能**獨立**回答「我們送了什麼、對方怎麼回」，不依賴通知系統的資料庫。若唯一紀錄只存在下游，**被拒絕的 webhook 將在營運團隊看得到的地方不留任何痕跡**。

Operations must be able to answer "what did we send and what did they say" without access to the notification database — otherwise a rejected webhook leaves no trace anywhere they can see.

`OpsOutcome`：`ACCEPTED｜DUPLICATE｜REJECTED｜PARTIAL｜NO_RECIPIENTS｜TRANSPORT_ERROR`

### 11.3 情境目錄 / Scenario catalogue

6 個情境，`dedupKeyTemplate` 中的 `{bucket}` 展開為 **5 分鐘時間桶**（這正是讓抖動的感測器折疊成一則告警的機制）：

| id | 嚴重度 | 去重 |
|---|---|---|
| `temperature-critical` | critical | ✅ |
| `ups-battery-fault` | critical | ✅ |
| `fire-suppression` | critical | ❌ **刻意不去重** |
| `disk-usage-high` | warning | ✅ |
| `wan-link-flap` | warning | ✅ |
| `backup-completed` | info | ❌ |

> **消防情境為何不去重：第二次氣體釋放是全新的緊急事件，不是第一次的重複。** 把它折疊掉會藏起真正的災難。
> A second gas discharge is a new emergency, not a repeat. Collapsing it would hide the real disaster.

`legacy-ops-v1` 格式**不合成 dedupKey**：兩則真正不同的告警可能共用主旨行，合成的鍵會讓第二則無聲消失。

### 11.4 故障注入 / Fault injection

`signatureMode`：`valid｜invalid｜missing`

用途是**證明 HMAC 防護確實會拒絕流量** —— 沒有人親眼看過失敗的安全控制，是不值得信任的安全控制。
To demonstrate the control actually rejects traffic: a security control nobody has watched fail is one nobody should trust.

---

## 11A. 模擬網頁 / Simulation console (`apps/web`, :5173)

**技術：** Vite + React 19 + TypeScript，無 UI 框架，手寫 CSS 搭配 `styles/tokens.css` 的設計 token。
`@alarm/contracts` 以 Vite alias **直接指向原始碼**（`resolve.alias`），確保 console 與 API 不會在 enum 或線路格式上漂移。

### 11A.1 六個區塊 / The six regions

| 區塊 | 元件 | 資料來源 |
|---|---|---|
| ① 感測器與門檻條件 | `SensorPanel.tsx` | ops-server（`/v1/sensors`、`/v1/source-events`）|
| ② 直接觸發（跳過門檻）| `TriggerConsole.tsx` | ops-server（`/v1/scenarios`、`/v1/trigger`、`/v1/flap`）|
| ③ 伺服器事件流 | `EventStream.tsx` | API SSE（`/v1/admin/stream`）|
| ④ 逐人送達帳本 | `Ledger.tsx` | API（`/v1/admin/alarms/:id/ledger`），選定告警時每 1.5 秒輪詢；標頭顯示告警編號 |
| ⑤ 手機模擬器 ×2 | `Phone.tsx` + `usePhone.ts` | 真實登入 + 裝置註冊 + WebSocket `/ws/device` |
| ⑥ 裝置與待送佇列 | `DeviceQueues.tsx` | `/v1/admin/devices` + `/v1/admin/simulator/queue` |

#### 待送佇列 ≠ 未讀 / Queued is not unread

> 這兩個數字很容易被當成同一件事，混淆它們會抹掉推播傳輸最重要的事實。

| 概念 | 意義 | 來源 |
|---|---|---|
| **待送 queued** | 供應商**已接受**，但手機當時不在線，**尚未抵達裝置**；重新連線時才送出 | `SimulatorDeviceHub.peekQueue()` |
| **未讀 unread** | 已存進資料庫、人還沒開啟 | `GET /v1/alarms/unread-count` |

**為何必須分開看：** 待送佇列是「ack 沒回來不等於訊息遺失」的具體證據 —— 訊息就在佇列裡等手機回來。只看未讀數會誤判成「已送到但被忽略」。

`peekQueue()` **只讀不清空**，且回傳複本，避免操作台因為查看而改變投遞狀態。
Reads without draining and returns copies, so inspecting cannot mutate state.

### 11A.2 為什麼帳本與佇列都要輪詢 / Why the ledger and queue poll

投遞狀態是**非同步落定**的（ticket→receipt 的間隔刻意非零，見 §8.3），佇列深度也會因為推播被接受或裝置重連而自行變化 —— 兩者都不是這個畫面發起的動作。一次性讀取只會看到中間狀態。

### 11A.3 六個時間戳與它們各自回答的問題 / Six timestamps

每一則通知的**內容本身**必須帶有發生時間與發送時間；伺服器另外記錄誰在何時開啟與確認。

| 時間 | 來源欄位 | 回答的問題 |
|---|---|---|
| 發生 occurred | `Alarm.occurredAt` | 條件是什麼時候成立的（來源系統的認定）|
| 建立 created | `Alarm.createdAt` | 我們何時存下它 —— **與發生的落差就是來源系統的延遲** |
| 發送 sent | `PushDelivery.sentAt` / 信封 `sentAt` | 我們何時嘗試通知 |
| 送達 delivered | `PushDelivery.deviceConfirmedAt` → `AlarmRecipient.deliveredAt` | 裝置何時確認收到 |
| 已讀 read | `AlarmRead.readAt`（**含 userId**）| **誰**在何時開啟 |
| ack / resolve | `AlarmRecipient.ackedAt` / `resolvedAt` | 伺服器何時收到本人的確認 |

**發送時間戳的渲染規則 / Rendering rules**（`notifications/format.ts`）：

1. **時間戳烤進可見的 body 文字**，不只放在 `data` 結構欄位 —— 鎖定畫面橫幅只會渲染 body，結構欄位對讀者不存在。
   Baked into the visible body: a lock-screen banner renders the body and nothing else.
2. **一律標示時區。** 沒有時區的告警時間比沒有時間更糟：讀者會用自己的時區推算，可能對「水槽現在正在沸騰」或「昨晚沸騰過」判斷錯好幾個小時。
   The zone is always stated — a zoned-less alarm time is worse than none.
3. **以該裝置註冊時回報的時區渲染**（`Device.timezone`），未知時退回伺服器時區。時區字串不合法時**退回而非拋錯** —— 失去精度可接受，失去通知不可接受。
   Rendered in the handset's own zone; a malformed zone falls back rather than throwing.
4. `data` 中同時保留 ISO 值（`occurredAt`、`sentAt`），供 App 以讀者語系重新渲染。

> ⚠️ **`data` 的鍵集合被測試鎖定為 `type｜alarmId｜occurredAt｜sentAt`。**
> 任何人多加一個欄位測試就會紅 —— 這是防止告警內容洩漏進「會經過 Google／Apple 並顯示在鎖定畫面」的傳輸層。時間戳是唯一的例外，因為它們不敏感，且讀者在決定要不要開啟之前就需要它們。

> ⚠️ **編號的日期用系統時區，通知內文的時間用裝置時區 —— 這個不一致是刻意的，不要「修正」它。**
>
> | | 時區來源 | 為什麼 |
> |---|---|---|
> | 通知內文的發生／發送時間 | **該台裝置**回報的 `Device.timezone` | 讀者要判斷「現在是不是正在沸騰」，必須看到自己牆上時鐘的時間 |
> | 編號中的 `YYYYMMDD` | **全系統唯一**的 `ALARM_REFERENCE_TIMEZONE` | 編號是一個**共用的名字**。若隨讀者變化，同一則告警在台北叫 `…-20260813-01`、在倫敦叫 `…-20260812-01`，客戶與廠商無法討論同一件事 |
>
> 簡言之：**時間是給個人讀的，編號是給大家共用的。** 兩者遵守的規則因此相反。
> Times are read by one person; codes are shared by everyone — hence the opposite rules.

#### 標題列的保留宣告 / The retention notice in the header

`App.tsx` 在標題「告警通知模擬台」後面顯示「測試資料只保留最近 N 天內的資訊與紀錄」。

**N 由 `GET /v1/admin/policy` 取得，與清除器讀同一份設定 —— 不得寫死在前端。** 前端寫死的數字會與 `TEST_DATA_RETENTION_DAYS` 無聲分岔，讓標題變成一個沒有東西在遵守的承諾。API 沒回應或天數為 `0` 時，**整個宣告不顯示**。

實際刪除行為見 §4.6。

#### 編號在 UI 出現的位置 / Where the code appears in the UI

| 位置 | 渲染方式 |
|---|---|
| ③ 事件流 | 伺服器訊息字串本身已含編號（§10.1）|
| ④ 帳本標頭 | `.ledger__ref` —— 從灰階 meta 行中提到正常字重與顏色；它是那一行裡唯一會被唸出來的字串 |
| ⑤ 通知欄 | 推播標題本身：`[CRITICAL] 機房溫度 紅燈告警 (ROOMR12-20260813-03)` |
| ⑤ 收件匣列 | `.inbox__ref` —— 標題下方的次要行，**不展開也看得到** |
| ⑥ 待送佇列項目 | 沿用推播標題，故已含編號 |

> **編號永不截斷。** `.inbox__ref` 設 `max-width: 100%` 但不套 `truncate`；被截尾的 `TANK01-202608…` 看起來可引用卻不可引用，比沒有編號更糟。需要截斷時截標題 —— 被縮短的句子仍然讀得通。
> Never truncate the code; truncate the title instead.

### 11A.4 通知欄與收件匣是兩個不同的清單 / Tray and inbox are different lists

> ⚠️ **這是第一條設計規則（推播是提示，資料庫才是真相）在 UI 上的體現，重建時不可合併。**

| 檢視 | 資料來源 | 內容 |
|---|---|---|
| **通知欄 Tray** | 這次 WebSocket 連線收到的推播 | 只有「送達過來的」 |
| **收件匣 Inbox** | `GET /v1/alarms`（認證 API） | 「資料庫裡存在的」 |

兩者**本來就會不一致**，而那個不一致正是要展示的東西：重新載入頁面後通知欄是空的，但收件匣仍有 11 則未讀 —— **掉掉的推播不等於掉掉的告警**。

The two legitimately disagree, and that disagreement is the point: a reload
empties the tray while the inbox still holds everything waiting.

**清單重新拉取的時機 / When the list is refetched**（`usePhone.ts`）：

1. 登入並連線成功後
2. **每次 App 回到前景（`FOREGROUND`）**
3. 開啟收件匣、開啟某則告警、ack、resolve 之後

第 2 項是正式環境的必要行為 —— 少了它，任何一次推播遺失都會變成永久看不到的告警。
Item 2 is mandatory in production: without it, a single lost push becomes a
permanently invisible alarm.

**未讀紅點是伺服器的未讀數**（`GET /v1/alarms/unread-count`），不是本機累加。多裝置、重複推播、已讀操作都會讓本機累加失準。
The badge is the server's count, never a local increment.

### 11A.5 手機模擬器的真假分界 / What is real vs simulated

| 真實 Real | 模擬 Simulated |
|---|---|
| 登入（JWT）、裝置註冊、WebSocket 傳輸、推播信封、取詳情、標已讀、ack／resolve | App 狀態（鎖定／前景／背景／終止）、通知權限、解除安裝 |

模擬的那三項**正是會改變伺服器必須如何撰寫的作業系統行為**，且無法用其他方式展示。

### 11A.6 權限被拒的回報路徑 / The permission-denied path

手機收到推播時，若 `permissionGranted === false`，**回報 `suppressed` 而非 `ack`**：

```ts
socket.send(JSON.stringify({ type: "suppressed", ticketId, reason: "PERMISSION_DENIED" }));
```

把它當成一般 ack 回報，等於告訴伺服器「有人看到了」—— 而實際上沒有任何人看到。

### 11A.7 已知限制 / Known limitations

- **手機模擬器沒有自動重連。** WebSocket 斷線（例如 API 重啟）後不會自行復原，需重新登入。
  這同時也誠實地模擬了「手機離線」，因此刻意未加。
  No auto-reconnect: this also honestly models a phone going offline.
- **`VITE_DEMO_PASSWORD` 僅供開發**，見 §3。

---

## 12. 安全 / Security

### 12.1 已實作 / Implemented

- HMAC 驗簽（原始位元組、常數時間比較、長度前置檢查）
- JWT + Argon2id + refresh 輪替 + 帳號列舉防護
- 每次請求重新檢查帳號 `active`
- 授權一律經 `alarm_recipients`；404 不洩漏存在性
- 限流：login 10/分、refresh 30/分、webhook 300/分
- `@fastify/helmet` 安全 header；CORS 白名單
- 推播 payload 只帶 ID
- 日誌 token 遮蔽
- 錯誤訊息：500 一律回制式文字，不回傳內部錯誤內容（避免洩漏路徑與連線字串）

### 12.2 ⚠️ 上線前必須處理 / Must be fixed before production

| # | 項目 |
|---|---|
| 1 | **`/v1/admin/*` 完全無認證。** 必須先加上管理員角色，才能部署到 localhost 以外的任何地方 |
| 2 | **`/ws/device` 僅以 push token 認證。** Phase B 應改為 JWT |
| 3 | 換 PostgreSQL 後**重測併發去重**（見 §7.3）**以及併發配號**（`alarm_sequences` 的 upsert-increment，見 §4.5）—— 兩者都只在 SQLite 的單寫入者模型下被證明過 |
| 4 | 移除對 `DEVICE_CONFIRMED` 的任何依賴（見 §8.4） |
| 5 | 逾時升級（escalation）政策層 —— 帳本已支援，政策未實作 |

---

## 13. 測試 / Testing

**227 個測試 / 17 個檔案，全數通過。** 執行：`npm test`（等同 `npm run test -w @alarm/api`）

> 下表每一列的數字皆取自 `vitest run --reporter=json` 的實際輸出，非估算。
> Every count below is read from vitest's JSON reporter, not estimated.

| 檔案 | 數量 | 涵蓋 |
|---|---|---|
| `unit/signature.test.ts` | 13 | HMAC；含「對重新序列化的 JSON 簽章必定失敗」 |
| `unit/adapters.test.ts` | 29 | 兩個轉接器的正規化與拒絕條件；**裝置識別在每個轉接器都被帶過來**（含數字資產編號、legacy 從 `meta` 映射、真的沒有裝置時回 null）|
| `unit/push-token.test.ts` | 26 | token 建構/驗證 round-trip 不變式 |
| `unit/logger.test.ts` | 3 | token 指紋絕不洩漏完整值 |
| `unit/sensor-adapter.test.ts` | 13 | 燈號映射、事件識別抗 id 重置、去重鍵不吞升級 |
| `unit/format.test.ts` | 7 | 兩個時間戳、一律標時區、依裝置時區渲染、壞時區退回不拋錯 |
| `unit/reference.test.ts` | 19 | 編號格式：連字號必須移除否則不可解析、保留非拉丁字母、截斷仍可解析、**退回鍵 `SYS_Manual_Test` 可 round-trip 且不與任何正規化後的裝置鍵碰撞**、`01→99→100→1001` 寬度成長、拒絕不可能配到的序號、同一瞬間在不同時區是不同日期、跨當地午夜換鍵、壞時區退回不拋錯 |
| `integration/source-poller.test.ts` | 14 | 輪詢擷取、重複讀取、抖動折疊、升級不被吞、來源故障韌性 |
| `integration/alarm-reference.test.ts` | 16 | 逐裝置獨立配號、序號成長、**跨午夜歸零且無排程**、遲到事件歸屬前一天、**無裝置時使用 `SYS_Manual_Test` 且與各裝置計數器互不干擾**、空白 deviceId 視為無裝置、重複事件**不消耗號碼**、黃→紅升級取下一號、編號跨告警唯一 |
| `integration/auth-devices.test.ts` | 12 | 登入、refresh 輪替、裝置改綁 |
| `integration/alarms.test.ts` | 13 | 授權 404、逐人已讀、cursor 分頁 |
| `integration/webhook.test.ts` | 13 | 簽章、schema、雙層去重、併發、轉接器 |
| `integration/retention.test.ts` | 7 | 過期告警刪除、子表 cascade、冪等表不 cascade 需另刪、**序號計數器絕不刪**、使用者與裝置保留、`0` 停用而非清空、邊界日不刪 |
| `integration/push-delivery.test.ts` | 17 | 扇出、分塊對應、回條、死 token、攔截不推進人、payload 鍵集合鎖定 |
| `integration/acknowledge.test.ts` | 12 | ack/resolve 分離、不倒退、逐人獨立 |
| `integration/end-to-end.test.ts` | 4 | 真實 HTTP + 真實 WebSocket 完整旅程 |
| `integration/ops-server.test.ts` | 9 | 跨行程整合、故障注入、抖動、legacy 格式、**營運端 note 帶編號且分隔空格正確** |

### 13.1 測試基礎設施 / Test infrastructure

- 每個測試檔使用**獨立的 SQLite 檔案**，位於 `data/test/`
- **套用真實的 migration SQL**，不使用手寫 schema —— 對著手寫 schema 通過的測試，無法證明 migration 會產生那個 schema
- `vitest.config.ts`：`fileParallelism: false`、`env: { NODE_ENV: "test", LOG_LEVEL: "silent" }`

### 13.2 重建時必須保留的關鍵測試 / Critical tests to preserve

| 測試 | 保護什麼 |
|---|---|
| 「對重新序列化的 JSON 簽章必定驗不過」 | 防止最常見的整合失敗被寫進實作 |
| 「別人的告警與不存在的告警回應完全相同」（三欄位比對）| 任何人日後把訊息寫得「更有幫助」都會讓測試變紅 |
| 「三筆併發只產生一筆告警」 | 去重的競爭條件路徑 |
| 「150 台裝置跨兩批，每個 ticket 對應正確裝置」 | §8.2 的分塊錯誤 |
| 「token 建構函式的輸出必然通過自己的驗證器」 | §8.5 的無聲失敗 |
| 「送出後才解除安裝 → 裝置停用 → 下一則告警不再送給它」 | 死 token 清理 |
| 「被抑制的重複事件不消耗序號」（斷言 `alarm_sequences.lastSeq`）| 抖動的感測器若能消耗號碼，一則真實告警在天亮前會把編號推到 `…-40`，而數字會被讀成四十次事故 |
| 「跨當地午夜後回到 01，且前一天的計數器仍可續號」 | 證明歸零來自鍵而非排程 —— 若有人改成午夜 cron，這個測試不會紅但**時區與遲到事件的兩個測試會**，故三者需一併保留 |
| 「保留連字號會使編號無法解析」 | 防止有人「為了好看」把 `TANK-01` 原樣放進第一段 |
| 「退回鍵 `SYS_Manual_Test` 的編號可以解析回去」 | 退回鍵含底線；若解析器只收字母數字，每一則無裝置告警的編號都會不可讀，**而組合端仍然正常，所以失敗是無聲的** |
| 「營運端 note 的編號後面有空格」 | `toContain(編號)` 抓不到少一個空格；這種錯讀起來夠順足以通過審閱，卻出現在操作人員讀到的每一行 |

> ⚠️ **測試輔助函式必須斷言自己的前置條件。** 曾有輔助函式呼叫裝置註冊卻未檢查回應狀態，導致 400 被吞掉，整個測試檔的結論**往「通過」的方向失效**。
> A silent precondition failure in a test helper invalidates the whole file's conclusions — and it fails *towards green*.

---

## 14. 重建步驟 / Rebuild procedure

```bash
# 1. 骨架 skeleton
mkdir -p apps/api apps/ops-server apps/web packages/contracts data
npm init -y                       # 根 package.json 加入 workspaces: ["packages/*","apps/*"]

# 2. 契約套件先做 contracts first（其他都依賴它）
#    enums.ts → common.ts → auth.ts → device.ts → alarm.ts → events.ts → simulator.ts

# 3. API
cd apps/api
npm i fastify @fastify/cors @fastify/helmet @fastify/jwt @fastify/rate-limit \
      @fastify/websocket fastify-plugin @prisma/client @prisma/adapter-better-sqlite3 \
      better-sqlite3 @node-rs/argon2 pino pino-pretty zod dotenv
npm i -D typescript tsx vitest prisma @types/node @types/better-sqlite3 ws @types/ws

# 4. 模擬網頁 console
cd ../web
npm i react react-dom
npm i -D vite @vitejs/plugin-react @types/react @types/react-dom typescript
#    vite 版本必須與 root 的 vitest 所帶入的 vite 對齊，否則會裝出兩份 vite，
#    plugin 與 config 各自解析到不同副本而型別不符。
#    Align the vite version with the one vitest pulls in, or two copies are
#    installed and the plugin/config types stop matching.

# 5. 資料庫 database
cp .env.example .env               # 填入兩個不同的 32+ 字元秘密
npm run db:migrate                 # prisma migrate dev
npm run db:seed

# 6. 驗證 verify
npm run typecheck                  # 四個 workspace 皆須全綠
npm test                           # 227 個測試皆須通過
npm run dev                        # api:3000 + ops:4000 + web:5173
```

### 14.1 建置順序的依賴關係 / Build-order dependencies

```
contracts  →  api(config, db, logger)  →  api(auth, devices, alarms)
                                       →  api(webhooks + ingest)
                                       →  api(notifications + ws)
                                       →  ops-server
                                       →  web
```

**契約套件必須最先完成** —— 三個 app 都從它匯入型別與 schema，若順序顛倒會產生重複定義的漂移。

---

## 15. 尚未實作 / Not yet implemented

| 項目 | 狀態 |
|---|---|
| `ExpoPushProvider` | 未實作；介面已就緒（§8.1）|
| React Native App（Android → iOS）| Phase B |
| PostgreSQL 遷移 | Schema 已為此準備（§4.1）|
| 逾時升級政策層 | 帳本已支援，政策未實作 |
| 群組／值班角色路由 | 見 README 開發歷程的決策紀錄 |
| 手機模擬器自動重連 | 刻意未加（§11A.4）|
| `/v1/admin/*` 認證 | **上線前必須補**（§12.2）|
| 編號的併發配號在 PostgreSQL 上的驗證 | SQLite 為單寫入者，序列化由檔案鎖保證；PostgreSQL 上 Prisma 的 `upsert` 會編譯成 `INSERT … ON CONFLICT DO UPDATE`（原子），但**尚未實測**。與併發去重的重測列在同一項待辦（§12.2）。<br>Not yet exercised on PostgreSQL. |
| 依編號搜尋的端點 | `parseAlarmReference()` 已可解析，但沒有 `GET /v1/alarms?reference=` —— 目前只能用它在事件流與日誌中 grep。<br>The parser exists; no search endpoint consumes it yet. |

### 15.1 仍未回答的問題 / Still-unanswered questions

以下答案會直接決定 Phase B 的轉接器與路由邏輯，目前以模擬值代替：

1. 客戶營運伺服器的**實際事件格式**為何？ / The customer's actual event format?
2. 經理如何識別 —— email、員工編號、既有帳號 ID、或 SSO？ / How are managers identified?
3. 告警路由 —— 全員收到，還是依站點／團隊／角色？ / Routing rules?
4. 預期告警量與尖峰突發率？ / Expected volume and peak burst rate?
5. 合規與資料保存要求？ / Compliance and retention requirements?
6. **客戶的來源如何稱呼「裝置」這個欄位？** 轉接器必須把它對應到 `NormalisedAlarmEvent.deviceId`（§4.5）。對應錯誤不會報錯 —— 只會讓每則告警被編為 `SYS_Manual_Test`、所有設備共用一組計數器。
   What does the customer's source call its device field? A wrong mapping is silent.
7. **真實來源是否會發出「沒有裝置」的告警？** 若會，退回鍵 `SYS_Manual_Test` 就會把真實事故標記成人工測試 —— 而那正是最容易被忽略的標籤（見 §4.5）。
   Does any real source raise device-less alarms?

**不要為這些問題發明答案。** 它們決定的是轉接器與路由層，而那兩層正是為了容納未知答案而存在的。
**Do not invent answers.** These determine the adapter and routing layers, which exist precisely to absorb the unknown.

---

*本文件於 2026-08-11 自現行原始碼逐項核對後撰寫，2026-08-13 隨告警編號（§4.5，含宣告式裝置識別與 `SYS_Manual_Test` 退回鍵）、測試資料保留（§4.6）與時間戳功能更新；測試數字取自 vitest JSON reporter 實測輸出（227 / 17）。*
*Transcribed from the current source on 2026-08-11; updated 2026-08-13 for alarm reference codes (§4.5), declared device identity, and test-data retention (§4.6). Test counts read from vitest's JSON reporter.*

*整合前最終核對 / Final pre-integration re-check（2026-08-13）：§2.3 目錄樹逐項對照磁碟後補上 `maintenance/`，並將整合測試檔數由 9 更正為 10（`retention.test.ts` 新增後未同步）；§10.1 的 27 個事件名稱逐一與 `packages/contracts/src/events.ts` 對照無誤；測試數字重跑確認 `numTotalTests: 227 / numFailedTests: 0`，檔案 17（unit 7 + integration 10）。*
*The §2.3 tree was walked against disk (added `maintenance/`, corrected the integration file count 9 → 10), the 27 event names were checked one by one against the source, and the test figures were re-run, not recalled.*
