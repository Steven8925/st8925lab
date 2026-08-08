# ST8925 LAB — 網站規格書 v4
### Night Earth Homepage — Specification v4

---

## 0. 本版變更 / What Changed in v4

v4 在 v3 之上新增星雲爆炸、專案雙向連動與擴充性。**v3 的 52 個常數全部保留未改**。
v4 adds the nebula burst, bidirectional project linking and scalability on top
of v3. All 52 v3 constants are retained unchanged.

| # | 變更 Change | 節次 Section |
|---|---|---|
| 7 | **專案與軌道 1:1**，`ORBIT_RINGS` 由 `PROJECTS.length` 推導 | §12 |
| 8 | **星雲爆炸**：點擊任一端觸發，1.4 秒後導向 | §13 |
| 9 | **雙向連動**：點導覽列或點軌道光點皆可 | §14 |
| 10 | **配色上限 7 → 12 色**，全數 WCAG AAA | §15 |
| 11 | 新增 `config.js` 為唯一資料源；`project.html` 臨時頁 | §12 |
| 12 | 色相隨 URL 傳遞，修正專案頁顏色不符 | §14.3 |

### v3 的變更 / What v3 changed

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
| `index.html` | 版面與樣式 Markup & styling | 8.0 KB |
| `config.js` | **唯一資料源：`PROJECTS` + 12 色 `RAINBOW`** | 3.4 KB |
| `app.js` | 渲染引擎與全部參數 Render engine, all constants | 49.5 KB |
| `geodata.js` | 海岸線／陸地點陣資料 Coastline & landmass data | 24.3 KB |
| `project.html` | **臨時專案頁，吃 `?id=` 與 `&hue=`** | 6.5 KB |
| `verify.py` | 驗證腳本（**127 項檢查**）Verification harness | 42.1 KB |
| `make_standalone.py` | **打包單一檔案** Bundler | 5.3 KB |

載入順序不可調換 / Load order is mandatory:
`config.js` → `geodata.js` → `app.js`（`app.js` 於頂層即讀取 `PROJECTS` 與 `COAST_PACKED`）

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

## 7. 時間列與世界時間選單 / Clock Row & World Clock Select

### 7.1 雙時區格式與選單 / Dual-Time Format & Dropdown

```
20260807-071500 (Asia/Taipei) · 20260807-151500 (GMT+8)
```

單行，本地/選定時區時間在前、GMT+8 固定時間在後，皆為 `YYYYMMDD-HHMMSS` 24 小時制。全長約 47 字元。
Single line, with local/selected city time first and GMT+8 fixed time second, both in `YYYYMMDD-HHMMSS` 24-hour format. Total length ~47 characters.

### 7.2 世界城市清單 (62 城市) / World Cities List (62 Cities)

收錄 62 個世界主要城市，依國家英文名稱（A-Z）進行排序：
Includes 62 major world cities sorted alphabetically (A-Z) by country English name:
- **預設選取城市 / Default City**：`Taiwan_Taipei` (`Asia/Taipei`)
- **涵蓋區域 / Covered Regions**：包含台美英日法德中港星等 62 個跨時區國際主要都市 / 62 key international cities spanning Asia, Europe, Americas, Oceania, and Africa.
- **鍵盤快速搜尋 / Keyboard Quick Search**：支援鍵盤輸入字元快速比對（設有 800ms 防抖搜尋緩衝區 / 800ms debounce buffer）。

### 7.3 介面與互動樣式 / UI & Interaction Styling

- 下拉選單元素 `#world-clock-select` 採毛玻璃視覺風格（`backdrop-filter: blur(10px)`）、深色半透明背景與細微 hover Glow 效果。
- 由於父容器 `#clock` 設有 `pointer-events: none;`（避免阻擋 3D 地球滑鼠拖曳），`#world-clock-select` 必須明確設置 `pointer-events: auto;` 以維持選單的點擊與下拉互動能力。
- Dropdown select `#world-clock-select` uses frosted glass styling (`backdrop-filter: blur(10px)`), dark translucent background, and subtle hover glow.
- Since parent container `#clock` uses `pointer-events: none;` (to avoid blocking 3D globe mouse dragging), `#world-clock-select` explicitly sets `pointer-events: auto;` to preserve click and select capabilities.

### 7.4 位置與響應式 / Placement & Responsiveness

`top: calc(50% + var(--bar-h)/2 + 250px)`

250px 的依據：必須避開呼吸**最小時**的軌道（211px），而非只避開地球（130px）。
250px clearance ensures the clock clears the orbit ring at its minimum breath (211px), not just the globe (130px).

矮螢幕（`max-height: 760px`）改貼底部（`bottom: 40px`）；窄螢幕（`max-width: 560px`）改為兩行（`flex-direction: column`）。
Short viewports (`max-height: 760px`) pin to the bottom (`bottom: 40px`); narrow viewports (`max-width: 560px`) stack vertically into two lines.

### 7.5 顏色與實作細節 / Colour & Implementation Details

**(a) 兩段共用同一個格式化函式 / Unified Formatting Function**
選定時區時間透過 `Intl.DateTimeFormat` (`tzStamp()`) 解析並格式化，預設或備援狀態則以「UTC 副本 + 本地偏移」走 `stamp()`，確保補零與格式高度一致。
Selected city time is formatted via `Intl.DateTimeFormat` (`tzStamp()`), falling back to UTC offset `stamp()` to guarantee consistent 24-hour zero-padded formatting.

**(b) `getTimezoneOffset()` 符號相反 / Timezone Offset Sign Handling**
`getTimezoneOffset()` 回傳的是 **UTC 以西**的分鐘數（例如 UTC+8 會回報 `-480`）。備援標籤計算時已取負號修正。時區標籤優先使用 `Intl.DateTimeFormat` 的 `timeZoneName: 'short'`，失敗才落到數字偏移。
`getTimezoneOffset()` returns minutes WEST of UTC (e.g. UTC+8 returns -480). The fallback label flips the sign accordingly.

---

## 12. 專案與軌道 1:1 / Projects Map 1:1 to Orbits

### 12.1 唯一資料源 / Single Source of Truth

`config.js` 由**首頁與專案頁共同載入**，是專案清單與配色的唯一宣告處。

```javascript
const PROJECTS = [
    { id: '01', label: 'PROJECT 01' },
    // ...
];
const PROJECT_URL = (id, hue) =>
    `project.html?id=${id}` + (hue ? `&hue=${encodeURIComponent(hue)}` : '');
```

`app.js` 內：

```javascript
const ORBIT_RINGS = PROJECTS.length;      // 絕不寫死 / never hardcode
if (PROJECTS.length > RAINBOW.length) console.error(/* 顏色不足 */);
```

**新增一個專案的完整程序 = 在 `PROJECTS` 加一筆。** 環數、環平面角 `k·π/N`、配色、導覽列、可點光點全部自動跟上。

Adding a project is one array entry. Ring count, plane angles, colours, nav and
click targets all derive from it.

### 12.2 實測擴充性 / Measured Scalability

只改 `config.js`，其餘檔案一律未動：

| 專案數 N | 結果 | 環平面角間隔 |
|---|---|---|
| 3 | ✅ 全數通過 | 60.0° |
| 6（現行）| ✅ 127 項通過 | 30.0° |
| 12（上限）| ✅ 全數通過 | 15.0° |
| 13（超限）| ✅ **正確失敗** | — |

N=13 時 `palette covers the projects` 與 `no hue shortage` 皆失敗 —— 上限**會被明確擋下,而非默默壞掉**。

### 12.3 臨時專案頁 / Placeholder Page

`project.html?id=01&hue=blue`，單一頁面吃參數，**未來新增專案不必建檔**。
無 `?id=` 時自動退回索引頁，涵蓋以 `file://` 直接開啟的情況。

---

## 13. 星雲爆炸 / Nebula Burst

### 13.1 參數 / Parameters

```javascript
BURST_DURATION     = 1400   // ms
BURST_PARTICLES    = 140
BURST_SPEED_MIN    = 70     // px/s
BURST_SPEED_MAX    = 300    // px/s
BURST_DAMPING      = 0.945  // 每幀阻尼 / per-frame
BURST_RING_MAX     = 120    // px 衝擊波 / shockwave
BURST_FLASH_SCALE  = 5.0
BURST_PARTICLE_R   = 2.4    // px
BURST_CLOUDS       = 7      // 瀰漫雲團 / diffuse blobs
BURST_CLOUD_R      = 78     // px
BURST_GLOW_MULT    = 4.5    // 粒子光暈倍率 / glow radius
BURST_SPARKS       = 16     // 十字星芒 / cross flares
```

### 13.2 「不明顯」的量化診斷 ⚠️ / Diagnosing "Not Obvious Enough"

初版爆炸經使用者實測回報「不明顯」。以灰階百分位比對使用者提供的星雲參考圖：

| 對象 Subject | 中位數 | **p90** | p99 | >140 佔比 |
|---|---|---|---|---|
| 參考星雲圖（5 張）| 15–47 | **68–136** | 126–223 | 0.6–9.0% |
| **初版爆炸** | 7 | **7** | 114 | **0.3%** |
| **本版（150ms）**| 7 | **156** | 255 | 10.6% |

**p90 = 7 幾乎等於純黑。** 初版是「黑底上的稀疏亮點」，而參考圖的關鍵特徵是**瀰漫的亮霧**。這是「不明顯」的量化根因，非主觀判斷。

The reference images' 90th-percentile luminance is 68–136; the first burst
measured 7 — essentially black. It was sparse dots, not the diffuse haze that
makes a nebula read as one.

### 13.3 五層繪製 / Five Layers

```
prog = t / BURST_DURATION
fade = (1 - prog)^1.7        // 非線性：線性會使大半時間偏暗
rise = min(1, prog / 0.06)   // 60ms ease-in
```

| 層 Layer | 內容 | 作用 |
|---|---|---|
| 1 瀰漫雲團 | 7 團大半徑低 alpha 徑向漸層 | **抬升中間調成霧** |
| 2 衝擊波 | 半徑 `120·prog`，線寬隨 fade 變細 | 擴張感 |
| 3 核心閃光 | `1 − prog·3`，於 1/3 處收乾 | 起始衝擊 |
| 4 粒子＋光暈 | 140 顆，各帶 ×4.5 半徑光暈、白色核心 | 融入霧氣 |
| 5 十字星芒 | 16 顆帶星芒 | 星點質感 |

**加成混合為必要條件**：

```javascript
ctx.globalCompositeOperation = 'lighter';   // 重疊處累加趨白
// ... 繪製 ...
ctx.globalCompositeOperation = prev;        // 必須還原
```

未還原則**後續所有繪製**都會變成加成混合。

### 13.4 粒子數學 / Particle Maths

```javascript
const a = Math.random() * Math.PI * 2;
// sqrt() 使速度偏向外側，內外密度較均勻，才像雲團而非中心團塊
const v = BURST_SPEED_MIN + Math.sqrt(Math.random()) * (SPEED_MAX - SPEED_MIN);

// 更新（幀率無關）/ frame-rate independent
const k = Math.pow(BURST_DAMPING, delta * 60);
p.x += p.vx * delta;  p.vx *= k;
```

**必須用阻尼而非等速。** 等速會散成均勻圓環（煙火感）；阻尼使粒子減速後聚攏、疏密不均，才有星雲感。實測 1400ms 時最遠行進 **90.1 px**，落在 120 px 衝擊波內。

### 13.5 深度排序 / Depth Sorting

爆炸**參與正常深度排序**，不畫在最上層：

```javascript
for (const b of bursts) drawList.push({ z: b.z, render: () => drawBurst(b) });
drawList.sort((a, b) => b.z - a.z);
```

故轉到地球背面的爆炸會被正確遮住 —— 物理誠實優先於回饋明確（使用者決策）。

---

## 14. 雙向連動 / Bidirectional Linking

### 14.1 單一入口 / Single Entry Point

兩個方向**共用同一函式**，因此不可能各自飄移：

```
點導覽列 → openProject(i)          → 爆炸 → 1400ms → 導向
點軌道光點 → openProject(hit.ring) → 爆炸 → 1400ms → 導向
```

`navLocked` 防重複觸發。主光點位於地球背面時仍延遲相同時間，時序一致。

### 14.2 點擊 vs 拖曳 / Click vs Drag

```javascript
CLICK_MAX_MOVE = 6      // px
CLICK_MAX_MS   = 400    // ms
HIT_PADDING    = 8      // px 命中寬容
```

位移 < 6px **且** 按壓 < 400ms 才算點擊。**缺此判定則每次拖曳收尾都會誤觸發爆炸。**

**命中偵測**：`render()` 每幀重建 `hitTargets[]`。被地球遮擋的光點在迴圈中已 `continue`，**根本不會進入列表，因此天然不可點**。同環 4 顆全部可點，重疊時取最近者。

⚠️ 迴圈變數為 `k`，不是 `r`（`r` 在該作用域是顏色的紅色分量）。

### 14.3 色相必須隨 URL 傳遞 ⚠️ / The Hue Must Travel

首頁每次載入都以 Fisher-Yates 洗牌，**第 i 環並非第 i 色**。若專案頁以索引取色：

| 情況 | 機率（20,000 次模擬）|
|---|---|
| 單一專案顏色相符 | **8.4%**（≈ 1/12）|
| 六個專案全部相符 | **0.000%** |

**顏色不符才是常態。** 故色相必須顯式傳遞：

```javascript
// 導向時傳入實際色相 / send the ACTUAL hue
PROJECT_URL(PROJECTS[ringIndex].id, ringColours[ringIndex].name);

// 專案頁優先採用；直接開啟才退回索引
const col = RAINBOW.find(c => c.name === hue) || RAINBOW[idx % RAINBOW.length];
```

---

## 15. 配色上限 7 → 12 / Palette Ceiling

原 7 色在第 8 個專案會取到 `undefined`。新增 5 色填入原 7 色的**色相空隙**，明度以二分搜尋調整至對比 ≥ 7.30。

| 色相° Hue | 名稱 Name | Hex | 對比 Contrast | |
|---|---|---|---|---|
| 0.0 | red | `#ff6b6b` | 7.26 | 原有 |
| 31.0 | orange | `#ffa94d` | 10.59 | 原有 |
| 47.8 | yellow | `#ffe066` | 15.46 | 原有 |
| **89.1** | **lime** | **`#61af0e`** | **7.34** | **新增** |
| 130.0 | green | `#69db7c` | 11.54 | 原有 |
| **167.8** | **teal** | **`#0eb08f`** | **7.32** | **新增** |
| 206.8 | blue | `#4dabf7` | 8.14 | 原有 |
| **231.4** | **azure** | **`#8595f5`** | **7.31** | **新增** |
| 255.1 | indigo | `#a78bfa` | 7.41 | 原有 |
| **282.7** | **purple** | **`#d077f4`** | **7.32** | **新增** |
| **311.1** | **magenta** | **`#f265d8`** | **7.32** | **新增** |
| 338.8 | violet | `#f783ac` | 8.44 | 原有 |

**原 7 色一個位元都沒動**，故 6 專案時的視覺與 v3 完全相同。最低對比 **7.26**，全數 ≥ AAA (7.0)。

> ⚠️ **上限仍在，只是從 7 推到 12。** 第 13 個專案會使兩專案同色，雙向對應即失效。
> ⚠️ **最小相鄰色相差 16.8°（orange↔yellow）是原本就存在的一對**，非新增所致。兩者同時出現時可能不易分辨。

---

## 8. 已驗證項目 / Verified

`verify.py` 共 **127 項檢查全數通過**。常數以 regex 從 `app.js` 與 `config.js` 解析而非重打，故腳本不會與實作脫節。

| 節次 Section | 主題 Topic | 檢查數 |
|---|---|---|
| 1–11 | v3 既有項目（幾何、配色、地理、呼吸、透鏡、貼字、地標、時鐘）| 86 |
| 12 | 星雲爆炸與點擊判定 | 20 |
| 13 | 擴充性與顏色傳遞 | 21 |
| **合計** | | **127** |

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
   **v4 追加負擔**：爆炸期間每幀額外 140 顆粒子 × 各 1 個徑向漸層 + 7 個雲團漸層 + 16 條星芒。漸層建立成本高，**爆炸期間的實機 FPS 完全未量測**。

7. **v4：爆炸從未在 Canvas 上執行** — `preview_burst.png` 是以相同常數與相同粒子數學在 Pillow 重繪，證明時序、形狀與亮度分佈，**不**證明 Canvas 的 `'lighter'` 混合實際外觀。

8. **v4：點擊與導向從未真正發生** — 命中半徑、點擊/拖曳門檻皆為數學驗證，未經真實 pointer 事件。`?id=` / `&hue=` 解析與 `file://` fallback 亦未實測。

請在瀏覽器中確認第 2、3、5、6、7、8 項。

> ⚠️ **使用者實測已推翻兩項本可通過靜態檢查的假設**（專案頁顏色不符、爆炸不明顯）。
> **靜態驗證通過不等於視覺與互動正確。**
> Static checks passing does not mean the visuals or interactions are right —
> user testing overturned two assumptions that had passed all checks.

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
| 1 | ~~專案連結為 `#project-01` 佔位~~ → **v4 已改為 `project.html?id=01`** |
| 2 | ~~`CONTACT` 連結為 `#contact` 佔位~~ → **v4 已改為 `mailto:`** |
| 2a | `project.html` 內容仍為「Welcome to Project XX」佔位，需替換為實際內容 |
| 2b | 專案數超過 12 時需擴充 `RAINBOW`（維持對比 ≥ 7.0）|
| 3 | 部署後決定是否開啟 `ENABLE_GEO_LOOKUP`，或改為寫死座標 |
| 4 | 沙箱實測 ipapi.co 回 429，正式環境需確認可用性與配額 |
| 5 | 未處理 `prefers-reduced-motion` 對呼吸與自轉的暫停 |
| 6 | 環與環交叉處仍為單一平均 z 的畫家演算法，精確遮擋需 WebGL |

---

## 11. 授權 / Licence

地理資料來自 **Natural Earth**，公有領域，無需標示。
Geographic data from Natural Earth — public domain, no attribution required.
