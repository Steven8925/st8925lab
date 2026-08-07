# Case Study Draft v0.9 — Chiller Remote Monitoring Retrofit

> **狀態**:草稿,含 [GAP] 待補標記。補完 GAP 後升 v1.0 進 repo。
> **去識別化檢查**:尚未過 SECURITY_DESIGN §5.4(截圖、EXIF 待處理)。
> **注意**:本草稿**不進 Git**,依規則草稿在本機迭代,定稿去識別化後才 commit。

---

## Title(三選一,或再調)

1. **Retrofitting real-time monitoring onto a Turbocor chiller — when the only interface was the PLC panel on the machine**
2. From alarm lamp to mobile alert: adding remote monitoring to a legacy chiller without touching the OEM controller
3. A US$[GAP]-class ESP32 retrofit that cut fault-response time by 80%

> 建議 1 或 2。標題 3 要等成本數字確認才用。

---

## Meta

| | |
|---|---|
| **Sector** | Hospitality — five-star hotel |
| **My role** | Product design · circuit design · firmware · backend development · ongoing operations |
| **Duration** | `[GAP: 專案從啟動到上線幾週/幾月?]` |
| **Team** | Solo delivery `[GAP: 施工/配線是你做還是廠務配合?]` |
| **Stack** | ESP32 · RS-485 / Modbus RTU · Siemens Climatix POL687 · Arduino core · OTA updates · time-series DB · web + mobile dashboard |

## Outcome chips

- **–80% fault-detection time** `[GAP: 量測基準,見下]`
- **–50% manual inspection hours** `[GAP: 量測基準]`
- **Continuous data capture where none existed before**
- **14+ months in production, still running**

## Summary

A five-star hotel's Turbocor chiller — the machine cooling the entire building, guest rooms included — had exactly one monitoring interface: the PLC panel mounted on the unit itself. When something went wrong, an alarm lamp lit up — and someone had to walk to the machine to find out why. I designed and built a non-invasive monitoring retrofit: an ESP32-based device that reads the chiller's operating data over Modbus RTU, streams it to a backend, and pushes real-time alerts to the duty staff's phones. The OEM controller was never modified. The system has been in continuous operation for over a year.

---

## 1 · Context & Constraints

The site is a five-star hotel. Comfort cooling for the entire building — guest rooms, lobby, and public areas — depends on a Turbocor centrifugal chiller governed by a Siemens Climatix POL687 controller. In a hotel, this is about as critical as a single asset gets: rooms are occupied around the clock, so there is no such thing as a convenient failure — and no generous shutdown window for commissioning work either.

Before this project, "monitoring" meant the controller's on-unit display. There was no remote visibility of any kind: no historical data, no trends, no alerting beyond a physical alarm lamp. If the chiller tripped at 2 a.m., nobody knew until someone noticed the temperature rising — or a guest complained.

The constraints that shaped the solution:

- **The OEM controller could not be modified.** `[GAP: 原因是保固?還是原廠不開放?]` Any solution had to be read-only and non-invasive.
- **No extended shutdown window.** The chiller serves guest-facing spaces; commissioning had to happen `[GAP: 只能利用既有停機時段?還是可短暫停機?]`
- **Budget.** The OEM's own remote-monitoring option and a full BMS retrofit were both quoted at `[GAP: 大約金額或倍數,例如「本方案的 8–10 倍」]`.

## 2 · The Problem

In the operator's own words: *"When something breaks, all we get is a lamp. Someone has to physically walk to the machine and read the little screen to even know what happened."* `[待確認:這樣改寫客戶原話可以嗎?]`

The cost of that blindness was concrete:

- Faults were discovered late — sometimes hours after onset — turning minor issues into major shutdowns
- Major shutdowns meant guest complaints and, in the worst case, `[GAP: 有沒有一次具體事件?大修花了多少天/多少錢?一個真實事件會讓這段有力十倍]`
- Daily inspection rounds consumed `[GAP: 每天幾小時?]` of technician time, most of it spent confirming that nothing was wrong

## 3 · Options Considered

| Option | Why it was rejected |
|---|---|
| **OEM remote-monitoring package** | Cost: roughly `[GAP]`× the retrofit budget. `[GAP: 還有別的原因嗎?綁約?功能不符?]` |
| **Full BMS installation** | Highest cost and longest lead time; would monitor far more than the client needed. The client had one critical asset, not a campus. |
| **Off-the-shelf Modbus gateway + cloud platform** | `[GAP: 有評估過現成閘道器嗎?如果有,為什麼不用?如果沒評估,這列刪掉]` |
| **Custom ESP32 retrofit (chosen)** | Purpose-built for exactly one job; hardware cost in the tens of dollars; no vendor lock-in; and the client owns the data. |

The deciding factors were **cost and lead time** — but the quiet advantage of the custom route was ownership: the operator now holds its own operating history instead of renting access to it.

## 4 · What I Built

```
Turbocor chiller (Climatix POL687)
        │  RS-485, Modbus RTU (read-only)
        ▼
ESP32 device (custom PCB, Arduino core, OTA-updatable)
        │  outbound HTTPS, buffered on link loss [GAP: 斷線有沒有本地緩存?]
        ▼
Backend + time-series DB
        │
        ├─▶ Web dashboard (trends, history)
        ├─▶ Mobile app (real-time status)
        └─▶ Alert engine → push notification to duty staff
             when configurable thresholds / conditions are met
```

The device polls the controller for `[GAP: 幾個 register/測點?輪詢週期幾秒?這兩個數字很值錢]` — compressor speed, temperatures, pressures, fault codes `[GAP: 確認實際測點清單的大類]` — and uploads them continuously. Alert conditions are configurable per parameter; when one fires, duty staff get a push notification and can see the live picture from a phone before deciding whether to dispatch or call for service.

Delivery included the device itself, installation documentation, test records, and operator training. `[GAP: 測試做到什麼程度?有沒有一份驗收測試表?]`

> `[決策待定]` 問卷第 9 題提到「透過 AI 將長期資料生成障礙判斷條件」。這是**已上線的功能**,還是規劃中?若是規劃中,只能寫 "the accumulated dataset opens the door to ML-derived fault signatures — a planned next phase",不能寫成現況。**過度宣稱會毀掉整篇的可信度。**

## 5 · The Hard Part

The first firmware brought up the link — and read nothing but zeros. No data, no uploads, registers either empty or absent.

It turned out the original integration had **four independent defects stacked on top of each other**, which is what made diagnosis brutal: fixing any one of them alone changed nothing visible.

1. **Wrong baud rate** — `[GAP: 原設 vs 正確值,例:9600 vs 19200?]`
2. **Wrong Modbus function codes** — `[GAP: 用了 FC03 但該用 FC04?或相反?]`
3. **Table addresses used as PDU offsets** — the vendor documentation lists register `4xxxx`-style table addresses; the code was sending them raw on the wire instead of subtracting the offset. Every read was aimed at the wrong register.
4. **Float assembly errors** — 32-bit values span two registers, and the word order assumed by the code didn't match the controller's. Even correctly-addressed reads decoded to garbage.

`[GAP — 這一段是全篇最有價值的,請補:]`
- `[你用什麼工具隔離問題?Modbus Poll / mbpoll / 邏輯分析儀 / 示波器?有工具名這段就活了]`
- `[診斷順序是什麼?先確認物理層(A/B 線、終端電阻)→ 再 baud → 再 function code → 再位址?]`
- `[「以為修好了但其實沒有」那一次:是修好位址後數字出來了但數值荒謬(float 順序錯),所以看起來像修好?請描述]`

*This experience became the seed of the site's reference articles on Modbus addressing and float decoding — the exact traps documented so the next person loses hours, not days.* ← 與 Reference 叢集頁的串接句

## 6 · Outcome

`[GAP — 三個數字都需要量測基準,否則刪掉或改寫:]`

- **Fault-detection time down ~80%** — `[基準:以前平均多久發現?(靠巡檢=最長 X 小時)現在?(推播=分鐘級)如果是「小時級→分鐘級」,這樣寫比百分比更有力]`
- **Inspection hours down ~50%** — `[基準:以前每日 X 小時,現在 Y 小時?怎麼統計的?]`
- **資料完整率「成長100%」** → 建議改寫:以前**完全沒有**運轉資料,現在有連續的秒級/分鐘級歷史。"From zero recorded history to a continuous operating record" — 這比一個容易被誤讀的百分比誠實且更強
- **14+ months of continuous operation** `[GAP: 期間有沒有裝置端故障或 OTA 修復事件?「一年多零現場維護」或「透過 OTA 遠端修復 N 次」都是好素材]`

## 7 · What I'd Do Differently

`[GAP: 請給 1–2 點。候選:]`
- `[一開始就先驗證廠商 Modbus 文件的位址慣例,而不是信任文件?]`
- `[裝置端先做斷線緩存?]`
- `[其他?]`

## 8 · My Role

I was responsible for product design, circuit design, firmware, backend development, and ongoing operations — end to end. `[GAP: 現場配線與安裝是誰?原廠有參與協調嗎?客戶端窗口做了什麼?寫清楚別人做的部分,反而讓你做的部分更可信]`

---
---

# 英文寫作註記(你的原文 → 專業寫法)

| 你的說法(直譯) | 問題 | 專業寫法 |
|---|---|---|
| 成本太高 → "cost too high" | 太口語 | **prohibitively expensive** / the quote was **several times the retrofit budget** |
| 第一時間 → "at the first time" | 中式英文 | **immediately** / **within minutes** / **before it escalates** |
| 告警 | alarm 與 alert 不同 | 機器本體的警報 = **alarm**(alarm lamp);推播通知 = **alert** / **push notification** |
| 巡檢 | 不是 "patrol" | **inspection rounds**;巡檢時數 = inspection hours |
| 障礙排除 | 不是 "obstacle removal" | **troubleshooting** / **fault clearing**;叫修 = **call for service** / dispatch |
| 降低五成 / 縮短八成 | "reduce 50%" 少介係詞 | reduced **by** half / cut **by** 80% — by 不能省 |
| 值班人員 | | **duty staff** / on-duty technician |
| 冰水機 | | **chiller**(centrifugal chiller);冷房 = **cooling** / air conditioning |
| 不動既有系統 | | **non-invasive** / **read-only** / without touching the OEM controller |
| 上線 / 運轉一年多 | "online for one more year" 是常見誤譯 | **in production for over a year** / **14+ months of continuous operation** |

**一個結構性提醒**:你的 Q3 和 Q5 貼了同一段話——那段其實同時包含「問題」和「解法的好處」。英文 case study 裡這兩者必須分開:§2 只寫痛(不提你的方案),§6 才寫改善。痛寫得越純粹,後面的解法越有力。

---

# 待補清單(依優先序)

| # | 問題 | 用在 |
|---|---|---|
| 1 | **場地矛盾**:五星飯店 vs 休息站,實際關係是? | 全篇 |
| 2 | **AI 判斷功能是已上線還是規劃中?** | §4,過度宣稱風險 |
| 3 | 三個成果數字的量測基準(以前多久/幾小時 → 現在) | §6 |
| 4 | 診斷用了什麼工具、什麼順序?「以為修好了」那次的經過 | §5,全篇最有價值段 |
| 5 | 原廠選配/BMS 的報價量級(倍數即可,不用精確金額) | §3 |
| 6 | 測點數量與輪詢週期 | §4 |
| 7 | 專案期程;施工是誰做的 | Meta、§8 |
| 8 | 「不能動控制器」的原因(保固?原廠不開放?) | §1 |
