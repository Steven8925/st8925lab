# ST8925 LAB — 製作過程演變史
### Development History

從一個 matplotlib 原子模型動畫，到一顆會呼吸的夜間地球首頁。本文記錄每一次迭代的**完整參數**、**每一個被推翻的假設**，以及**每一個抓到的錯誤**。

From a matplotlib atom animation to a breathing night-Earth homepage. This document records the **complete parameters** of every iteration, **every assumption that was overturned**, and **every bug that was caught**.

---

## 目錄 / Table of Contents

| 階段 Stage | 主題 Topic | 節次 |
|---|---|---|
| 0 | 起點：既有程式碼分析 Starting point: analysing existing code | [§1](#1-階段-0--起點分析) |
| 1 | 抽離為獨立程式 Extract to a standalone program | [§2](#2-階段-1--抽離獨立程式) |
| 2 | 原子核換成夜間地球 Swap the nucleus for a night Earth | [§3](#3-階段-2--夜間地球) |
| 3 | 呼吸、導覽列、透鏡 Breathing, top bar, lens | [§4](#4-階段-3--呼吸導覽列透鏡) |
| 4 | 貼地文字、地標、時鐘 Surface text, markers, clock | [§5](#5-階段-4--貼地文字地標時鐘) |
| — | 全部抓到的錯誤 All bugs found | [§6](#6-全部抓到的錯誤) |
| — | 全部被推翻的規格 All overturned requirements | [§7](#7-全部被推翻的規格) |
| — | 參數演變總表 Parameter evolution | [§8](#8-參數演變總表) |
| — | 驗證方法論 Verification methodology | [§9](#9-驗證方法論) |

---

## 1. 階段 0 — 起點分析

**需求 / Request**：「Analize this code and having a readme.md for it」

### 1.1 發現的檔案 / Files Found

```
test/
├── index.html               785 行 lines — Canvas 2D 原子軌道模擬器
├── import numpy as np.py     91 行 lines — matplotlib 互動檢視
├── save_orbit_gif.py         87 行 lines — 匯出 GIF
└── electron_orbit.gif       293 KB — 預先算好的動畫
```

三個檔案是**同一套幾何的三份實作**：網頁版（JS）、Python 互動版、Python GIF 匯出版。

Three files, **three implementations of the same geometry**: a web version in JS, an interactive Python version, and a Python GIF exporter.

### 1.2 共同的核心數學 / The Shared Core Maths

XY 平面上的圓，先繞 X 軸傾斜 `TILT`，再繞 Z 軸旋轉 `planeAngle`：

```
x0 = R·cos(θ)
y0 = R·sin(θ)

x  = x0·cos(planeAngle) − y0·cos(tilt)·sin(planeAngle)
y  = x0·sin(planeAngle) + y0·cos(tilt)·cos(planeAngle)
z  = y0·sin(tilt)
```

網頁版另外加上相機與透視除法：

```
繞 Y 轉 rotY → 繞 X 轉 rotX
fov = distance / (distance + z)     // distance = 600
px  = centerX + x·fov
py  = centerY + y·fov
```

### 1.3 原始參數 / Original Parameters

| 參數 | `index.html` | `import numpy as np.py` | `save_orbit_gif.py` |
|---|---|---|---|
| 環數 Rings | 2–6，預設 4 | 4 固定 | 4 固定 |
| 每環電子 e⁻/ring | 1–4，預設 2 | 1 | 1 |
| 半徑 Radius | 100–240 px | 1.3 資料單位 units | 1.3 |
| 傾角 Tilt | 15–85°，預設 65° | 65° 固定 | 65° 固定 |
| 幀數 Frames | 連續 rAF | 80，`interval=30` | 60，`fps=30` |
| 核心 Nucleus | 14px × fov | `s=250` | `s=280` |
| 環透明度 Ring alpha | 0.4 | 0.5 | 0.45 |
| 拖尾 Trail | 15 點，`Δθ=0.04` | 15 點跨 0.5 rad | 15 點跨 0.5 rad |
| 相機距離 Cam distance | 600 | mplot3d 內建 | mplot3d 內建 |

### 1.4 找出的 9 個問題 / Nine Issues Identified

| # | 問題 Issue | 位置 Location |
|---|---|---|
| 1 | DPR 縮放依賴隱含前提（`canvas.width=` 會重置 transform）| `index.html:499-504` |
| 2 | **寫死 Windows 絕對路徑** `c:/Users/win87/Desktop/個人網站/circle/` | `save_orbit_gif.py:83` |
| 3 | 檔名 `import numpy as np.py` 無法 import | — |
| 4 | `blit=True` 用於 3D artists，matplotlib blitting 是為 2D 設計 | 兩個 .py |
| 5 | 畫家演算法用單一平均 z，交叉環會整條疊前疊後 | `index.html:683-688` |
| 6 | 無 `pointercancel`／觸控事件，`rotX` 無上下限 | `index.html:525` |
| 7 | FPS 讀數無平滑，`Math.round(1/delta) \|\| 60` 逐幀跳動 | `index.html:597` |
| 8 | 幾何重複三份且**已經飄移**（`s=250` vs `s=280`）| — |
| 9 | 標題寫「Quantum」但模型是古典 Rutherford–Bohr | `index.html:6` |

> **自我修正 / Self-correction**：第 1 項我初稿寫成「scale 會累加」，重新檢查後發現 `canvas.width` 賦值會重置 transform，因此只套用一次。降級為「隱含依賴，非現行錯誤」。
> I first wrote this as an accumulating-scale bug. On re-check, assigning `canvas.width` resets the transform, so the scale applies exactly once. Downgraded to "fragile implicit dependency, not a live bug".

**產出 / Output**：`test/README.md`

---

## 2. 階段 1 — 抽離獨立程式

**需求 / Request**：抽出「電子繞原子核」為獨立程式，參數固定：6 環、每環 4 顆（原文寫 antipodal）、半徑 100–240px / 1.3 單位、傾角 65°、環透明度 0.4、拖尾 15 點。

### 2.1 使用者決策 / User Decisions

| 問題 Question | 選擇 Choice |
|---|---|
| 交付形式 Deliverable | 三個檔案都要 All three files |
| 網頁半徑 Web radius | 240 px |
| 每環排列 Point arrangement | 每 π/2 均分 Evenly π/2 |
| 拼字 Spelling | 修正為 `PROJECT` |

### 2.2 最終參數 / Final Parameters

```
6 環 × 4 顆 = 24 顆光點，其中 6 顆為主光點
6 rings × 4 points = 24 light points, 6 of them leads
```

| 參數 Parameter | 網頁 Web | Python |
|---|---|---|
| `ORBIT_RINGS` | 6 | 6 |
| `POINTS_PER_RING` | 4 | 4 |
| `RADIUS` | 240 px | 1.3 units |
| `TILT_DEG` | 65 | 65 |
| `RING_ALPHA` | 0.4 | 0.4 |
| `RING_SEGMENTS` | 120 | 200 |
| `NUCLEUS_PX` / `NUCLEUS_SIZE` | 14 (×fov) | `s=250` |
| `FRAMES` / `INTERVAL_MS` | 連續 rAF | 80 / 30 ms |
| GIF `FPS` | — | 30 |
| `TRAIL_POINTS` | 15 | 15 |
| `TRAIL_DTHETA` / `TRAIL_SPAN` | 0.04 rad | 0.5 rad |
| `CAM_DISTANCE` | 600 | mplot3d |

環平面角：`k·π/6` → **0°, 30°, 60°, 90°, 120°, 150°**

之所以是半圈而非整圈：旋轉 π 後的環與原環佔據同一平面，走滿 2π 會產生重複環。
A ring rotated by π occupies the same plane, so a full turn would duplicate rings.

### 2.3 推翻的規格 / Overturned Requirement

**「4 electrons per ring sit antipodal」自相矛盾。**
antipodal（對蹠）只適用 2 顆（相隔 π）。4 顆只能每 π/2 均分。

antipodal only holds for 2 points at π apart; 4 points can only be evenly spaced at π/2.

### 2.4 修正的 8 個問題 / Eight Fixes Applied

1. 絕對路徑 → `Path(__file__).resolve().with_name('electron_orbit.gif')`
2. `blit=True` → `blit=False`（3D artists 需重新投影）
3. **幾何去重**：`orbit_gif.py` 改為 `import orbit_viewer`，不再複製
4. `ctx.scale()` → `ctx.setTransform(dpr,0,0,dpr,0,0)`（冪等）
5. mouse events → pointer events + `setPointerCapture`
6. `rotX` 夾在 `±π/2`
7. FPS 指數移動平均（α=0.1），`delta` 上限 0.1 秒
8. `matplotlib.use('Agg')` 置於 pyplot import 之前

### 2.5 驗證 / Verification

| 檢驗 Check | 結果 Result |
|---|---|
| GIF 實際產出 | 80 幀，700×700，1,022,040 bytes |
| JS ↔ Python 幾何比對 | 最大差 **0.000e+00**（6 環 × 2 e⁻ × 12 幀）|
| 幀 20 目視 | 12 顆電子、6 環、紅核心皆正確 |
| HTML 標籤平衡 | 通過 |

**驗證員抓到的錯誤 / Bug caught by the verifier**：
我寫「2.67 秒迴圈」，但 GIF 格式的延遲欄位以 1/100 秒為單位量化，Pillow 實際寫入 **30 ms/幀** → **2.4 秒**（≈33.3 fps）。腳本印出的 2.67 秒是由要求的 `fps` 反算，非讀回檔案。已修正並記錄此格式限制。

**產出 / Output**：`atom_orbit/`（`index.html`、`orbit_viewer.py`、`orbit_gif.py`、`electron_orbit.gif`、`README.md`）

---

## 3. 階段 2 — 夜間地球

**需求 / Request**：首頁正中央放一顆自轉的夜間地球，五大洲以燈光顯示輪廓，外圈光點如電子般環繞。6 環、**每環 2 顆**、彩虹主光點、地球下方 200px 列出 6 個 PROJECT。

### 3.1 使用者決策 / User Decisions

| 問題 Question | 選擇 Choice |
|---|---|
| 地球渲染 Earth rendering | Canvas 2D + 海岸線光點（零依賴）|
| 每環光點 Points per ring | 每 π/2 均分（此階段為 2 顆）|
| 地球半徑 Earth radius | 130 px |
| 彩虹配色 Rainbow palette | 提亮版（WCAG AA）|
| 間距 Spacing | `clamp()` 響應式 |
| 非主光點 Non-lead colour | 同環同色但較暗 |
| 遮擋 Occlusion | 要遮擋 |
| 專案列 Project list | 橫向一列，可點擊 |

### 3.2 地理資料處理 / Geographic Data Pipeline

**來源 / Source**：Natural Earth 110m 陸地多邊形（公有領域，127 個 Polygon）

| 步驟 Step | 方法 Method | 結果 Result |
|---|---|---|
| 海岸線 Coastline | 沿多邊形邊界每 **0.85°** 重新取樣 | **3,735** 點 |
| 陸地內部 Landmass | 等面積網格（緯度步進 2.2°）+ 點內測試 | **2,233** 點 |
| 合計 Total | | **5,968** 點 |

**打包編碼 / Packing**：每點 4 個 base64 字元 = 23 bits

```
bits 22..11 : (lon + 180) × 10    [0..3600]
bits 10..0  : (lat + 90)  × 10    [0..1800]
```

| 指標 Metric | 值 Value |
|---|---|
| 原始 JSON Raw JSON | 64.8 KB |
| 打包後 Packed | **23.3 KB**（縮減 64%）|
| 量化誤差 Quantisation error | ≤ **0.05°**（約 5.5 km）|
| R=130px 時的像素誤差 | **0.072 px**（遠低於一像素）|

### 3.3 提亮彩虹的由來 / Why the Palette Was Brightened

原始 ROYGBIV 對 `#04070e` 背景實測：

| 色 Hue | 原始 Original | 對比 | 採用 Used | 對比 |
|---|---|---|---|---|
| 紅 Red | `#ff0000` | 5.04 ✅ | `#ff6b6b` | **7.26** |
| 橙 Orange | `#ff7f00` | 7.95 ✅ | `#ffa94d` | **10.59** |
| 黃 Yellow | `#ffff00` | 18.77 ✅ | `#ffe066` | **15.46** |
| 綠 Green | `#00ff00` | 14.69 ✅ | `#69db7c` | **11.54** |
| 藍 Blue | `#0000ff` | **2.35 ❌** | `#4dabf7` | **8.14** |
| 靛 Indigo | `#4b0082` | **1.56 ❌** | `#a78bfa` | **7.41** |
| 紫 Violet | `#9400d3` | **3.07 ❌** | `#f783ac` | **8.44** |

原始彩虹 **3 色低於 WCAG AA (4.5)**，靛色僅 1.56 幾乎不可讀。提亮版 7 色全數 ≥ 7.26，最低值也達 AAA (7.0)。

### 3.4 配色規則 / Colour Rule

```
Fisher-Yates 洗牌 7 色 → 取前 6 → 依序指派給第 1~6 環
```

- 每次載入重新洗牌（20,000 次模擬：**0 次重複**，分佈差距 0.7%）
- 每次恰有 **1 色未使用**（7 − 6 = 1）
- 專案字色與軌道讀取**同一個 `ringColours` 陣列**，故顏色連動是結構保證而非巧合

### 3.5 抓到的兩個 z 軸號誤 / Two Sign Errors

這是本階段最重要的發現。兩者同源，且**第二個只看靜態畫面看不出來**。

**錯誤 1：遮擋方向相反**

```js
// 錯 wrong
if (p.z >= 0) return false;
// 對 correct
if (p.z <= 0) return false;
```

因為 `fov = D/(D+z)`，**z 越大 → fov 越小 → 越遠**。所以「地球後方」是 `z > 0`。原本的寫法放行遠側、遮蔽近側，結果隱藏的是**地球前方**的光點。

**錯誤 2：背面剔除用錯座標系**

原本以**世界座標** z 判斷地球可見半球，導致拖曳相機時可見半球不會跟著改變。改用投影後的**相機座標** z。

**如何抓到的**：比對三個相機角度的「可見陸地點數」。

| 角度 Angle | rotX | rotY | 遮擋光點 Hidden | 可見陸地 Visible land |
|---|---|---|---|---|
| `A_front` | 0.35 | 0.0 | 4 | **848** |
| `B_drag` | 0.35 | 2.4 | 2 | **1740** |
| `C_top` | 1.20 | 0.8 | 1 | **1408** |

若用世界座標，這三個數字**不會**隨拖曳改變。三者相異即為證據。

### 3.6 v1 完整參數 / v1 Full Parameters

```javascript
ORBIT_RINGS      = 6       POINTS_PER_RING  = 2      // 此階段為 2
ORBIT_RADIUS     = 240     EARTH_RADIUS     = 130
TILT_DEG         = 65      RING_ALPHA       = 0.4
RING_SEGMENTS    = 120     ORBIT_SPEED      = 1.5    // rad/s
EARTH_SPIN       = 0.18    // rad/s，35 秒一圈
TRAIL_POINTS     = 15      TRAIL_DTHETA     = 0.04
LEAD_SCALE       = 1.5     POINT_SIZE       = 6
DIM_ALPHA        = 0.45    CAM_DISTANCE     = 900
CAM_RX0          = 0.35    CAM_RY0          = 0.0
DRAG_SENS        = 0.006   OCCLUSION_MARGIN = 0.985
BACKFACE_ALPHA   = 0.0
--gap-below-earth: clamp(80px, 18vh, 200px)
```

**產出 / Output**：`night_earth/`（`index.html`、`app.js`、`geodata.js`、`verify.py`、`SPEC.md`）

---

## 4. 階段 3 — 呼吸、導覽列、透鏡

**需求 / Request**：地球固定中心不變，外圍軌道隨滑鼠「呼吸」般變大變小。專案移到上方導覽列。站名 `ST8925 LAB` 黑灰色、5 秒亮滅、hover 時如透過水晶體般圓弧放大。

### 4.1 使用者決策 / User Decisions

| 問題 Question | 選擇 Choice |
|---|---|
| 呼吸驅動 Breathing driver | 自主呼吸 + 滑鼠疊加 |
| 幅度／週期 Amplitude / period | ±12%，8 秒 |
| 作用對象 Applies to | **僅軌道與光點，地球不變** |
| 滑鼠疊加 Mouse boost | 最大 +8%，**滑鼠越遠越大** |
| 站名顏色 Wordmark colour | 亮滅在灰色區間振盪 |
| 亮滅行為 Pulse behaviour | 平滑正弦 |
| hover 行為 Hover behaviour | **亮滅繼續，只加放大** |
| 透鏡實作 Lens | 逐字元距離透鏡 |
| 導覽列版型 Bar layout | 左站名·中導覽·右按鈕 |
| 導覽列背景 Bar background | 毛玻璃半透明 |

### 4.2 呼吸參數與實測 / Breathing Parameters and Measurements

```javascript
BREATH_AMPLITUDE   = 0.12   // ±12%
BREATH_PERIOD      = 8.0    // 秒 seconds
MOUSE_BREATH_MAX   = 0.08   // +8%
MOUSE_BREATH_RANGE = 420    // px，達到最大疊加的距離
MOUSE_DAMPING      = 0.06   // 追隨阻尼
```

| 狀態 State | 軌道半徑 Orbit radius |
|---|---|
| 最小 Minimum | **211.2 px** |
| 靜止 Rest | **240.0 px** |
| 自主最大 Autonomous peak | **268.8 px** |
| 加滑鼠最大 With mouse | **288.0 px** |
| **地球 Earth** | **130 px（恆定）** |
| 最小淨空 Min clearance | **81.2 px** |

### 4.3 三個實作要點 / Three Implementation Notes

**(a) 呼吸只作用於軌道**
`earthPx = EARTH_RADIUS * sceneScale`，刻意不乘 `breath`。地球恆定於中心。verify.py 直接比對原始碼字串確認。

**(b) 用 `sin()` 而非重新映射的 `(1-cos)/2`**

```js
return 1 + Math.sin(phase) * BREATH_AMPLITUDE + mouseBreath;
```

`sin(0) = 0` → 起始倍率恰為 **1.0000**，載入瞬間無跳動。

對照組 `(1−cos φ)/2` 產生 0..1，需重新映射到 ±A 才有相同擺幅，即 `1 + (2k−1)·A`。t=0 時 k=0，倍率為 **1 − 0.12 = 0.88**，畫面載入會先縮 12% 再擴張。

> 注意：未經重新映射的 `1 + k·A` 在 t=0 同樣為 1.0。0.88 只在**重新映射**前提下成立。此前提我初稿漏寫，經驗證員指出後補上。
> The 0.88 figure holds only for the remapped variant. This premise was missing from my first draft and was added after the verifier flagged it.

**(c) `resize()` 必須預留膨脹後的空間**

```js
const maxR = ORBIT_RADIUS * (1 + BREATH_AMPLITUDE + MOUSE_BREATH_MAX);
```

若只用靜止半徑算 `sceneScale`，呼吸最大時會在小螢幕被裁切。

**(d) 幀率無關平滑 / Frame-rate independent smoothing**

```js
mouseBreath += (target - mouseBreath) * (1 - Math.pow(1 - MOUSE_DAMPING, delta * 60));
```

### 4.4 站名亮滅 / Wordmark Pulse

```javascript
PULSE_PERIOD = 5.0     PULSE_DARK = 0x55     PULSE_BRIGHT = 0x99
```

| t (s) | 灰階 Grey | 對比 Contrast |
|---|---|---|
| 0.00 | `#555555` | 2.70 |
| 1.25 | `#777777` | 4.50 |
| 2.50 | `#999999` | **7.07 (AAA)** |
| 3.75 | `#777777` | 4.50 |
| 5.00 | `#555555` | 2.70 |

**推翻的規格**：「黑灰色」與深色背景本質衝突。實測 `#333333` 對 `#04070e` 對比僅 **1.60**，`#555555` 為 2.70，`#666666` 為 3.51，都低於 AA (4.5)。在灰色區間振盪是折衷 —— 整體仍是黑灰調性，亮相時可讀。因為是裝飾性標題而非正文，可接受。

### 4.5 逐字透鏡 / Per-glyph Lens

```javascript
LENS_MAX_SCALE = 1.55    LENS_RADIUS = 110    LENS_LIFT = 9    LENS_DAMPING = 0.18
```

**升餘弦衰減 / Raised-cosine falloff**：

```
f = 0.5 + 0.5·cos(π · d / LENS_RADIUS)
scale = 1 + (LENS_MAX_SCALE − 1)·f
lift  = −LENS_LIFT · f
```

| d (px) | f | scale | lift |
|---|---|---|---|
| 0 | 1.000 | 1.550 | −9.00 |
| 20 | 0.921 | 1.506 | −8.29 |
| 55（半徑一半）| 0.500 | 1.275 | −4.50 |
| 80 | 0.173 | 1.095 | −1.55 |
| 110（邊緣）| 0.000 | 1.000 | 0.00 |

選這條曲線的理由：**兩端斜率皆為 0**（實測 `-0.000000`），透鏡影響邊界無折痕。線性衰減會在 `d = LENS_RADIUS` 處出現明顯摺角。原理同 macOS Dock。

**兩個實作陷阱 / Two pitfalls**：
1. `.glyph` **不可**設 CSS `transition` —— JS 每幀寫 transform，兩者疊加成雙重延遲
2. 字元中心必須在**透鏡關閉時**量測並快取，否則放大後的位置會回授到下一幀。字型載入後需以 `document.fonts.ready` 重新量測

### 4.6 導覽列 / Top Bar

| 項目 Item | 值 Value |
|---|---|
| 高度 Height | `--bar-h: 64px`（≤720px 為 56px）|
| 背景 Background | `rgba(4,7,14,0.55)` |
| 模糊 Blur | `backdrop-filter: blur(14px) saturate(120%)` |
| z-index | 20 |

毛玻璃的必要性：軌道呼吸最大達 288px，會通到導覽列後方。

> ⚠️ **參考網站的實作方式未取得。** `webfetch` 只回傳 DOM 文字，沒有 CSS 或 JS。版型是依可見結構所做的設計，**不是逆向還原**。
> The reference site's implementation was **not** obtained — only DOM text was returned. This is a design based on observable structure, not reverse-engineering.

---

## 5. 階段 4 — 貼地文字、地標、時鐘

**需求 / Request**：地球上（太平洋與大西洋正中間）加 `st8925lab`，顏色以地球底色為基準、最亮 +50%、最暗與底色一致、5 秒循環。下方顯示本地時間與 GMT+8 時間，亮色恆亮、亂數顏色。台灣、新加坡、部署地（IP 查詢）各有紅點亮滅。

### 5.1 使用者決策 / User Decisions

| 問題 Question | 選擇 Choice |
|---|---|
| 文字定位 Text placement | 貼地表隨自轉進出，只放 `st8925lab` |
| 亮度 Brightness | 保留若隱若現但拉大到 +150% |
| 時間位置 Clock position | 移到地球下方，同一行，本地在前 |
| 時間顏色 Clock colour | 每次載入從彩虹 7 色抽 |
| 部署地 Deploy site | 執行時查詢，失敗則靜默略過 |
| 紅點行為 Marker behaviour | 雷達擴散環 2 秒一次 |
| 背面處理 Far side | 完全隱藏 |
| 貼字位置 Text sites | 太平洋與大西洋**各一處** |
| 時間格式 Clock format | `20260807-071500 (CST) · 20260807-151500 (GMT+8)` |

### 5.2 「底色 +50%」的實測 / Measuring "+50% Brightness"

地球底色 `#0b1a2e`。三種算法：

| 解讀 Reading | 結果色 | 對比底色 |
|---|---|---|
| RGB 各分量 ×1.5 | `#102745` | **1.16** |
| HSL 明度 ×1.5 | `#102745` | **1.16** |
| WCAG 亮度 ×1.5 | `#0e213b` | **1.08** |

對照：城市燈光對比 **11.07**、海岸線 **12.53**。

**決議**：放大到 **+150%**（×2.5），最亮對比 **1.71**。最暗維持 ×1.0（與底色完全相同，真正隱形），符合原規格「最暗時與底色一致」。

| t (s) | 倍率 | 顏色 | 對比 |
|---|---|---|---|
| 0.00 | ×1.00 | `#0b1a2e` | **1.00**（隱形）|
| 1.25 | ×1.75 | `#132e50` | 1.28 |
| 2.50 | ×2.50 | `#1c4173` | **1.71** |
| 3.75 | ×1.75 | `#132e51` | 1.28 |
| 5.00 | ×1.00 | `#0b1a2e` | 1.00 |

### 5.3 「兩大洋正中間」的問題 / The Ocean Midpoint Problem

- 太平洋中心 ≈ 西經 160°，大西洋中心 ≈ 西經 30°
- 兩者中點 = **西經 95°** → 那是**墨西哥／中美洲陸地**

**決議**：兩處各放一份（使用者選擇）。中心經度**由實際地理資料計算**，非目測。

取赤道帶（lat ±4°）上的無陸地缺口：

| 海洋 Ocean | 範圍 Range | 寬度 | 中點 Centre |
|---|---|---|---|
| 大西洋 Atlantic | `-38° .. +9°` | 47° | **-14°** |
| 太平洋 Pacific | `+153° .. +279°`（跨換日線）| 126° | **-144°** |

### 5.4 邊緣淡出 / Limb Fade

貼球面的文字轉到邊緣會被透視壓縮：

| θ | cos θ | 有效寬度 | 可讀性 |
|---|---|---|---|
| 0° | 1.000 | 100% | 佳 |
| 45° | 0.707 | 71% | 佳 |
| 60° | 0.500 | 50% | 勉強 |
| **70°** | **0.342** | **34%** | **不可讀** |
| 80° | 0.174 | 17% | 糊成一團 |

門檻 `EMBOSS_FADE_COS = 0.35`（約 69.5°），`fade = (facing − 0.35) / (1 − 0.35)`。

**可見時間**：每處每 **34.9 秒**一圈中可見 **13.5 秒（39%）**。兩處相隔 **130°**，輪流出現。

### 5.5 地標與時鐘 / Markers and Clock

```javascript
MARKER_PERIOD = 2.0    MARKER_DOT_R = 3.0    MARKER_RING_MAX = 16
MARKER_COLOUR = [255, 64, 64]
MARKER_SITES = [
  { name: 'TAIWAN',    lat: 25.03, lon: 121.57 },
  { name: 'SINGAPORE', lat:  1.35, lon: 103.82 },
];
CLOCK_TZ_OFFSET = 8
```

台北與新加坡經度僅差 **17.8°**，幾乎同時進出視野。

時鐘位置 `top: calc(50% + var(--bar-h)/2 + 250px)`。250px 的依據：必須避開呼吸**最小時**的軌道（211px），而非只避開地球（130px）。

### 5.6 IP 定位的隱私取捨 / Geolocation Privacy Trade-off

沙箱實測：

| 服務 Service | 結果 |
|---|---|
| `ipapi.co` | HTTP **429** 限流 |
| `ip-api.com` | HTTP **406** |
| `ipify.org` | 僅回 IP，**無經緯度** |

```javascript
const ENABLE_GEO_LOOKUP = false;   // 預設關閉
```

| 面向 | 關閉（預設）| 開啟 |
|---|---|---|
| 外部請求 | **無** | 每次載入 1 次 |
| 訪客 IP | 不外流 | **送往第三方** |
| 離線可用 | ✅ | ❌ |
| `file://` | ✅ | ❌ |

保護措施：3 秒 timeout（`AbortController`）、失敗靜默略過、端點為單一常數便於移除。

### 5.7 抓到的幾何錯誤 / The Geometry Bug

**我原先目測估大西洋為 `-35..+8`、中心設 `-30°`。**

改用實際地理資料推導後發現：真實範圍是 `-38..+9`，而 `-30°` 會讓文字左緣落到 **-44.8°**，壓到南美洲海岸（陸地區間 `-81..-38`）。

已修正為 **-14°**。

這是把「目測估計」換成「從資料推導」才抓到的 —— 若驗證腳本沿用我手打的邊界，這個錯誤會通過檢查。

---

## 6. 全部抓到的錯誤

| # | 階段 | 錯誤 Bug | 如何抓到 How it was caught |
|---|---|---|---|
| 1 | 1 | GIF 迴圈時間寫 2.67s，實為 **2.4s** | 驗證員以 PIL 讀回檔案的 duration 欄位 |
| 2 | 2 | **遮擋方向相反**（`z>=0` vs `z<=0`）| 推導 `fov = D/(D+z)` 的單調性 |
| 3 | 2 | **背面剔除用世界座標**而非相機座標 | 比對三個相機角度的可見陸地點數（848/1740/1408）|
| 4 | 3 | SPEC 的 `0.88` 漏寫「重新映射」前提 | 驗證員無法從敘述重現該數字 |
| 5 | 4 | **貼字座標壓到南美海岸**（-30° → 左緣 -44.8°）| 改用 geodata 推導海洋邊界 |
| 6 | 4 | verify.py 常數解析器不支援十六進位（`0x55`）| 執行時 `KeyError` |
| 7 | 4 | v1 遺留檢查 `--gap-below-earth` 已失效 | 執行時 `[FAIL]` |
| 8 | 4 | 文字寬度 `0.62` 係數未揭露為估算 | 驗證員指出非 `ctx.measureText()` 實測 |

**第 3 項最難發現**：靜態畫面完全正常，只有拖曳時才會顯露。是靠「同一數字在不同相機角度下必須改變」這個必要條件抓到的。

**第 8 項的後續**：加入敏感度分析後發現 `0.62` 是**保守高估**（真實等寬字型 0.55~0.60），臨界值 **0.966** —— 字寬要再大 **56%** 才會壓到海岸線。結論穩固，但已在 SPEC 標明為估算值。

---

## 7. 全部被推翻的規格

| # | 原始需求 Original | 問題 Problem | 決議 Resolution |
|---|---|---|---|
| 1 | 「4 electrons antipodal」| 對蹠只適用 2 顆 | 改每 π/2 均分 |
| 2 | `Nucleus 14px×fov` / `s=250` | 核心已換成地球 | 廢除 → `EARTH_RADIUS=130` |
| 3 | `80 frames` / `interval=30` / `fps=30` | matplotlib 與 GIF 專用 | 廢除 → 連續 rAF |
| 4 | 彩虹原色 ROYGBIV | 靛 1.56、藍 2.35、紫 3.07 皆不及 AA | 提亮版，全 ≥ 7.26 |
| 5 | 地球下方固定 200px | 手機破版 | `clamp(80px, 18vh, 200px)` |
| 6 | `PROEJCT` | 拼字顛倒 | 改 `PROJECT` |
| 7 | 站名「黑灰色」| `#333` 對比僅 1.60 | 在 `#555`↔`#999` 振盪 |
| 8 | 「底色 +50% 亮度」| 對比僅 1.16，幾乎不可見 | 拉到 +150%，對比 1.71 |
| 9 | 「太平洋與大西洋正中間」| 中點在墨西哥陸地 | 兩處各放一份 |
| 10 | 時間貼在地球上 | 23 字元佔地球 44~60% 寬 | 移到地球下方 |
| 11 | 「亂數顏色」| 全 RGB 亂數會抽到看不見的色 | 限定彩虹 7 色抽 2 |
| 12 | 部署地 IP 定位 | 三個 API 皆不可用，且站未部署 | 寫好但預設關閉 |

---

## 8. 參數演變總表

### 8.1 全程未變的參數 / Constants That Never Changed

從階段 1 到階段 4 完全未動：

```
ORBIT_RINGS = 6        TILT_DEG = 65          RING_ALPHA = 0.4
RING_SEGMENTS = 120    TRAIL_POINTS = 15      TRAIL_DTHETA = 0.04
LEAD_SCALE = 1.5       ORBIT_RADIUS = 240
```

### 8.2 各階段的變化 / Changes by Stage

| 參數 | 階段 1 | 階段 2 (v1) | 階段 3-4 (v3) |
|---|---|---|---|
| `POINTS_PER_RING` | 4 | **2** | **4** |
| 核心 Core | 紅色原子核 14px | 地球 130px | 地球 130px |
| `CAM_DISTANCE` | 600 | **900** | 900 |
| `POINT_SIZE` | — | 6 | 6 |
| `DIM_ALPHA` | — | 0.45 | 0.45 |
| `EARTH_SPIN` | — | 0.18 | 0.18 |
| 專案位置 | 無 | 地球下方 200px | **頂部導覽列** |
| 軌道半徑 | 240 固定 | 240 固定 | **211.2~288.0 呼吸** |

### 8.3 v3 新增的 28 個常數 / 28 Constants Added in v3

v1 的 24 個常數**全部保留未改**，v3 純新增：

```
呼吸 Breathing (5)：BREATH_AMPLITUDE BREATH_PERIOD MOUSE_BREATH_MAX
                    MOUSE_BREATH_RANGE MOUSE_DAMPING
站名 Wordmark (3)： PULSE_PERIOD PULSE_DARK PULSE_BRIGHT
透鏡 Lens (4)：     LENS_MAX_SCALE LENS_RADIUS LENS_LIFT LENS_DAMPING
貼字 Emboss (7)：   SURFACE_TEXT SURFACE_TEXT_SITES OCEAN_BASE EMBOSS_PERIOD
                    EMBOSS_MIN_MULT EMBOSS_MAX_MULT EMBOSS_FONT_PX EMBOSS_FADE_COS
地標 Markers (5)：  MARKER_PERIOD MARKER_DOT_R MARKER_RING_MAX MARKER_COLOUR
                    MARKER_SITES
定位 Geo (3)：      ENABLE_GEO_LOOKUP GEO_LOOKUP_URL GEO_LOOKUP_TIMEOUT
其他 Other (2)：    CLOCK_TZ_OFFSET SITE_NAME
```

### 8.4 檔案大小演變 / File Size Evolution

| 階段 Stage | 檔案 Files | 總計 Total |
|---|---|---|
| 0（原始）| 3 檔 + GIF | ~326 KB |
| 1 | `index.html` 8.9 KB + 2 × .py + GIF | ~1 MB（含 GIF）|
| 2 (v1) | html 3.5 + app 14.6 + geo 24.3 + verify 19.3 | **61.7 KB** |
| 4 (v3) | html 7.7 + app 35.7 + geo 24.3 + verify 31.3 | **99.0 KB** |

網站執行只需 `index.html` + `app.js` + `geodata.js` = **67.7 KB**。

---

## 9. 驗證方法論

### 9.1 驗證腳本的設計原則 / Design Principles

`verify.py` 從階段 2 開始存在，到階段 4 成長為 **85 項檢查**。

**原則 1：常數從原始碼解析，不重新輸入**

```python
for name, raw in re.findall(r'^const ([A-Z_]+)\s*=\s*([^;]+);', src, re.M):
```

若有人改了 `app.js` 的數值，檢查立即反映。腳本不會與被檢驗的實作悄悄脫節。

**原則 2：邊界從資料推導，不寫死**

海洋邊界直接從 `geodata.js` 解出赤道帶的無陸地缺口，而非我手打的估計值。這正是抓到 §5.7 錯誤的關鍵 —— 若沿用手打邊界，該錯誤會通過檢查。

**原則 3：比對原始碼的關鍵判斷式**

```python
check('occluded() early-out test', occ.group(1).strip(), 'p.z <= 0')
```

§6 的兩個號誤若被改回，檢查立刻失敗。

**原則 4：檢查結論對估算誤差的容忍度**

不只驗算 `0.62` 這個估算值下的結果，還二分搜尋出臨界值 `0.966`，證明結論容忍 56% 的誤差。

### 9.2 85 項檢查的分佈 / Distribution of the 85 Checks

| 節次 Section | 主題 Topic | 檢查數 |
|---|---|---|
| 1 | 光點數與遮擋隨相機變化 | 5 |
| 2 | 環平面角與光點間隔 | 3 |
| 3 | z 軸正負號約定 | 4 |
| 4 | 配色洗牌與對比 | 8 |
| 5 | 地理資料 | 9 |
| 6 | 版面與標籤 | 11 |
| 7 | 呼吸 | 6 |
| 8 | 站名亮滅與透鏡 | 8 |
| 9 | 貼地浮雕文字 | 13 |
| 10 | 地標紅點 | 9 |
| 11 | 時間列 | 9 |
| **合計** | | **85** |

### 9.3 始終未驗證的部分 / What Was Never Verified

這四項從頭到尾都無法在此環境驗證：

1. **JavaScript 未經引擎執行**
   `node --check` 因缺少 `cjs-module-lexer` 而中止，亦無 deno／bun／esprima。括號檢查僅為結構性，**不是**完整語法解析 —— 拼錯的變數名會通過。

2. **未擷取瀏覽器實際畫面**
   預覽圖為 Python 近似重繪，抗鋸齒、漸層、`globalAlpha` 疊加行為與 Canvas 不同。只能證明幾何與配色正確。

3. **CSS 效果完全未測**
   `backdrop-filter`、`color-mix()`、`clamp()`、逐字 DOM transform 皆未在瀏覽器驗證。

4. **IP 定位路徑從未執行**
   `ENABLE_GEO_LOOKUP = false`，第三個紅點的程式碼從未跑過。

此外：**無效能實測**。每幀約 5,968 個地表點 + 720 軌道線段 + 24 光點 + 360 拖尾點 + 18 貼字字元，加上獨立的導覽列 rAF 迴圈。無實機 FPS 量測。

---

## 10. 目錄結構 / Directory Layout

```
workspace/
├── test/                  階段 0：原始程式碼 + 分析 README
│   ├── index.html         785 行 Canvas 原子模擬器
│   ├── import numpy as np.py
│   ├── save_orbit_gif.py
│   ├── electron_orbit.gif
│   └── README.md
│
├── atom_orbit/            階段 1：抽離的獨立程式
│   ├── index.html         6 環 × 4 顆 = 24 光點
│   ├── orbit_viewer.py    matplotlib 互動版
│   ├── orbit_gif.py       import orbit_viewer，不複製幾何
│   ├── electron_orbit.gif 80 幀 700×700
│   └── README.md
│
├── night_earth/           階段 2：v1 夜間地球
│   ├── index.html         專案列在地球下方
│   ├── app.js             24 個常數
│   ├── geodata.js         5,968 點打包資料
│   ├── verify.py          36 項檢查
│   ├── preview_*.png      3 個相機角度
│   └── SPEC.md
│
└── night_earth_v2/        階段 3-4：v3 最終版
    ├── index.html         頂部導覽列 + 時間列
    ├── app.js             52 個常數
    ├── geodata.js         同 v1
    ├── verify.py          85 項檢查
    ├── preview_*.png
    ├── SPEC-v3.md         完整規格書
    ├── README.md          本文件
    └── PROMPT.md          重建規格
```

---

## 11. 授權 / Licence

地理資料來自 **Natural Earth**，公有領域，無需標示。
Geographic data from **Natural Earth** — public domain, no attribution required.

程式碼未宣告授權。
No licence declared for the code.
