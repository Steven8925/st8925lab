# ST8925 LAB — 網站規格書 v3
### Night Earth Homepage — Specification v3

---

## 0. 本版變更 / What Changed in v3

| # | 變更 Change | 節次 Section |
|---|---|---|
| 1 | 軌道呼吸：自主正弦 ±12% + 滑鼠疊加 +8%，地球不變 | §2 |
| 2 | 專案列由地球下方移至頂部導覽列 | §3 |
| 3 | 站名 `ST8925 LAB`：5 秒亦滅 + hover 逐字透鏡放大 | §4 |
| 4 | 地球貼地浮雕文字 `st8925lab`，太平洋與大西洋各一處 | §5 |
| 5 | 台灣、新加坡雷達紅點；部署地紅點需手動開啟 | §6 |
| 6 | 地球下方雙時區時間列，彩虹隨機色 | §7 |

**檔案 / Files**

| 檔案 File | 用途 Purpose | 大小 Size |
|---|---|---|
| `index.html` | 版面與樣式 Markup & styling | 7.7 KB |
| `app.js` | 渲染引擎與全部參數 Render engine, all constants | 35.7 KB |
| `geodata.js` | 海岸線／陸地點陣資料 Coastline & landmass data | 24.3 KB |
| `verify.py` | 驗證腳本（85 項檢查）Verification harness (85 checks) | 31.3 KB |

---

## 1. 已解決的規格衝突 / Resolved Conflicts

本版需求中有六項無法直接實作，處理如下。每項皆附實測數字。
Six items in the brief could not be implemented as written. Each resolution is backed by measurement.

### 衝突 1：「底色 +50% 亮度」的文字看不見 ⚠️

地球底色 `#0b1a2e`。三種「+50%」算法實測：

| 解讀 Reading | 結果色 | 對比底色 Contrast |
|---|---|---|
| RGB 各分量 ×1.5 | `#102745` | **1.16** |
| HSL 明度 ×1.5 | `#102745` | **1.16** |
| WCAG 亮度 ×1.5 | `#0e213b` | **1.08** |

對照：城市燈光對比 **11.07**、海岸線 **12.53**。

**決議**：放大到 **+150%**（×2.5），最亮對比 **1.71**。仍屬極微妙的浮雕效果，但肉眼可辨。最暗相維持 ×1.0（與底色完全相同，真正隱形），符合原始規格「最暗時與底色一致」。

**Resolution**: raised to +150% (×2.5), peak contrast 1.71 — still a very subtle emboss but perceptible. The trough stays at ×1.0, exactly matching the base colour as the brief required.

### 衝突 2：「太平洋與大西洋正中間」在陸地上

- 太平洋中心 ≈ 西經 160°，大西洋中心 ≈ 西經 30°
- 兩者中點 = 西經 95° → **墨西哥／中美洲陸地**

**決議**：改為**兩處各放一份**（你的選擇）。中心經度**由實際地理資料計算**，非目測：

取赤道帶（lat ±4°）上的無陸地缺口：

| 海洋 Ocean | 經度範圍 Range | 寬度 Width | 中點 Centre |
|---|---|---|---|
| 大西洋 Atlantic | `-38° .. +9°` | 47° | **-14°** |
| 太平洋 Pacific | `+153° .. +279°`（跨換日線 crosses date line） | 126° | **-144°** |

> 我原先目測估的是大西洋 `-35..+8`、中心 `-30°`。實測後發現 `-30°` 會讓文字左緣落在 **-44.8°**，壓到南美洲海岸。已修正為 `-14°`。
> My initial eyeball estimate put the Atlantic centre at -30°, which pushed the text's left edge to -44.8° and onto the South American coast. Corrected to -14° from the measured data.

### 衝突 3：地球自轉，貼地文字會轉走

`EARTH_SPIN = 0.18 rad/s`，35 秒一圈。

**決議**：接受此行為（你的選擇「貼地表，隨自轉進出」）。加入邊緣淡出以避免文字在邊緣糊成一團 —— 見 §5.3。兩處相隔 **130°**，會**輪流**進出視野，不會同時消失。

### 衝突 4：時間字串放不進地球

`20260807-071500 (GMT+8)` 共 23 字元，在 260px 地球上佔 44~60% 寬。

**決議**：時間移到**地球下方**（你的選擇），單行、本地在前、GMT+8 在後。地球上只留 `st8925lab`。

### 衝突 5：部署地 IP 定位——沙箱實測失敗

| 服務 Service | 結果 Result |
|---|---|
| `ipapi.co` | HTTP **429** 限流 rate-limited |
| `ip-api.com` | HTTP **406** |
| `ipify.org` | ✅ 僅回 IP，**無經緯度** IP only, no coordinates |

且網站尚未部署，「部署地」目前不存在。

**決議**：程式寫好但 **`ENABLE_GEO_LOOKUP = false` 預設關閉**。詳見 §6.3 的隱私取捨。

### 衝突 6：時間「亂數顏色」可能抽到看不見的色

**決議**：沿用現有的提亮彩虹 7 色（對比皆 ≥ 7.26，已達 AAA），洗牌後取前 2 色，兩行必不同色。

---

## 2. 軌道呼吸 / Orbit Breathing

### 2.1 參數 / Parameters

| 參數 Parameter | 常數 Constant | 值 Value |
|---|---|---|
| 自主幅度 Autonomous amplitude | `BREATH_AMPLITUDE` | `0.12`（±12%）|
| 週期 Period | `BREATH_PERIOD` | `8.0` 秒 s |
| 滑鼠最大疊加 Max mouse boost | `MOUSE_BREATH_MAX` | `0.08`（+8%）|
| 滿額距離 Range for max | `MOUSE_BREATH_RANGE` | `420` px |
| 追隨阻尼 Follow damping | `MOUSE_DAMPING` | `0.06` |

### 2.2 實測範圍 / Measured Range

| 狀態 State | 軌道半徑 Orbit radius |
|---|---|
| 最小 Minimum | **211.2** px |
| 靜止 Rest | **240.0** px |
| 自主最大 Autonomous peak | **268.8** px |
| 加滑鼠最大 With mouse | **288.0** px |
| **地球 Earth** | **130 px（恆定 constant）** |
| 最小淨空 Min clearance | **81.2 px**（軌道最小 − 地球）|

### 2.3 三個實作要點 / Three Implementation Notes

**(a) 呼吸只作用於軌道**
`earthPx` 刻意不乘 `breath`，地球恆定於中心。已由 verify.py 檢查原始碼確認。

**(b) 用 `sin()` 而非重新映射的 `(1-cos)/2`**

```js
return 1 + Math.sin(phase) * BREATH_AMPLITUDE + mouseBreath;
```

`sin(0) = 0` → 起始倍率恰為 **1.0000**，載入瞬間無跳動。

對照組是常見的另一種寫法：`(1−cos φ)/2` 產生 0..1，需重新映射到 ±A 才有相同擺幅，即 `1 + (2k−1)·A`。此式在 t=0 時 k=0，倍率為 **1 − 0.12 = 0.88**，畫面載入瞬間會先縮 12% 再擴張。

`sin(0)=0` gives exactly **1.0000** on the first frame. The common alternative `(1−cos φ)/2` yields 0..1 and must be remapped to ±A as `1 + (2k−1)·A` to match the same swing; at t=0 that gives **1 − 0.12 = 0.88**, so the scene visibly snaps inward on load before expanding.

> 注意：未經重新映射的 `1 + k·A` 在 t=0 同樣為 1.0，不會跳動。0.88 這個數字只在**重新映射**的前提下成立。
> Note: the un-remapped form `1 + k·A` also starts at 1.0. The 0.88 figure holds only for the remapped variant.

**(c) `resize()` 必須預留膨脹後的空間**
```js
const maxR = ORBIT_RADIUS * (1 + BREATH_AMPLITUDE + MOUSE_BREATH_MAX);
```
若只用靜止半徑計算 `sceneScale`，呼吸最大時會在小螢幕被裁切。

**(d) 幀率無關的平滑 / Frame-rate independent smoothing**
```js
mouseBreath += (target - mouseBreath) * (1 - Math.pow(1 - MOUSE_DAMPING, delta * 60));
```
60 Hz 與 144 Hz 手感一致。

---

## 3. 頂部導覽列 / Top Bar

版型：**左站名 · 中專案 · 右按鈕**，與參考站結構一致。

| 項目 Item | 值 Value |
|---|---|
| 高度 Height | `--bar-h: 64px`（≤720px 螢幕為 56px）|
| 背景 Background | `rgba(4,7,14,0.55)` + `backdrop-filter: blur(14px) saturate(120%)` |
| 專案 Projects | `PROJECT 01` … `PROJECT 06`，字色對應各環主光點 |
| 右側 CTA | `CONTACT`（≤720px 隱藏 hidden）|

毛玻璃的必要性：軌道呼吸最大達 288px，會通到導覽列後方。半透明模糊讓軌道隱約可見，保有空間層次。

> ⚠️ **參考網站的實作方式未取得。** `webfetch` 只回傳了 DOM 文字，沒有 CSS 或 JS。本節的版型是依據可見的結構（左站名、中導覽、右按鈕）所做的設計，**不是對該站的逆向還原**。
> The reference site's implementation was **not** obtained — `webfetch` returned DOM text only, no CSS or JS. This layout is a design based on the observable structure, not a reverse-engineering of that site.

---

## 4. 站名 / Wordmark

### 4.1 亦滅 / Pulse

| 參數 Parameter | 常數 Constant | 值 Value |
|---|---|---|
| 週期 Period | `PULSE_PERIOD` | `5.0` 秒 s |
| 暗相 Dark phase | `PULSE_DARK` | `0x55` → `#555555` |
| 亮相 Bright phase | `PULSE_BRIGHT` | `0x99` → `#999999` |

平滑正弦，實測值：

| t (s) | 灰階 Grey | 對比 Contrast |
|---|---|---|
| 0.00 | `#555555` | 2.70 |
| 1.25 | `#777777` | 4.50 |
| 2.50 | `#999999` | **7.07 (AAA)** |
| 3.75 | `#777777` | 4.50 |
| 5.00 | `#555555` | 2.70 |

「黑灰色」與深色背景本質衝突（`#333` 對比僅 **1.60**）。在灰色區間振盪是折衷：整體仍是黑灰調性，亮相時可讀。因為這是裝飾性標題而非正文，可接受。

### 4.2 逐字透鏡 / Per-glyph Lens

hover 時**亦滅繼續、顏色不變**，只疊加放大（你的選擇）。

| 參數 Parameter | 常數 Constant | 值 Value |
|---|---|---|
| 峰值放大 Peak magnification | `LENS_MAX_SCALE` | `1.55`（+55%）|
| 影響半徑 Influence radius | `LENS_RADIUS` | `110` px |
| 峰值上移 Peak lift | `LENS_LIFT` | `9` px |
| 追隨阻尼 Damping | `LENS_DAMPING` | `0.18` |

**升餘弦衰減 / Raised-cosine falloff**：
```
f = 0.5 + 0.5·cos(π · d / LENS_RADIUS)
scale = 1 + (LENS_MAX_SCALE − 1)·f
lift  = −LENS_LIFT · f
```

選這條曲線的理由：**兩端斜率皆為 0**（實測 `-0.000000`），因此透鏡影響範圍的邊界沒有折痕。線性衰減會在 `d = LENS_RADIUS` 處出現明顯摺角。原理同 macOS Dock。

| d (px) | f | scale | lift |
|---|---|---|---|
| 0 | 1.000 | 1.550 | -9.00 |
| 55（半徑一半）| 0.500 | 1.275 | -4.50 |
| 110（邊緣）| 0.000 | 1.000 | 0.00 |

**兩個實作陷阱 / Two pitfalls**：
1. `.glyph` **不可**設 CSS `transition` —— JS 每幀寫入 transform，兩者會疊加成雙重延遲。
2. 字元中心必須在**透鏡關閉時**量測並快取，否則放大後的位置會回授到下一幀。字型載入完成後需重新量測（`document.fonts.ready`）。

---

## 5. 地球貼地浮雕文字 / Embossed Surface Text

### 5.1 參數 / Parameters

| 參數 Parameter | 常數 Constant | 值 Value |
|---|---|---|
| 文字 Text | `SURFACE_TEXT` | `st8925lab` |
| 字級 Font size | `EMBOSS_FONT_PX` | `12` px |
| 週期 Period | `EMBOSS_PERIOD` | `5.0` 秒 s |
| 最暗倍率 Trough multiplier | `EMBOSS_MIN_MULT` | `1.0` |
| 最亮倍率 Peak multiplier | `EMBOSS_MAX_MULT` | `2.5`（+150%）|
| 淡出門檻 Fade threshold | `EMBOSS_FADE_COS` | `0.35` |
| 基準色 Base colour | `OCEAN_BASE` | `#0b1a2e` |

### 5.2 位置 / Placement

| 站點 Site | 中心經度 Centre | 文字範圍 Text span | 所在缺口 Land-free gap |
|---|---|---|---|
| 太平洋 Pacific | `-144°` | `-158.8° .. -129.2°` | `+153° .. +279°`（126° 寬）|
| 大西洋 Atlantic | `-14°` | `-28.8° .. +0.8°` | `-38° .. +9°`（47° 寬）|

文字跨 **約 29.5°**，兩處皆完整落在無陸地區間內，不壓海岸線。

> **此數字為估算，非瀏覽器實測 / Estimated, not browser-measured.**
> `app.js` 執行時以 `ctx.measureText()` 取得真實寬度，但驗證腳本無法呼叫 Canvas API，改用 advance ratio `0.62` 估算。實際等寬字型多為 0.55~0.60，故 **0.62 是保守高估**。
> `app.js` uses `ctx.measureText()` at runtime; the harness cannot call Canvas, so it estimates with an advance ratio of 0.62. Real monospace faces measure 0.55-0.60, so 0.62 **over-estimates** the width.

**餘裕分析 / Headroom analysis**（由 `verify.py` 二分搜尋求得 / binary-searched by `verify.py`）：

| 字型 Face | advance | 跨距 Span | 大西洋餘裕 Atlantic margin |
|---|---|---|---|
| Consolas | 0.550 | 26.2° | +9.9° |
| SF Mono / Menlo / DejaVu / JetBrains | 0.600 | 28.6° | +8.7° |
| **本文估算 heuristic** | **0.620** | **29.5°** | **+8.2°** |
| **臨界值 breaking point** | **0.966** | 46.0° | 0° |

字寬需比估算再大 **56%** 才會壓到海岸線。任何真實等寬字型都不可能到那個寬度，故**結論不受此估算誤差影響**。此餘裕檢查已寫入 `verify.py`，因此結果不必信任 `0.62` 這個數字本身。

The advance would have to be **56% wider** than assumed before a coastline is touched, which no real monospace face approaches. The conclusion is therefore robust. This headroom test is part of `verify.py`, so the result does not rest on trusting 0.62.

**地球不需放大**：你說「若塞不進去可放大地球」，實測 130px 已足夠：

| 地球半徑 | 12px 字級跨距 | 大西洋（47°）|
|---|---|---|
| **130 px** | **29.5°** | ✅ |
| 160 px | 24.0° | ✅ |
| 200 px | 19.2° | ✅ |

故維持 `EARTH_RADIUS = 130`，避免連動改軌道半徑。

### 5.3 邊緣淡出 / Limb Fade

貼球面的文字轉到邊緣時會被透視壓縮：

| θ（距正對點）| cos θ | 有效寬度 | 可讀性 |
|---|---|---|---|
| 0° | 1.000 | 100% | 佳 |
| 45° | 0.707 | 71% | 佳 |
| 60° | 0.500 | 50% | 勉強 |
| **70°** | **0.342** | **34%** | **不可讀** |
| 80° | 0.174 | 17% | 糊成一團 |

門檻設在 `cos θ = 0.35`（約 69.5°），低於此值淡出：

```
fade = (facing − 0.35) / (1 − 0.35)
```

實測 `fade(0.35) = 0.000`、`fade(1.0) = 1.000`，門檻處恰為零，無硬邊。

**可見時間**：每處每 **34.9 秒**轉一圈中，可見 **13.5 秒（39%）**。兩處相隔 130°，會輪流出現——一處在中央清楚時，另一處正在邊緣淡出。

### 5.4 亮度循環 / Brightness Cycle

| t (s) | 倍率 Mult | 顏色 Colour | 對比底色 Contrast |
|---|---|---|---|
| 0.00 | ×1.00 | `#0b1a2e` | **1.00**（完全隱形 invisible）|
| 1.25 | ×1.75 | `#132e50` | 1.28 |
| 2.50 | ×2.50 | `#1c4173` | **1.71**（最亮 peak）|
| 3.75 | ×1.75 | `#132e51` | 1.28 |
| 5.00 | ×1.00 | `#0b1a2e` | 1.00 |

### 5.5 實作方式 / Implementation

每個字元**各有自己的經度**並獨立投影，因此字串沿球面彎曲，而非平貼的標籤。角步進由 `ctx.measureText()` 實測寬度換算，故不受瀏覽器字型差異影響。

---

## 6. 地標紅點 / Location Markers

### 6.1 參數 / Parameters

| 參數 Parameter | 常數 Constant | 值 Value |
|---|---|---|
| 雷達環週期 Radar period | `MARKER_PERIOD` | `2.0` 秒 s |
| 紅點半徑 Dot radius | `MARKER_DOT_R` | `3.0` px |
| 環最大半徑 Max ring radius | `MARKER_RING_MAX` | `16` px |
| 顏色 Colour | `MARKER_COLOUR` | `rgb(255,64,64)` |

### 6.2 站點 / Sites

| 站點 Site | 緯度 Lat | 經度 Lon | 來源 Source |
|---|---|---|---|
| TAIWAN | `25.03` | `121.57` | 內建 built-in |
| SINGAPORE | `1.35` | `103.82` | 內建 built-in |
| 部署地 Deploy | — | — | **需開啟 opt-in**，見 §6.3 |

台北與新加坡經度僅差 **17.8°**，會幾乎同時進出視野。轉到背面時**完全隱藏**（與城市燈光、海岸線一致的背面剔除邏輯）。

雷達環：實心紅點恆亮，外圍圓環向外擴散並淡出，2 秒一次。先畫環再畫點，確保點永遠在上層。

### 6.3 部署地定位的隱私取捨 ⚠️ / Privacy Trade-off

```js
const ENABLE_GEO_LOOKUP = false;   // 預設關閉 / OFF by default
```

**開啟後會發生什麼 / What enabling this does**：

| 面向 Aspect | 關閉（預設）Disabled | 開啟 Enabled |
|---|---|---|
| 外部請求 External requests | **無 none** | 每次載入 1 次 one per load |
| 訪客 IP Visitor IP | 不外流 stays local | **送往第三方 sent to a third party** |
| 離線可用 Offline | ✅ | ❌ |
| `file://` 開啟 | ✅ | ❌ |

保護措施 / Safeguards：
- 3 秒 timeout（`AbortController`）
- 失敗、逾時、格式錯誤皆**靜默略過**，只顯示台灣與新加坡
- 端點為單一常數 `GEO_LOOKUP_URL`，便於更換或移除

---

## 7. 時間列 / Clock Row

### 7.1 格式 / Format

```
20260807-071500 (CST) · 20260807-151500 (GMT+8)
```

單行，本地在前、GMT+8 在後，皆為 `YYYYMMDD-HHMMSS` 24 小時制。全長 47 字元。

### 7.2 位置 / Placement

`top: calc(50% + var(--bar-h)/2 + 250px)`

250px 的依據：必須避開呼吸**最小時**的軌道（211px），而非只避開地球（130px）。

矮螢幕（`max-height: 760px`）改貼底部；窄螢幕（`max-width: 560px`）改為兩行。

### 7.3 顏色 / Colour

沿用提亮彩虹 7 色洗牌後取前 2 色。恆亮、不閃爍。每次載入換色，兩行必不同色（來自同一次洗牌的不同索引，數學上不可能相同）。

### 7.4 兩個實作細節 / Two Implementation Details

**(a) 兩段共用同一個格式化函式**
本地時間以「UTC 副本 + 本地偏移」計算，兩段都走 `stamp()`，因此不可能出現補零不一致。

**(b) `getTimezoneOffset()` 符號相反**
它回傳的是 **UTC 以西**的分鐘數，UTC+8 會回報 `-480`。備援標籤計算時已取負號。時區標籤優先用 `Intl.DateTimeFormat` 的 `timeZoneName: 'short'`，失敗才落到數字偏移。

---

## 8. 已驗證項目 / Verified

`verify.py` 共 **85 項檢查全數通過**。常數以 regex 從 `app.js` 解析而非重打，故腳本不會與實作脫節。

```bash
python3 verify.py            # 全部檢查 all checks
python3 verify.py --render   # 另存預覽圖 also write previews
```

### 8.1 本版新增的檢查 / New in v3

| 檢驗 Check | 結果 Result |
|---|---|
| 呼吸起始無跳動 No jump at t=0 | 倍率恰為 `1.0000` |
| 軌道永不觸及地球 Orbit clears globe | 最小淨空 `81.2 px` |
| `resize()` 預留峰值 Reserves peak | `1 + BREATH_AMPLITUDE + MOUSE_BREATH_MAX` |
| 地球不含呼吸 Earth excludes breath | `EARTH_RADIUS * sceneScale` |
| 無殘留 `ORBIT_RADIUS` 呼叫 No stale calls | `0` 處 |
| 透鏡兩端斜率為零 Zero slope at both ends | `-0.000000` |
| 亦滅亮相對比 Bright-phase contrast | `7.07`（AAA）|
| **貼字不壓海岸線 Text clears coasts** | **由實際地理資料推導驗證 derived from geodata** |
| 浮雕最暗等於底色 Trough equals base | `#0b1a2e`，完全隱形 |
| 浮雕最亮對比 Peak contrast | `1.71` |
| 淡出門檻處為零 Fade zero at threshold | `0.000000` |
| 紅點座標合法 Marker coords valid | 台灣、新加坡皆在範圍內 |
| IP 定位預設關閉 Geo lookup off | `false` |
| 定位有 timeout 與靜默失敗 | 皆確認 |
| 時間格式 Clock format | `20260807-071500` / `20260807-151500` |
| 時間用彩虹色盤 Clock uses palette | 兩色互異 |

### 8.2 開發中抓到的錯誤 / Bugs Found

**貼字座標估計錯誤（實際幾何錯誤）**
我原先目測估大西洋為 `-35..+8`、中心設 `-30°`。verify.py 改用**實際地理資料**推導後發現：真實範圍是 `-38..+9`，而 `-30°` 會讓文字左緣落到 `-44.8°`，**壓到南美洲海岸**。已修正為 `-14°`。

這是把「目測估計」換成「從資料推導」才抓到的 —— 若驗證腳本沿用我手打的邊界，這個錯誤會通過檢查。verify.py 現在直接從 `geodata.js` 解出赤道帶的無陸地缺口，因此不可能與真正繪製的地圖脫節。

**verify.py 常數解析器不支援十六進位**
`PULSE_DARK = 0x55` 解析失敗。已修正。

**v1 遺留檢查失效**
`--gap-below-earth` 在專案移到頂部後已不存在。已改為檢查頂部導覽列。

### 8.3 未驗證 / Not Verified

明確列出本規格**無法**保證的部分：

1. **JavaScript 未經引擎執行** — 本沙箱 `node --check` 因缺少 `cjs-module-lexer` 而中止，亦無 deno／bun／esprima。括號檢查僅為結構性，**不是**完整語法解析。

2. **未擷取瀏覽器實際畫面** — 預覽圖為 Python 近似重繪，抗鋸齒、漸層、`globalAlpha` 疊加行為與 Canvas 不同。預覽只能證明**幾何與配色正確**。

2a. **文字寬度未經 Canvas 實測** — `verify.py` 無法呼叫 `ctx.measureText()`，貼地文字的 29.5° 跨距是以 advance ratio `0.62` 估算。已加入餘裕分析證明結論可容忍 **56%** 的字寬誤差（見 §5.2），但跨距數字本身仍是估算值而非實測值。
    The 29.5° span is estimated with an advance ratio, not measured by Canvas. A headroom analysis shows the conclusion tolerates a 56% width error (§5.2), but the span figure itself remains an estimate.

3. **CSS 效果完全未驗證** — 毛玻璃 `backdrop-filter`、`color-mix()`、`clamp()` 皆未在瀏覽器測試。逐字透鏡的 DOM transform 亦未實測。

4. **參考網站的實作未取得** — 見 §3 的說明。

5. **IP 定位路徑未執行** — `ENABLE_GEO_LOOKUP = false`，第三個紅點的程式碼從未跑過。開啟後的行為未經驗證。

6. **未做效能實測** — 每幀約 5,968 個地表點 + 720 軌道線段 + 24 光點 + 360 拖尾點 + 18 個貼字字元，加上獨立的導覽列 rAF 迴圈。無實機 FPS 量測。

請在瀏覽器中確認第 2、3、5、6 項。

---

## 9. 執行 / Running

```bash
cd night_earth_v2
python3 -m http.server 8000
# 開啟 open <sCRub_customurl_qLwFxHhTPExdcuqoRk1kbXuAsvDCKywqx8wGWY9pAe2>
```

`ENABLE_GEO_LOOKUP = false` 時可直接以 `file://` 開啟，無任何外部請求。

---

## 10. 待辦 / Open Items

| # | 項目 Item |
|---|---|
| 1 | 專案連結為 `#project-01`…`06` 佔位，需替換為實際頁面 |
| 2 | `CONTACT` 按鈕連結為 `#contact` 佔位 |
| 3 | 部署後決定是否開啟 `ENABLE_GEO_LOOKUP`，或改為寫死座標 |
| 4 | 沙箱實測 ipapi.co 回 429，正式環境需確認可用性與配額 |
| 5 | 未處理 `prefers-reduced-motion` 對呼吸與自轉的暫停 |
| 6 | 環與環交叉處仍為單一平均 z 的畫家演算法，精確遮擋需 WebGL |

---

## 11. 授權 / Licence

地理資料來自 **Natural Earth**，公有領域，無需標示。
Geographic data from Natural Earth — public domain, no attribution required.
