# ST8925 LAB — 重建規格 / Rebuild Prompt

把本文件整份交給 AI，即可重建出功能相同的成品。所有參數、公式、陷阱、驗證方法皆已寫入。
Hand this entire document to an AI to rebuild a functionally identical result. Every parameter, formula, pitfall and verification step is included.

---

## 0. 任務摘要 / Task Summary

做一個單頁網站首頁：正中央是一顆自轉的夜間地球，五大洲以城市燈光點陣顯示輪廓；外圈六道傾斜軌道環繞著它，軌道會像呼吸一樣週期性脹縮並回應滑鼠；地球表面在太平洋與大西洋各浮現一組浮雕文字；台灣與新加坡有雷達紅點；頂部是導覽列；地球下方是雙時區時鐘。

Build a single-page homepage: a rotating night Earth at the centre with continents drawn as city-light point clouds; six tilted orbit rings around it that breathe in and out and respond to the mouse; embossed text surfacing over the mid-Pacific and mid-Atlantic; radar markers at Taiwan and Singapore; a top navigation bar; and a dual-timezone clock below the globe.

**技術限制 / Constraints**

| 項目 Item | 要求 Requirement |
|---|---|
| 渲染 Rendering | HTML5 Canvas 2D，**不得使用 Three.js／WebGL／任何 library** |
| 相依 Dependencies | **零外部相依**。無 CDN、無網路字型、無圖檔 |
| 離線 Offline | 必須能以 `file://` 直接開啟 |
| 參數 Parameters | 全部集中為檔案頂端的具名常數，**不得散落於程式各處** |
| 語言 Language | 註解中英雙語 |

**檔案結構 / File structure**

```
index.html      版面與樣式 / markup and styling
app.js          渲染引擎與全部常數 / render engine and all constants
geodata.js      地理點陣資料 / packed geographic data
verify.py       驗證腳本（可選但強烈建議）/ verification harness
```

---

## 1. 全部常數 / Complete Constant Block

原封不動放在 `app.js` 最上方。
Place verbatim at the top of `app.js`.

```javascript
// --- 場景 / Scene ----------------------------------------------
const ORBIT_RINGS        = 6;     // 軌道環數 / orbit planes
const POINTS_PER_RING    = 4;     // 每環光點 / points per ring -> 24 total
const ORBIT_RADIUS       = 240;   // 軌道靜止半徑 px / resting orbit radius
const EARTH_RADIUS       = 130;   // 地球半徑 px / earth radius
const EARTH_TILT_DEG     = 23.44; // 地球自轉軸傾角 (黃赤交角) / Earth axial tilt
const TILT_DEG           = 65;    // 軌道傾角 / orbit tilt
const RING_ALPHA         = 0.4;   // 軌道線透明度 / ring alpha
const RING_SEGMENTS      = 120;   // 軌道線段數 / ring polyline segments
const ORBIT_SPEED        = 1.5;   // 光點角速度 rad/s / point angular speed
const EARTH_SPIN         = 0.18;  // 地球自轉 rad/s / earth spin (35 s per turn)
const TRAIL_POINTS       = 15;    // 拖尾點數 / trail samples
const TRAIL_DTHETA       = 0.04;  // 拖尾間距 rad / trail spacing
const LEAD_SCALE         = 1.5;   // 主光點放大 +50% / lead point multiplier
const POINT_SIZE         = 6;     // 一般光點半徑 px / normal point radius
const DIM_ALPHA          = 0.45;  // 非主光點亮度 / non-lead alpha
const CAM_DISTANCE       = 900;   // 透視距離 / perspective divide distance
const CAM_RX0            = 0.35;  // 相機初始俯仰 / initial pitch
const CAM_RY0            = 0.0;   // 相機初始偏航 / initial yaw
const DRAG_SENS          = 0.006; // 拖曳靈敏度 rad/px / drag sensitivity
const OCCLUSION_MARGIN   = 0.985; // 遮擋判定邊界 / occlusion margin
const BACKFACE_ALPHA     = 0.0;   // 被遮擋光點透明度 / occluded alpha

// --- 呼吸 / Breathing ------------------------------------------
const BREATH_AMPLITUDE   = 0.12;  // 自主幅度 +/-12% / autonomous amplitude
const BREATH_PERIOD      = 8.0;   // 週期 秒 / period in seconds
const MOUSE_BREATH_MAX   = 0.08;  // 滑鼠最大疊加 +8% / max mouse boost
const MOUSE_BREATH_RANGE = 420;   // 滿額距離 px / distance for max boost
const MOUSE_DAMPING      = 0.06;  // 追隨阻尼 / follow damping, 0..1

// --- 站名亮滅 / Wordmark pulse ---------------------------------
const PULSE_PERIOD       = 5.0;   // 週期 秒 / period
const PULSE_DARK         = 0x55;  // 暗相 #555555 對比 2.70 / dark phase
const PULSE_BRIGHT       = 0x99;  // 亮相 #999999 對比 7.07 / bright phase

// --- 逐字透鏡 / Per-glyph lens ---------------------------------
const LENS_MAX_SCALE     = 1.55;  // 鏡心最大放大 / peak magnification
const LENS_RADIUS        = 110;   // 影響半徑 px / influence radius
const LENS_LIFT          = 9;     // 鏡心最大上移 px / peak lift
const LENS_DAMPING       = 0.18;  // 追隨阻尼 / follow damping

// --- 地球貼地浮雕文字 / Embossed surface text ------------------
const SURFACE_TEXT       = 'st8925lab';
const SURFACE_TEXT_SITES = [
    { name: 'pacific',  lon: -144, lat: 0 },   // 太平洋正中 / mid-Pacific
    { name: 'atlantic', lon:  -14, lat: 0 },   // 大西洋正中 / mid-Atlantic
];
const OCEAN_BASE         = [0x0b, 0x1a, 0x2e];  // 海洋底色 / ocean base
const EMBOSS_PERIOD      = 5.0;   // 週期 秒 / period
const EMBOSS_MIN_MULT    = 1.0;   // 最暗倍率（等於底色）/ trough multiplier
const EMBOSS_MAX_MULT    = 2.5;   // 最亮倍率 +150% / peak multiplier
const EMBOSS_FONT_PX     = 12;    // 字級 px / font size
const EMBOSS_FADE_COS    = 0.35;  // 淡出門檻 / limb fade threshold

// --- 地標紅點 / Location markers -------------------------------
const MARKER_PERIOD      = 2.0;   // 雷達環週期 秒 / radar ring period
const MARKER_DOT_R       = 3.0;   // 紅點半徑 px / dot radius
const MARKER_RING_MAX    = 16;    // 環最大半徑 px / max ring radius
const MARKER_COLOUR      = [255, 64, 64];
const MARKER_SITES = [
    { name: 'TAIWAN',    lat:  25.03, lon: 121.57 },
    { name: 'SINGAPORE', lat:   1.35, lon: 103.82 },
];

// --- 部署地 IP 定位 / Deploy-site geolocation ------------------
const ENABLE_GEO_LOOKUP  = false;   // 預設關閉 / OFF by default
const GEO_LOOKUP_URL     = 'https://get.geojs.io/v1/ip/geo.json';
const GEO_LOOKUP_TIMEOUT = 3000;    // ms

// --- 時間列 / Clock row ----------------------------------------
const CLOCK_TZ_OFFSET    = 8;     // 第二時區 GMT+8 / second timezone

// --- 提亮彩虹 / Brightened rainbow -----------------------------
// 每色對 #04070e 的對比 >= 7.26，全數達 WCAG AAA。
// 原始 ROYGBIV 有三色不及 AA：藍 2.35、靛 1.56、紫 3.07。
// Every hue scores >= 7.26 against #04070e (WCAG AAA). The original
// ROYGBIV fails AA on three hues: blue 2.35, indigo 1.56, violet 3.07.
const RAINBOW = [
    { name: 'red',    hex: '#ff6b6b', rgb: [255, 107, 107] },
    { name: 'orange', hex: '#ffa94d', rgb: [255, 169,  77] },
    { name: 'yellow', hex: '#ffe066', rgb: [255, 224, 102] },
    { name: 'green',  hex: '#69db7c', rgb: [105, 219, 124] },
    { name: 'blue',   hex: '#4dabf7', rgb: [ 77, 171, 247] },
    { name: 'indigo', hex: '#a78bfa', rgb: [167, 139, 250] },
    { name: 'violet', hex: '#f783ac', rgb: [247, 131, 172] },
];

const SITE_NAME = 'ST8925 LAB';
const PROJECT_LABELS = [
    'PROJECT 01', 'PROJECT 02', 'PROJECT 03',
    'PROJECT 04', 'PROJECT 05', 'PROJECT 06',
];

const TILT = TILT_DEG * Math.PI / 180;
const COS_TILT = Math.cos(TILT), SIN_TILT = Math.sin(TILT);
const EARTH_TILT = EARTH_TILT_DEG * Math.PI / 180;
const COS_EARTH_TILT = Math.cos(EARTH_TILT), SIN_EARTH_TILT = Math.sin(EARTH_TILT);
```

---

## 2. 核心數學 / Core Maths

### 2.1 軌道環幾何 / Orbit Ring Geometry

XY 平面上的圓，先繞 X 軸傾斜 `TILT`，再繞 Z 軸旋轉 `planeAngle`：
A circle in the XY plane, tilted about X by `TILT`, then spun about Z by `planeAngle`:

```javascript
function ringPoint(theta, cosP, sinP, R) {
    const x0 = R * Math.cos(theta), y0 = R * Math.sin(theta);
    return [
        x0 * cosP - (y0 * COS_TILT) * sinP,
        x0 * sinP + (y0 * COS_TILT) * cosP,
        y0 * SIN_TILT,
    ];
}
```

`planeAngle = k · π / ORBIT_RINGS` → 六環分佈於 **0°, 30°, 60°, 90°, 120°, 150°**。

**為何是半圈而非整圈**：旋轉 π 後的環與原環佔據同一平面，走滿 2π 會產生重複環。
**Why a half turn**: a ring rotated by π occupies the same plane, so a full turn duplicates rings.

每環 4 顆光點相隔 `2π / 4 = π/2`，另加每環 `planeAngle` 的相位偏移使各環不同步。
索引 0 為「主光點」。

### 2.2 投影與正負號約定 ⚠️ / Projection and the Sign Convention

```javascript
function project(x, y, z, cx, cy) {
    const cy_ = Math.cos(rotY), sy = Math.sin(rotY);
    const cx_ = Math.cos(rotX), sx = Math.sin(rotX);
    const x1 =  x * cy_ + z * sy;
    const z1 = -x * sy  + z * cy_;
    const y2 = y * cx_ - z1 * sx;
    const z2 = y * sx  + z1 * cx_;
    const fov = CAM_DISTANCE / (CAM_DISTANCE + z2 * sceneScale);
    return {
        px: cx + x1 * sceneScale * fov,
        py: cy + y2 * sceneScale * fov,
        scale: fov * sceneScale,
        z: z2,
    };
}
```

> **這是最容易寫錯的地方。**
> 因為 `fov = D / (D + z)`，**z 越大 → fov 越小 → 越遠**。
> 所以「地球後方」是 `z > 0`，「前方」是 `z < 0`。
>
> **This is the single easiest thing to get wrong.**
> Since `fov = D / (D + z)`, **larger z means smaller fov, i.e. further away**.
> Behind the globe is therefore `z > 0`; in front is `z < 0`.

驗算 / Check: `z = -500 → fov 2.250`（近）、`z = 0 → 1.000`、`z = +500 → 0.643`（遠）。

深度排序用 `drawList.sort((a, b) => b.z - a.z)` —— 先畫大 z（遠方），符合畫家演算法。

### 2.3 遮擋判定 / Occlusion

```javascript
function occluded(p, cx, cy, earthPx) {
    if (p.z <= 0) return false;          // 在前方，永不遮擋 / in front
    const dx = p.px - cx, dy = p.py - cy;
    return (dx * dx + dy * dy) < (earthPx * OCCLUSION_MARGIN) ** 2;
}
```

### 2.4 球面座標與背面剔除 ⚠️ / Sphere Coordinates and Backface Culling

```javascript
function geoToXYZ(lon, lat, R) {
    const l = lon + spinAngle;
    const cl = Math.cos(lat);
    const x0 = R * cl * Math.cos(l);
    const y0 = -R * Math.sin(lat);
    const z0 = R * cl * Math.sin(l);
    return [
        x0 * COS_EARTH_TILT - y0 * SIN_EARTH_TILT,
        x0 * SIN_EARTH_TILT + y0 * COS_EARTH_TILT,
        z0,
    ];
}

function surfacePoint(lon, lat, R, cx, cy) {
    const [x, y, z] = geoToXYZ(lon, lat, R);
    const p = project(x, y, z, cx, cy);
    if (p.z >= 0) return null;                  // 背面 / far hemisphere
    p.lit = 0.3 + 0.7 * Math.min(1, -p.z / R);  // 邊緣減光 / limb darkening
    return p;
}
```

> **第二個容易寫錯的地方。**
> 背面剔除必須在**投影之後**、以**相機座標** z 判斷。若用世界座標 z，拖曳相機時可見半球不會跟著改變 —— 這個錯誤在靜態畫面上完全看不出來。
>
> **The second easy mistake.** Cull **after** projecting, using **camera-space** z. World-space z leaves the visible hemisphere frozen when the camera is dragged — a bug that is invisible in any single static frame.

### 2.5 呼吸 / Breathing

```javascript
function breathFactor() {
    const phase = (breathClock / BREATH_PERIOD) * Math.PI * 2;
    return 1 + Math.sin(phase) * BREATH_AMPLITUDE + mouseBreath;
}
```

三個要點 / Three requirements：

**(a) 只作用於軌道，地球恆定**

```javascript
const breath  = breathFactor();
const orbitR  = ORBIT_RADIUS * breath;        // 軌道套用 / orbits scale
const earthPx = EARTH_RADIUS * sceneScale;    // 地球不套用 / earth does NOT
```

`ringPoint()` 的三處呼叫全部改用 `orbitR`，不可殘留 `ORBIT_RADIUS`。

**(b) 用 `sin()` 而非重新映射的 `(1-cos)/2`**

`sin(0) = 0` → 起始倍率恰為 **1.0000**，載入瞬間無跳動。
若改用 `(1−cos φ)/2` 並重新映射為 `1 + (2k−1)·A`，t=0 時為 **1 − 0.12 = 0.88**，畫面會先縮 12% 再擴張。

**(c) `resize()` 必須預留膨脹後的空間**

```javascript
const maxR = ORBIT_RADIUS * (1 + BREATH_AMPLITUDE + MOUSE_BREATH_MAX);
const need = (maxR + POINT_SIZE * LEAD_SCALE * 3) * 2;
sceneScale = Math.min(1, r.width / need, r.height / need);
```

若只用靜止半徑算，呼吸最大時會在小螢幕被裁切。

**(d) 幀率無關的滑鼠平滑**

```javascript
mouseBreath += (mouseBreathTarget - mouseBreath) *
               (1 - Math.pow(1 - MOUSE_DAMPING, delta * 60));
```

滑鼠目標值：距地球中心越遠 → 疊加越多。

```javascript
const dist = Math.hypot(e.clientX - centreX, e.clientY - centreY);
mouseBreathTarget = Math.min(1, dist / MOUSE_BREATH_RANGE) * MOUSE_BREATH_MAX;
```

指標離開舞台時 `mouseBreathTarget = 0`。

**實測範圍 / Resulting range**

| 狀態 | 半徑 |
|---|---|
| 最小 | **211.2 px** |
| 靜止 | **240.0 px** |
| 自主最大 | **268.8 px** |
| 加滑鼠 | **288.0 px** |
| 地球 | **130 px 恆定** |
| 最小淨空 | **81.2 px** |

### 2.6 逐字透鏡 / Per-glyph Lens

```
f = 0.5 + 0.5·cos(π · d / LENS_RADIUS)     // d < LENS_RADIUS，否則 f = 0
scale = 1 + (LENS_MAX_SCALE − 1) · f
lift  = −LENS_LIFT · f
```

**必須用升餘弦，不可用線性衰減。** 升餘弦兩端斜率皆為 0，透鏡邊界無折痕；線性衰減會在 `d = LENS_RADIUS` 處出現明顯摺角。原理同 macOS Dock。

| d (px) | f | scale | lift |
|---|---|---|---|
| 0 | 1.000 | 1.550 | −9.00 |
| 55 | 0.500 | 1.275 | −4.50 |
| 110 | 0.000 | 1.000 | 0.00 |

### 2.7 貼地浮雕文字 / Embossed Surface Text

每個字元**各有自己的經度**並獨立投影，字串因而沿球面彎曲。

```javascript
const totalPx  = ctx.measureText(SURFACE_TEXT).width;
const totalDeg = totalPx / (R * Math.PI / 180);
const stepDeg  = totalDeg / Math.max(1, chars.length - 1);
// 每字元經度 = (site.lon - totalDeg/2) + i * stepDeg
```

角步進由實測寬度換算，故不受瀏覽器字型差異影響。

**亮度調變 / Brightness**

```javascript
const k = 0.5 - 0.5 * Math.cos((embossClock / EMBOSS_PERIOD) * Math.PI * 2);
const mult = EMBOSS_MIN_MULT + (EMBOSS_MAX_MULT - EMBOSS_MIN_MULT) * k;
// 顏色 = OCEAN_BASE 各分量 × mult，上限 255
```

| t (s) | 倍率 | 顏色 | 對比底色 |
|---|---|---|---|
| 0.00 | ×1.00 | `#0b1a2e` | **1.00**（完全隱形）|
| 2.50 | ×2.50 | `#1c4173` | **1.71**（最亮）|
| 5.00 | ×1.00 | `#0b1a2e` | 1.00 |

**邊緣淡出 / Limb fade**

```javascript
const facing = Math.min(1, -p.z / R);
if (facing <= EMBOSS_FADE_COS) continue;
const fade = (facing - EMBOSS_FADE_COS) / (1 - EMBOSS_FADE_COS);
ctx.globalAlpha = fade;
ctx.scale(Math.max(0.15, facing), 1);   // 橫向壓縮 / foreshortening
```

超過 70° 時字寬已壓到 34% 以下，糊成一團，故淡出。每處每 34.9 秒一圈中可見 **13.5 秒（39%）**。

### 2.8 雷達紅點 / Radar Markers

```javascript
const phase  = (markerClock % MARKER_PERIOD) / MARKER_PERIOD;   // 0..1
const ringR  = MARKER_RING_MAX * phase * sceneScale;
const ringA  = (1 - phase) * 0.85 * facing;
```

環向外擴散同時淡出。**先畫環再畫實心點**，確保點永遠在上層。背面（`surfacePoint()` 回傳 null）完全不畫。

---

## 3. 地理資料 / Geographic Data

### 3.1 產生流程 / Generation Pipeline

若要自行重建 `geodata.js`：

```python
# 1. 取得 Natural Earth 110m 陸地多邊形（公有領域，127 個 Polygon）
url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'

# 2. 海岸線：沿多邊形邊界每 0.85 度重新取樣（經度以 cos(lat) 修正）
SPACING = 0.85          # -> 3,735 點

# 3. 陸地內部：等面積網格 + 點內測試（含 holes）
LAT_STEP = 2.2          # 緯度步進；經度步進 = LAT_STEP / max(cos(lat), 0.25)
lat 範圍 -58.0 .. 76.0  # -> 2,233 點
每點加上 ±35% 步進的隨機抖動，避免出現網格紋路

# 4. 打包：每點 4 個 base64 字元 = 23 bits
#    bits 22..11 : (lon + 180) * 10   [0..3600]
#    bits 10..0  : (lat + 90)  * 10   [0..1800]
```

| 指標 | 值 |
|---|---|
| 海岸線點 Coastline | **3,735** |
| 陸地點 Landmass | **2,233** |
| 合計 Total | **5,968** |
| 原始 JSON | 64.8 KB |
| 打包後 Packed | **23.3 KB**（縮減 64%）|
| 量化誤差 | ≤ **0.05°**（≈5.5 km）|
| R=130px 時 | **0.072 px**（遠低於一像素）|

### 3.2 解碼函式 / Decoder

```javascript
const GEO_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function unpackGeo(s) {
    const idx = {};
    for (let i = 0; i < 64; i++) idx[GEO_B64[i]] = i;
    const out = new Float32Array((s.length / 4) * 2);
    for (let i = 0, o = 0; i < s.length; i += 4, o += 2) {
        const v = (idx[s[i]] << 18) | (idx[s[i + 1]] << 12) |
                  (idx[s[i + 2]] << 6) | idx[s[i + 3]];
        out[o]     = ((v >>> 11) / 10 - 180) * Math.PI / 180;  // lon rad
        out[o + 1] = ((v & 2047)  / 10 -  90) * Math.PI / 180;  // lat rad
    }
    return out;
}
```

### 3.3 貼字位置的推導 ⚠️ / Deriving the Text Positions

**不可目測估計。** 必須從實際資料算出赤道帶（lat ±4°）上的無陸地缺口：

| 海洋 | 範圍 | 寬度 | 中點 |
|---|---|---|---|
| 大西洋 Atlantic | `-38° .. +9°` | 47° | **-14°** |
| 太平洋 Pacific | `+153° .. +279°`（跨換日線）| 126° | **-144°** |

> 目測估「大西洋中心 -30°」會讓 29.5° 寬的文字左緣落到 **-44.8°**，壓到南美洲海岸（陸地區間 `-81..-38`）。這是實際發生過的錯誤。
> Eyeballing the Atlantic centre at -30° pushes the left edge of the 29.5°-wide text to -44.8°, onto the South American coast. This bug actually occurred.

---

## 4. 地球渲染 / Earth Rendering

由後至前四層 / Four layers, back to front：

```javascript
// 1. 海洋圓盤 / ocean disc — 徑向漸層
const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
g.addColorStop(0,    '#0b1a2e');
g.addColorStop(0.75, '#0a1526');
g.addColorStop(1,    '#12233d');

// 2. 大氣光暈 / atmosphere halo — 半徑 1.35x
const halo = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 1.35);
halo.addColorStop(0,   'rgba(90,170,255,0.22)');
halo.addColorStop(0.4, 'rgba(70,140,230,0.09)');
halo.addColorStop(1,   'rgba(60,120,210,0)');

// 3. 陸地燈光 / city lights — rgba(255,196,92)，1.2x1.2 px，alpha = lit * 0.8
// 4. 海岸線 / coastline — rgba(150,230,255)，1.3x1.3 px，alpha = lit
```

海岸線刻意比內部燈光亮，確保「五大洲輪廓」清晰可辨。

背景 `#04070e`，另加 40px 間隔的環境格線與稀疏星點。

---

## 5. 版面 / Layout

### 5.1 頂部導覽列 / Top Bar

左站名 · 中專案 · 右按鈕。

```css
#topbar {
    position: fixed; top: 0; left: 0; right: 0;
    height: var(--bar-h);            /* 64px；<=720px 螢幕為 56px */
    z-index: 20;
    display: flex; align-items: center; justify-content: space-between;
    background: rgba(4, 7, 14, 0.55);
    backdrop-filter: blur(14px) saturate(120%);
    -webkit-backdrop-filter: blur(14px) saturate(120%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
```

毛玻璃是必要的：軌道呼吸最大達 288px，會通到導覽列後方。

### 5.2 站名 / Wordmark

逐字拆成 `<span class="glyph">`，空白也給獨立 span（讓透鏡連空隙一起變形，弧線才連續）。

```css
#wordmark .glyph {
    display: inline-block;
    transform-origin: 50% 100%;
    will-change: transform;
    /* 絕對不可設 transition —— 見 §7 陷阱 2 */
}
```

顏色由 JS 每幀寫入，CSS 不設 `color`。

### 5.3 專案項目 / Project Items

顏色透過 CSS 自訂屬性 `--c` 注入，邊框與背景以 `color-mix()` 由同一色導出：

```css
.project {
    --c: #ffffff;
    color: var(--c);
    border: 1px solid color-mix(in srgb, var(--c) 24%, transparent);
    background: color-mix(in srgb, var(--c) 5%, transparent);
}
.project:hover {
    transform: translateY(-2px);
    border-color: var(--c);
    background: color-mix(in srgb, var(--c) 13%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, var(--c) 38%, transparent);
}
```

### 5.4 時間列 / Clock Row

```css
#clock {
    position: fixed; left: 50%;
    top: calc(50% + var(--bar-h) / 2 + 350px);
    transform: translateX(-50%);
    display: flex; gap: .8rem; white-space: nowrap;
    z-index: 15; pointer-events: none;
}
```

**350px 的依據**：必須避開呼吸**最小時**的軌道（211px）以及動態城市下拉選單高度，而非只避開地球（130px）。

### 5.5 響應式 / Responsive

```css
@media (max-height: 880px) { #clock { top: auto; bottom: 45px; } }
@media (max-width: 560px)  { #clock { flex-direction: column; gap: .2rem; }
                             #clock .sep { display: none; } }
@media (max-width: 720px)  { :root { --bar-h: 56px; } #cta { display: none; } }
@media (prefers-reduced-motion: reduce) { .project, #cta { transition: none; } }
```

---

## 6. 行為 / Behaviour

### 6.1 配色規則 / Colour Rule

```javascript
function pickRingColours() {
    const pool = RAINBOW.slice();
    for (let i = pool.length - 1; i > 0; i--) {      // Fisher-Yates
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, ORBIT_RINGS);
}
const ringColours = pickRingColours();   // 模組載入時執行一次
```

- 每次載入重新洗牌，6 環顏色必不重複
- 每次恰有 **1 色未使用**（7 − 6 = 1）
- **專案字色與軌道必須讀取同一個 `ringColours` 陣列** —— 顏色連動是結構保證而非巧合

環內配色：主光點用該環彩虹色 + 白色核心（`alpha = 1.0`、`size = 9px`）；其餘 3 顆同色但 `alpha = 0.45`、`size = 6px`。

### 6.2 站名亮滅與透鏡 / Wordmark Pulse and Lens

```javascript
const t = (now / 1000) % PULSE_PERIOD;
const k = 0.5 - 0.5 * Math.cos((t / PULSE_PERIOD) * Math.PI * 2);
const v = Math.round(PULSE_DARK + (PULSE_BRIGHT - PULSE_DARK) * k);
wordmark.style.color = `rgb(${v},${v},${v})`;
```

**亮滅恆常執行 —— hover 只放大，不停止也不改色。**

| t (s) | 灰階 | 對比 |
|---|---|---|
| 0.00 | `#555555` | 2.70 |
| 2.50 | `#999999` | **7.07 (AAA)** |
| 5.00 | `#555555` | 2.70 |

導覽列使用**獨立的 rAF 迴圈**，避免 DOM 寫入與六千次 canvas 繪製交錯。

### 6.3 時鐘 / Clock

格式：`20260807-071500 (CST) · 20260807-151500 (GMT+8)`（47 字元）

```javascript
const pad = (n, w = 2) => String(n).padStart(w, '0');

function stamp(d) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}`
         + `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}
function localStamp(now) {
    return stamp(new Date(now.getTime() - now.getTimezoneOffset() * 60000));
}
function offsetStamp(now, hours) {
    return stamp(new Date(now.getTime() + hours * 3600000));
}
```

**兩段共用同一個 `stamp()`**，因此不可能出現補零不一致。

時區標籤優先用 `Intl.DateTimeFormat` 的 `timeZoneName: 'short'`，失敗才落到數字偏移。

> ⚠️ `getTimezoneOffset()` 回傳的是 **UTC 以西**的分鐘數，UTC+8 會回報 `-480`。備援計算時必須取負號。

顏色：`RAINBOW` 洗牌後取前 2 色（兩行必不同色），恆亮不閃爍，每次載入換色。每秒 `setInterval` 更新。

### 6.4 互動 / Interaction

| 動作 | 行為 |
|---|---|
| 拖曳舞台 Drag stage | 旋轉相機（`DRAG_SENS = 0.006 rad/px`）|
| 雙擊舞台 Double-click | 重置視角至 `CAM_RX0 / CAM_RY0` |
| 移動滑鼠 Mouse move | 疊加呼吸（越遠越大）|
| hover 站名 | 逐字透鏡放大 |

使用 **Pointer Events**（`pointerdown` / `pointermove` / `pointerup` / `pointercancel` / `pointerleave`）+ `setPointerCapture`，並在舞台設 `touch-action: none`，以支援觸控。

`rotX` 夾在 `±π/2` 避免視角翻轉。`delta` 上限 0.1 秒，避免切換分頁回來時光點瞬間跳一大段。

### 6.5 部署地定位 ⚠️ / Deploy-site Geolocation

```javascript
const ENABLE_GEO_LOOKUP = false;   // 預設關閉
```

| 面向 | 關閉（預設）| 開啟 |
|---|---|---|
| 外部請求 | **無** | 每次載入 1 次 |
| 訪客 IP | 不外流 | **送往第三方** |
| 離線可用 | ✅ | ❌ |
| `file://` | ✅ | ❌ |

開啟時的必要保護：`AbortController` 3 秒 timeout、失敗／逾時／格式錯誤皆**靜默略過**、端點為單一常數便於移除。

> 沙箱實測：`ipapi.co` 回 HTTP 429、`ip-api.com` 回 406、`ipify.org` 只回 IP 無經緯度。可用性不穩，務必寫好失敗路徑。

---

## 7. 五個必須避開的陷阱 / Five Pitfalls to Avoid

這五項都是實際發生過的錯誤。

| # | 陷阱 Pitfall | 正確作法 Correct approach |
|---|---|---|
| 1 | **遮擋方向寫反** | `fov = D/(D+z)` → 大 z 為遠 → 「後方」是 `z > 0`。`occluded()` 應為 `if (p.z <= 0) return false;` |
| 2 | **背面剔除用世界座標** | 必須用投影後的相機座標 z。此錯誤在靜態畫面上看不出來，只有拖曳時才顯露 |
| 3 | **`.glyph` 設了 CSS `transition`** | JS 每幀寫 transform，兩者疊加成雙重延遲。不可設 transition |
| 4 | **字元中心在透鏡開啟時量測** | 放大後的位置會回授到下一幀。必須在透鏡關閉時量測並快取，且字型載入後以 `document.fonts.ready` 重新量測 |
| 5 | **貼字經緯度用目測估計** | 必須從地理資料算出無陸地缺口。目測會壓到海岸線 |

另外三項較輕微但仍應注意：

- `resize()` 用 `ctx.setTransform(dpr,0,0,dpr,0,0)` 而非 `ctx.scale()`（冪等，可重複呼叫）
- FPS／滑鼠平滑須做幀率無關化，否則 60Hz 與 144Hz 手感不同
- 環與環交叉處採用單一平均 z 的畫家演算法，會整條疊前疊後。精確遮擋需分段切割或 WebGL —— 這是已知限制，非 bug

---

## 8. 驗證 / Verification

強烈建議寫一支 `verify.py`，遵守四個原則：

**原則 1：常數從原始碼解析，不重新輸入**

```python
for name, raw in re.findall(r'^const ([A-Z_]+)\s*=\s*([^;]+);', src, re.M):
    if raw.lower().startswith('0x'):
        out[name] = int(raw, 16)        # 支援 PULSE_DARK = 0x55
    else:
        out[name] = float(raw) if '.' in raw else int(raw)
```

若有人改了 `app.js` 的數值，檢查立即反映。

**原則 2：邊界從資料推導，不寫死**

海洋邊界直接從 `geodata.js` 解出赤道帶的無陸地缺口。若沿用手打的估計值，§7 陷阱 5 的錯誤會通過檢查。

**原則 3：比對原始碼的關鍵判斷式**

```python
check('occluded() early-out', occ.group(1).strip(), 'p.z <= 0')
check('surfacePoint() backface', surf.group(1).strip(), 'p.z >= 0')
check('surfacePoint culls on camera-space z',
      body.index('project(') < body.index('return null'), True)
```

§7 的陷阱 1、2 若被改回，檢查立刻失敗。

**原則 4：檢查結論對估算誤差的容忍度**

不只驗算單一估算值下的結果，還要二分搜尋出臨界值。例如文字寬度用 `0.62` 估算（真實等寬字型 0.55~0.60），臨界值為 **0.966** —— 字寬要再大 **56%** 才會壓到海岸線，故結論穩固。

### 8.1 應驗證的項目 / What to Verify

| 類別 | 檢查項目 |
|---|---|
| 幾何 | 光點總數恆為 24；主光點恆為 6；環平面角 0/30/60/90/120/150；間隔 π/2 |
| 遮擋 | 隱藏數與可見陸地點數**必須隨相機角度改變**（若不變即代表用了世界座標）|
| 正負號 | `fov` 對 z 單調遞減；原始碼判斷式為 `p.z <= 0` / `p.z >= 0` |
| 呼吸 | t=0 倍率恰為 1.0；軌道最小 211.2 > 地球 130；`resize()` 預留峰值；`earthPx` 不含 breath |
| 配色 | 20,000 次洗牌 0 重複；7 色對比全 ≥ 7.26；每次恰 1 色未用 |
| 透鏡 | 兩端斜率皆為 0；峰值 1.55 |
| 貼字 | 由 geodata 推導的缺口內；淡出門檻處恰為 0；最暗等於底色 |
| 地標 | 座標合法；`ENABLE_GEO_LOOKUP` 預設 false；有 timeout；失敗靜默 |
| 時鐘 | 格式 `YYYYMMDD-HHMMSS`；GMT+8 位移正確；兩段共用格式化函式 |
| 版面 | DOM 參照皆存在；無 http／CDN／`<img>` |

### 8.2 三個測試相機角度 / Three Test Camera Angles

| 代號 | rotX | rotY | spin | orbitAngle | 隱藏光點 | 可見陸地 |
|---|---|---|---|---|---|---|
| `A_front` | 0.35 | 0.0 | 0.6 | 0.9 | 4 | **848** |
| `B_drag` | 0.35 | 2.4 | 0.6 | 0.9 | 2 | **1740** |
| `C_top` | 1.20 | 0.8 | 2.2 | 2.0 | 1 | **1408** |

**三個「可見陸地」數字必須互異。** 若相同，代表背面剔除用了世界座標（§7 陷阱 2）。

---

## 9. 驗收標準 / Acceptance Criteria

- [ ] 地球自轉，五大洲輪廓（北美、南美、非洲、歐亞、大洋洲、南極）清晰可辨
- [ ] 6 環 × 4 顆 = 24 顆光點，每環 1 顆主光點大 50% 且有白色核心
- [ ] 6 個主光點顏色互異，每次重新載入換色
- [ ] 軌道週期性脹縮（211.2 ↔ 268.8px），**地球大小完全不變**
- [ ] 滑鼠遠離中心時軌道額外擴張，最大 288px
- [ ] 光點與軌道轉到地球後方時被遮擋
- [ ] 拖曳可旋轉視角，**可見半球隨之改變**
- [ ] 頂部導覽列毛玻璃，6 個 PROJECT 字色對應各環主光點
- [ ] 站名 5 秒亮滅循環，hover 時逐字圓弧放大且**亮滅不中斷、顏色不變**
- [ ] `st8925lab` 在太平洋與大西洋輪流浮現，5 秒亮滅，最暗時完全隱形
- [ ] 台灣與新加坡有紅點與擴散雷達環，轉到背面完全隱藏
- [ ] 地球下方單行顯示本地與 GMT+8 時間，每秒更新，兩色互異
- [ ] 以 `file://` 開啟可正常運作（`ENABLE_GEO_LOOKUP = false` 時）

---

## 10. 已知限制 / Known Limitations

誠實列出，不要試圖掩蓋：

1. **環與環交叉處的遮擋不精確** —— 單一平均 z 的畫家演算法，交叉時整條疊前疊後。精確需分段切割或 WebGL。
2. **貼地文字每處只有 39% 的時間可見** —— 這是自轉 + 邊緣淡出的必然結果，非 bug。
3. **`st8925lab` 對比僅 1.71** —— 刻意設計為若隱若現的浮雕。原規格要求的 +50% 對比僅 1.16，幾乎完全不可見，故放大到 +150%。
4. **站名暗相對比 2.70 低於 WCAG AA** —— 「黑灰色」與深色背景本質衝突。因為是裝飾性標題而非正文，可接受；亮相 7.07 達 AAA。
5. **IP 定位不可靠** —— 免費 API 有配額與限流，務必寫好靜默失敗路徑。

---

## 11. 授權 / Licence

地理資料來自 **Natural Earth**，公有領域，無需標示。
Geographic data from **Natural Earth** — public domain, no attribution required.
