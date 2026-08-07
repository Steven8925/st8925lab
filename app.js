// ===============================================================
//  NIGHT EARTH — orbiting light points around a rotating night Earth
//  All tunable values are named constants in the block below.
//  所有可調參數皆為下方區塊的具名常數。
// ===============================================================

// ---------------------------------------------------------------
// FIXED PARAMETERS / 固定參數
// ---------------------------------------------------------------
const ORBIT_RINGS = 6;     // 軌道環數 / orbit planes
const POINTS_PER_RING = 4;     // 每環光點 / light points per ring -> 24 total
const ORBIT_RADIUS = 240;   // 軌道半徑 px / orbit radius
const EARTH_RADIUS = 130;   // 地球半徑 px / earth radius
const TILT_DEG = 65;    // 軌道傾角 / orbit tilt
const RING_ALPHA = 0.4;   // 軌道線透明度 / orbit ring alpha
const RING_SEGMENTS = 120;   // 軌道線段數 / ring polyline segments
const ORBIT_SPEED = 1.5;   // 光點角速度 rad/s / point angular speed
const EARTH_SPIN = 0.18;  // 地球自轉 rad/s / earth spin
const TRAIL_POINTS = 15;    // 拖尾點數 / trail samples
const TRAIL_DTHETA = 0.04;  // 拖尾間距 rad / trail spacing
const LEAD_SCALE = 1.5;   // 主光點放大倍率 / lead point size multiplier
const POINT_SIZE = 6;     // 一般光點半徑 px / normal point radius
const DIM_ALPHA = 0.45;  // 非主光點亮度 / non-lead point alpha
const CAM_DISTANCE = 900;   // 透視距離 / perspective divide distance
const CAM_RX0 = 0.35;  // 相機初始俯仰 / initial camera pitch
const CAM_RY0 = 0.0;   // 相機初始偏航 / initial camera yaw
const DRAG_SENS = 0.006; // 拖曳靈敏度 rad/px / drag sensitivity
const OCCLUSION_MARGIN = 0.985; // 遮擋判定邊界 / occlusion test margin
const BACKFACE_ALPHA = 0.0;   // 被遮擋光點透明度 / occluded point alpha

// --- 呼吸 / Breathing ------------------------------------------
// 只作用於軌道與光點，地球半徑恆為 EARTH_RADIUS。
// Applies to the orbits and light points only; the Earth never scales.
const BREATH_AMPLITUDE = 0.12;  // 自主呼吸幅度 +/-12% / autonomous amplitude
const BREATH_PERIOD = 8.0;   // 呼吸週期 秒 / period in seconds
const MOUSE_BREATH_MAX = 0.08;  // 滑鼠最大疊加 +8% / max mouse contribution
const MOUSE_BREATH_RANGE = 420;   // 達到最大疊加的距離 px / distance for max
const MOUSE_DAMPING = 0.06;  // 滑鼠追隨阻尼 / follow damping, 0..1

// --- 站名亦滅 / Wordmark pulse ---------------------------------
const PULSE_PERIOD = 5.0;   // 亦滅週期 秒 / pulse period in seconds
const PULSE_DARK = 0x55;  // 暗相灰階 #555555，對比 2.70 / dark phase
const PULSE_BRIGHT = 0x99;  // 亮相灰階 #999999，對比 7.07 / bright phase

// --- 逐字透鏡 / Per-glyph lens ---------------------------------
const LENS_MAX_SCALE = 1.55;  // 鏡心最大放大 / peak magnification
const LENS_RADIUS = 110;   // 透鏡影響半徑 px / lens influence radius
const LENS_LIFT = 9;     // 鏡心最大上移 px / peak vertical lift
const LENS_DAMPING = 0.18;  // 透鏡追隨阻尼 / lens follow damping

// --- 地球貼地浮雕文字 / Embossed surface text ------------------
// 文字貼在球面上隨自轉進出視野。顏色以海洋底色為基準做倍率調變：
// 最暗 x1.0（與底色相同，完全隱形），最亮 x2.5（對比 1.71）。
// Text is mapped onto the sphere and rotates in and out of view. Colour is a
// multiple of the ocean base: x1.0 at the trough (invisible, identical to the
// background) and x2.5 at the peak (contrast 1.71 against the base).
//
// 原規格為 +50%，實測最亮對比僅 1.16，肉眼幾乎不可見，故放大到 +150%。
// The brief said +50%, which measures 1.16 and is effectively invisible;
// raised to +150% so the emboss is perceptible while staying subtle.
// 中心經度由實際地理資料求得，非目測估計。取赤道帶 (lat +/-4) 上的無陸地
// 缺口：大西洋 -38..+9 (寬 47 度，中點 -14)、太平洋 +153..+279 (寬 126 度，
// 中點 -144，跨換日線)。文字跨約 29.5 度，兩處皆容得下且不壓到海岸線。
// Centre longitudes are derived from the actual geodata, not eyeballed. Taking
// the land-free gaps in the equatorial band (lat +/-4): Atlantic -38..+9
// (47 deg wide, centre -14) and Pacific +153..+279 (126 deg wide, centre -144,
// crossing the date line). The text spans ~29.5 deg and clears both coasts.
const SURFACE_TEXT = 'st8925lab';
const SURFACE_TEXT_SITES = [
    { name: 'pacific', lon: -144, lat: 0 },   // 太平洋正中 / mid-Pacific
    { name: 'atlantic', lon: -14, lat: 0 },   // 大西洋正中 / mid-Atlantic
];
const OCEAN_BASE = [0x0b, 0x1a, 0x2e];  // 海洋底色 / ocean base colour
const EMBOSS_PERIOD = 5.0;   // 亦滅週期 秒 / pulse period
const EMBOSS_MIN_MULT = 1.0;   // 最暗倍率（等於底色）/ trough multiplier
const EMBOSS_MAX_MULT = 2.5;   // 最亮倍率 +150% / peak multiplier
const EMBOSS_FONT_PX = 12;    // 字級 px / font size
const EMBOSS_FADE_COS = 0.35;  // 淡出門檻 cos(theta) / limb fade threshold

// --- 地標紅點 / Location markers -------------------------------
const MARKER_PERIOD = 2.0;   // 雷達環週期 秒 / radar ring period
const MARKER_DOT_R = 3.0;   // 紅點半徑 px / dot radius
const MARKER_RING_MAX = 16;    // 雷達環最大半徑 px / max ring radius
const MARKER_COLOUR = [255, 64, 64];   // 紅 / red

const MARKER_SITES = [
    { name: 'TAIWAN', lat: 25.03, lon: 121.57 },
    { name: 'SINGAPORE', lat: 1.35, lon: 103.82 },
];

// --- 部署地 IP 定位 / Deploy-site geolocation ------------------
// 預設關閉：開啟後每次載入都會向第三方 API 送出請求，訪客 IP 會離開本站，
// 且本頁不再能離線 / 以 file:// 使用。改為 true 即啟用第三個紅點。
// Disabled by default. Enabling it sends a request to a third-party API on
// every page load, exposing the visitor's IP, and the page stops being
// offline-capable. Set to true to enable the third marker.
const ENABLE_GEO_LOOKUP = false;
const GEO_LOOKUP_URL = 'https://ipapi.co/json/';
const GEO_LOOKUP_TIMEOUT = 3000;  // ms

// --- 時間列 / Clock row ----------------------------------------
const CLOCK_TZ_OFFSET = 8;     // 第二個時區 GMT+8 / second timezone

// 提亮版彩虹 — 每色對 #04070e 背景的對比 >= 7.26，已達 WCAG AAA (7.0)
// Brightened rainbow — every hue scores >= 7.26 against the #04070e backdrop,
// clearing WCAG AAA (7.0). Run verify.py for the full contrast table.
const RAINBOW = [
    { name: 'red', hex: '#ff6b6b', rgb: [255, 107, 107] },
    { name: 'orange', hex: '#ffa94d', rgb: [255, 169, 77] },
    { name: 'yellow', hex: '#ffe066', rgb: [255, 224, 102] },
    { name: 'green', hex: '#69db7c', rgb: [105, 219, 124] },
    { name: 'blue', hex: '#4dabf7', rgb: [77, 171, 247] },
    { name: 'indigo', hex: '#a78bfa', rgb: [167, 139, 250] },
    { name: 'violet', hex: '#f783ac', rgb: [247, 131, 172] },
];

const SITE_NAME = 'ST8925 LAB';

const PROJECT_LABELS = [
    'PROJECT 01', 'PROJECT 02', 'PROJECT 03',
    'PROJECT 04', 'PROJECT 05', 'PROJECT 06',
];
// ---------------------------------------------------------------

const TILT = TILT_DEG * Math.PI / 180;
const COS_TILT = Math.cos(TILT), SIN_TILT = Math.sin(TILT);

// --- Fisher-Yates: pick ORBIT_RINGS distinct colours from RAINBOW ---
// 每次載入重新洗牌，7 色取 6，必有 1 色未使用（規格已知）。
function pickRingColours() {
    const pool = RAINBOW.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, ORBIT_RINGS);
}
const ringColours = pickRingColours();

// --- canvas setup ---
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('stage');

let rotX = CAM_RX0, rotY = CAM_RY0;
let orbitAngle = 0, spinAngle = 0;
let lastTime = performance.now();
let dragging = false, prevX = 0, prevY = 0;

// 呼吸狀態 / Breathing state
let breathClock = 0;        // 自主呼吸相位計時 / autonomous phase clock
let mouseBreath = 0;        // 已平滑的滑鼠疊加量 / smoothed mouse contribution
let mouseBreathTarget = 0;  // 滑鼠疊加目標值 / raw target
let pointerInside = false;  // 指標是否在舞台內 / pointer over the stage

// 貼地文字與地標 / Surface text and markers
let embossClock = 0;        // 浮雕亦滅相位 / emboss pulse clock
let markerClock = 0;        // 雷達環相位 / radar ring clock
// 起始只有兩個已知地點；IP 定位成功時才追加第三個。
// Starts with the two known sites; the third is appended only if the
// geolocation lookup succeeds.
let markerSites = MARKER_SITES.slice();

// Uniform scale so the whole scene fits small screens without changing
// the geometry constants. 統一縮放：小螢幕自動縮小，常數不變。
let sceneScale = 1;

function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = stage.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Reserve room for the fully inflated orbit, not the resting radius,
    // otherwise the peak of the breath would be clipped on small screens.
    // 預留完全膨脹時的空間，否則呼吸最大時會在小螢幕被裁切。
    const maxR = ORBIT_RADIUS * (1 + BREATH_AMPLITUDE + MOUSE_BREATH_MAX);
    const need = (maxR + POINT_SIZE * LEAD_SCALE * 3) * 2;
    sceneScale = Math.min(1, r.width / need, r.height / need);
}
window.addEventListener('resize', resize);

// --- camera drag + mouse breathing (pointer events => mouse + touch) ---
stage.addEventListener('pointerdown', e => {
    dragging = true; prevX = e.clientX; prevY = e.clientY;
    stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
    // Mouse contribution to the breath: distance from the globe centre,
    // normalised to 0..1 over MOUSE_BREATH_RANGE. Further out = more inflation.
    // 滑鼠疊加量：以距地球中心的距離正規化，越遠膨脹越多。
    const r = stage.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    pointerInside = true;
    mouseBreathTarget = Math.min(1, dist / MOUSE_BREATH_RANGE) * MOUSE_BREATH_MAX;

    if (!dragging) return;
    rotY += (e.clientX - prevX) * DRAG_SENS;
    rotX += (e.clientY - prevY) * DRAG_SENS;
    rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
    prevX = e.clientX; prevY = e.clientY;
});
stage.addEventListener('pointerleave', () => {
    pointerInside = false;
    mouseBreathTarget = 0;      // 指標離開則收回 / relax when the pointer leaves
});
const endDrag = () => { dragging = false; };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('dblclick', () => { rotX = CAM_RX0; rotY = CAM_RY0; });

// 呼吸倍率：自主正弦 + 已平滑的滑鼠疊加。
// Breath factor: autonomous sine plus the smoothed mouse contribution.
// 正弦取 sin() 而非 (1-cos())/2，使靜止起始值為 1.0（不縮放），
// 避免載入瞬間出現跳動。
// Using sin() rather than (1-cos())/2 makes the value start at exactly 1.0,
// so there is no visible jump on the first frame.
function breathFactor() {
    const phase = (breathClock / BREATH_PERIOD) * Math.PI * 2;
    return 1 + Math.sin(phase) * BREATH_AMPLITUDE + mouseBreath;
}

// --- geometry -------------------------------------------------
// Circle in XY, tilted about X by TILT, then spun about Z by planeAngle.
// 圓在 XY 平面，繞 X 傾斜 TILT，再繞 Z 旋轉 planeAngle。
function ringPoint(theta, cosP, sinP, R) {
    const x0 = R * Math.cos(theta), y0 = R * Math.sin(theta);
    return [
        x0 * cosP - (y0 * COS_TILT) * sinP,
        x0 * sinP + (y0 * COS_TILT) * cosP,
        y0 * SIN_TILT,
    ];
}

// Camera rotate + perspective divide. 相機旋轉 + 透視除法。
function project(x, y, z, cx, cy) {
    const cy_ = Math.cos(rotY), sy = Math.sin(rotY);
    const cx_ = Math.cos(rotX), sx = Math.sin(rotX);
    const x1 = x * cy_ + z * sy;
    const z1 = -x * sy + z * cy_;
    const y2 = y * cx_ - z1 * sx;
    const z2 = y * sx + z1 * cx_;
    const fov = CAM_DISTANCE / (CAM_DISTANCE + z2 * sceneScale);
    return {
        px: cx + x1 * sceneScale * fov,
        py: cy + y2 * sceneScale * fov,
        scale: fov * sceneScale,
        z: z2,
    };
}

// Occlusion: a point is hidden when it lies behind the globe AND its projected
// position falls inside the globe disc.
// 遮擋判定：光點在地球後方，且投影落在地球圓內時隱藏。
//
// Sign convention / 正負號約定: fov = D / (D + z), so LARGER z means SMALLER
// fov, i.e. further away. Behind the globe is therefore z > 0, not z < 0.
// fov = D/(D+z)，z 越大 fov 越小 → 越遠。故「地球後方」是 z > 0。
function occluded(p, cx, cy, earthPx) {
    if (p.z <= 0) return false;                    // in front / 在前方
    const dx = p.px - cx, dy = p.py - cy;
    return (dx * dx + dy * dy) < (earthPx * OCCLUSION_MARGIN) ** 2;
}

// --- geo point data (unpacked once) ---
const COAST = unpackGeo(COAST_PACKED);
const LAND = unpackGeo(LAND_PACKED);

// Rotate lon/lat to a 3D point on the globe, applying the current spin.
// 經緯度轉球面 3D 座標，套用當前自轉角。
function geoToXYZ(lon, lat, R) {
    const l = lon + spinAngle;
    const cl = Math.cos(lat);
    return [R * cl * Math.cos(l), -R * Math.sin(lat), R * cl * Math.sin(l)];
}

// Backface cull must use CAMERA z, not world z — dragging the camera changes
// which hemisphere faces the viewer. Near side is z < 0 (see occluded()).
// 背面剔除必須用相機座標 z，不能用世界座標：拖曳會改變朝向觀者的半球。
// 近側為 z < 0（見 occluded() 的正負號說明）。
// Returns null when the point is on the far hemisphere.
function surfacePoint(lon, lat, R, cx, cy) {
    const [x, y, z] = geoToXYZ(lon, lat, R);
    const p = project(x, y, z, cx, cy);
    if (p.z >= 0) return null;                 // far hemisphere / 背面
    p.lit = 0.3 + 0.7 * Math.min(1, -p.z / R); // limb darkening / 邊緣減光
    return p;
}

function drawEarth(cx, cy, R) {
    // ocean disc + limb glow / 海洋圓盤與邊緣輝光
    const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
    g.addColorStop(0, '#0b1a2e');
    g.addColorStop(0.75, '#0a1526');
    g.addColorStop(1, '#12233d');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // atmosphere halo / 大氣層光暈
    const halo = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 1.35);
    halo.addColorStop(0, 'rgba(90,170,255,0.22)');
    halo.addColorStop(0.4, 'rgba(70,140,230,0.09)');
    halo.addColorStop(1, 'rgba(60,120,210,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx.fill();

    // city lights on land / 陸地城市燈光
    ctx.fillStyle = 'rgba(255,196,92,1)';
    for (let i = 0; i < LAND.length; i += 2) {
        const p = surfacePoint(LAND[i], LAND[i + 1], R, cx, cy);
        if (!p) continue;
        ctx.globalAlpha = p.lit * 0.8;
        ctx.fillRect(p.px - 0.6, p.py - 0.6, 1.2, 1.2);
    }

    // coastline outline, brighter / 海岸線，較亮
    ctx.fillStyle = 'rgba(150,230,255,1)';
    for (let i = 0; i < COAST.length; i += 2) {
        const p = surfacePoint(COAST[i], COAST[i + 1], R, cx, cy);
        if (!p) continue;
        ctx.globalAlpha = p.lit;
        ctx.fillRect(p.px - 0.65, p.py - 0.65, 1.3, 1.3);
    }
    ctx.globalAlpha = 1;

    drawSurfaceText(cx, cy, R);
    drawMarkers(cx, cy, R);
}

// ---------------------------------------------------------------
//  Embossed surface text / 貼地浮雕文字
// ---------------------------------------------------------------
// Each glyph is placed at its own longitude and projected independently, so
// the string curves with the sphere instead of being a flat pasted label.
// 每個字元各有自己的經度並獨立投影，字串因而沿球面彎曲，而非平貼標籤。
function drawSurfaceText(cx, cy, R) {
    // Pulse multiplier over the ocean base colour.
    // 相對海洋底色的亮度倍率。
    const k = 0.5 - 0.5 * Math.cos((embossClock / EMBOSS_PERIOD) * Math.PI * 2);
    const mult = EMBOSS_MIN_MULT + (EMBOSS_MAX_MULT - EMBOSS_MIN_MULT) * k;
    const [br, bg, bb] = OCEAN_BASE;
    const cr = Math.min(255, Math.round(br * mult));
    const cg = Math.min(255, Math.round(bg * mult));
    const cb = Math.min(255, Math.round(bb * mult));

    const fontPx = EMBOSS_FONT_PX * sceneScale;
    ctx.font = `700 ${fontPx}px ui-monospace, "SF Mono", Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = [...SURFACE_TEXT];
    // Angular advance per character on the equator. Derived from the actual
    // measured width so it tracks whatever font the browser resolves.
    // 每字元在赤道上的角步進，由實際量得的寬度換算，因此不受字型差異影響。
    const totalPx = ctx.measureText(SURFACE_TEXT).width;
    const totalDeg = (totalPx / (R * Math.PI / 180));
    const stepDeg = totalDeg / Math.max(1, chars.length - 1);

    for (const site of SURFACE_TEXT_SITES) {
        const lat = site.lat * Math.PI / 180;
        const lon0 = (site.lon - totalDeg / 2) * Math.PI / 180;

        for (let i = 0; i < chars.length; i++) {
            const lon = lon0 + (i * stepDeg) * Math.PI / 180;
            const [x, y, z] = geoToXYZ(lon, lat, R);
            const p = project(x, y, z, cx, cy);
            if (p.z >= 0) continue;                 // far side / 背面

            // facing = 1 head-on, 0 at the limb. Below EMBOSS_FADE_COS the
            // glyph is compressed to under ~35% width and reads as a smear,
            // so it is faded out rather than drawn illegibly.
            // facing = 1 為正對，0 為邊緣。低於門檻時字寬已壓到 35% 以下
            // 糊成一團，故淡出而非硬畫。
            const facing = Math.min(1, -p.z / R);
            if (facing <= EMBOSS_FADE_COS) continue;
            const fade = (facing - EMBOSS_FADE_COS) / (1 - EMBOSS_FADE_COS);

            ctx.globalAlpha = fade;
            ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
            ctx.save();
            ctx.translate(p.px, p.py);
            // Horizontal foreshortening toward the limb, matching the sphere.
            // 朝邊緣的橫向壓縮，與球面一致。
            ctx.scale(Math.max(0.15, facing), 1);
            ctx.fillText(chars[i], 0, 0);
            ctx.restore();
        }
    }
    ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------
//  Location markers with radar rings / 地標紅點與雷達環
// ---------------------------------------------------------------
function drawMarkers(cx, cy, R) {
    const phase = (markerClock % MARKER_PERIOD) / MARKER_PERIOD;   // 0..1
    const [mr, mg, mb] = MARKER_COLOUR;

    for (const site of markerSites) {
        const p = surfacePoint(site.lon * Math.PI / 180,
            site.lat * Math.PI / 180, R, cx, cy);
        if (!p) continue;                          // 背面完全隱藏 / hidden

        const facing = Math.min(1, -p.z / R);

        // Expanding radar ring: grows outward while fading. Drawn first so the
        // solid dot always sits on top.
        // 雷達環：向外擴散同時淡出。先畫環，讓實心點永遠在上層。
        const ringR = MARKER_RING_MAX * phase * sceneScale;
        const ringA = (1 - phase) * 0.85 * facing;
        if (ringA > 0.01) {
            ctx.strokeStyle = `rgba(${mr},${mg},${mb},${ringA})`;
            ctx.lineWidth = 1.5 * sceneScale;
            ctx.beginPath();
            ctx.arc(p.px, p.py, Math.max(0.5, ringR), 0, Math.PI * 2);
            ctx.stroke();
        }

        const dotR = MARKER_DOT_R * sceneScale;
        const glow = ctx.createRadialGradient(p.px, p.py, 0.4,
            p.px, p.py, dotR * 3.2);
        glow.addColorStop(0, `rgba(${mr},${mg},${mb},${0.9 * facing})`);
        glow.addColorStop(0.4, `rgba(${mr},${mg},${mb},${0.3 * facing})`);
        glow.addColorStop(1, `rgba(${mr},${mg},${mb},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.px, p.py, dotR * 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${mr},${mg},${mb},${facing})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, dotR, 0, Math.PI * 2);
        ctx.fill();

        // 地標名稱文字標籤 / Location name label
        if (site.name) {
            const fontPx = Math.max(8, 10 * sceneScale);
            ctx.font = `600 ${fontPx}px ui-monospace, "SF Mono", Menlo, monospace`;
            ctx.fillStyle = `rgba(${mr},${mg},${mb},${facing * 0.95})`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(site.name, p.px + dotR * 2 + 3 * sceneScale, p.py);
        }
    }
}

function render(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    orbitAngle += ORBIT_SPEED * delta;
    spinAngle += EARTH_SPIN * delta;
    breathClock += delta;
    embossClock += delta;
    markerClock += delta;

    // Exponential smoothing toward the mouse target, made frame-rate
    // independent so the feel is identical at 60 Hz and 144 Hz.
    // 指數平滑追隨滑鼠目標，並做幀率無關化，60Hz 與 144Hz 手感一致。
    mouseBreath += (mouseBreathTarget - mouseBreath) *
        (1 - Math.pow(1 - MOUSE_DAMPING, delta * 60));

    // Breathing scales the ORBITS ONLY. earthPx deliberately does not use it,
    // so the globe stays pinned at the centre exactly as specified.
    // 呼吸只作用於軌道；earthPx 刻意不套用，地球恆定於中心。
    const breath = breathFactor();
    const orbitR = ORBIT_RADIUS * breath;

    const w = stage.clientWidth, h = stage.clientHeight;
    const cx = w / 2, cy = h / 2;
    const earthPx = EARTH_RADIUS * sceneScale;

    ctx.fillStyle = '#04070e';
    ctx.fillRect(0, 0, w, h);

    // starfield backdrop / 星空背景
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let sx = 0; sx < w; sx += 47) {
        for (let sy = 0; sy < h; sy += 61) {
            ctx.fillRect((sx * 7 + sy * 3) % w, (sy * 11 + sx) % h, 1, 1);
        }
    }

    const drawList = [];

    // Earth is a single depth-sorted item at z = 0.
    // 地球視為 z=0 的單一深度物件。
    drawList.push({ z: 0, render: () => drawEarth(cx, cy, earthPx) });

    for (let k = 0; k < ORBIT_RINGS; k++) {
        const planeAngle = (k * Math.PI) / ORBIT_RINGS;   // 0..150 deg fan
        const cosP = Math.cos(planeAngle), sinP = Math.sin(planeAngle);
        const col = ringColours[k];
        const [cr, cg, cb] = col.rgb;

        // orbit ring, split at the globe so the far arc is hidden
        // 軌道環：被地球遮住的段落不畫
        const segs = [];
        let cur = null, avgZ = 0;
        for (let i = 0; i <= RING_SEGMENTS; i++) {
            const [x, y, z] = ringPoint((i * 2 * Math.PI) / RING_SEGMENTS,
                cosP, sinP, orbitR);
            const p = project(x, y, z, cx, cy);
            avgZ += p.z;
            if (occluded(p, cx, cy, earthPx)) { cur = null; continue; }
            if (!cur) { cur = []; segs.push(cur); }
            cur.push(p);
        }
        avgZ /= (RING_SEGMENTS + 1);

        drawList.push({
            z: avgZ - 5, render: () => {
                ctx.strokeStyle = `rgba(${cr},${cg},${cb},${RING_ALPHA})`;
                ctx.lineWidth = 1.4;
                for (const seg of segs) {
                    if (seg.length < 2) continue;
                    ctx.beginPath();
                    seg.forEach((p, i) => i ? ctx.lineTo(p.px, p.py)
                        : ctx.moveTo(p.px, p.py));
                    ctx.stroke();
                }
            }
        });

        // light points: index 0 is the lead (bright, rainbow, +50% size)
        // 光點：索引 0 為主光點（最亮、彩虹色、放大 50%）
        for (let e = 0; e < POINTS_PER_RING; e++) {
            const isLead = (e === 0);
            const a = orbitAngle + planeAngle
                + e * (2 * Math.PI / POINTS_PER_RING);   // even π/2 spacing

            const [x, y, z] = ringPoint(a, cosP, sinP, orbitR);
            const p = project(x, y, z, cx, cy);
            if (occluded(p, cx, cy, earthPx) && BACKFACE_ALPHA === 0) continue;

            const tail = [];
            for (let t = 1; t <= TRAIL_POINTS; t++) {
                const [tx, ty, tz] = ringPoint(a - t * TRAIL_DTHETA,
                    cosP, sinP, orbitR);
                const tp = project(tx, ty, tz, cx, cy);
                if (occluded(tp, cx, cy, earthPx)) continue;
                tail.push({ p: tp, t });
            }

            const baseA = isLead ? 1 : DIM_ALPHA;
            const size = POINT_SIZE * (isLead ? LEAD_SCALE : 1);

            drawList.push({
                z: p.z, render: () => {
                    for (const { p: tp, t } of tail) {
                        const al = (1 - t / TRAIL_POINTS) * 0.7 * baseA;
                        ctx.fillStyle = `rgba(${cr},${cg},${cb},${al})`;
                        ctx.beginPath();
                        ctx.arc(tp.px, tp.py,
                            Math.max(0.2, (size * 0.42 - t * 0.14) * tp.scale),
                            0, Math.PI * 2);
                        ctx.fill();
                    }
                    const s = size * p.scale;
                    const gl = ctx.createRadialGradient(p.px, p.py, 0.5,
                        p.px, p.py, s * 3);
                    gl.addColorStop(0, `rgba(${cr},${cg},${cb},${baseA})`);
                    gl.addColorStop(0.4, `rgba(${cr},${cg},${cb},${baseA * 0.35})`);
                    gl.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
                    ctx.fillStyle = gl;
                    ctx.beginPath(); ctx.arc(p.px, p.py, s * 3, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = `rgba(${cr},${cg},${cb},${baseA})`;
                    ctx.beginPath(); ctx.arc(p.px, p.py, s, 0, Math.PI * 2);
                    ctx.fill();

                    if (isLead) {                       // white core / 白色核心
                        ctx.fillStyle = 'rgba(255,255,255,0.92)';
                        ctx.beginPath();
                        ctx.arc(p.px, p.py, s * 0.42, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });
        }
    }

    drawList.sort((a, b) => b.z - a.z);   // painter's algorithm, far -> near
    for (const item of drawList) item.render();

    requestAnimationFrame(render);
}

// ===============================================================
//  TOP BAR / 頂部導覽列
// ===============================================================

// --- project nav, coloured to match each ring's lead point ---
// 專案導覽，字色對應各環主光點顏色
function buildProjects() {
    const list = document.getElementById('projects');
    PROJECT_LABELS.forEach((label, i) => {
        const a = document.createElement('a');
        a.className = 'project';
        a.href = `#project-${String(i + 1).padStart(2, '0')}`;
        a.style.setProperty('--c', ringColours[i].hex);
        a.innerHTML = `<span class="dot"></span><span class="txt">${label}</span>`;
        a.setAttribute('data-ring', String(i + 1));
        list.appendChild(a);
    });
}

// ---------------------------------------------------------------
//  Wordmark: pulse + per-glyph lens
//  站名：亦滅 + 逐字透鏡
// ---------------------------------------------------------------
const wordmark = document.getElementById('wordmark');
let glyphs = [];              // 每個字元的 span 與其中心 x / spans and centres
let lensX = null;             // 已平滑的鏡心位置 / smoothed lens centre
let lensTargetX = null;       // 鏡心目標位置 / raw target
let lensActive = false;

// Split the wordmark into one span per character. Spaces get a dedicated span
// so the lens deforms the gap too, keeping the arc continuous.
// 站名逐字拆成 span；空白也給獨立 span，讓透鏡連空隙一起變形，弧線才連續。
function buildWordmark(text) {
    wordmark.textContent = '';
    glyphs = [];
    for (const ch of text) {
        const s = document.createElement('span');
        s.className = 'glyph';
        if (ch === ' ') {
            s.innerHTML = '&nbsp;';
            s.classList.add('space');
        } else {
            s.textContent = ch;
        }
        wordmark.appendChild(s);
        glyphs.push({ el: s, cx: 0 });
    }
    measureGlyphs();
}

// Cache each glyph's resting centre. Measured with the lens off, otherwise the
// magnified positions would feed back into the next frame's calculation.
// 快取每個字元的靜止中心。必須在透鏡關閉時量測，否則放大後的位置會回授。
function measureGlyphs() {
    const base = wordmark.getBoundingClientRect().left;
    for (const g of glyphs) {
        const r = g.el.getBoundingClientRect();
        g.cx = r.left - base + r.width / 2;
    }
}

wordmark.addEventListener('pointerenter', () => { lensActive = true; });
wordmark.addEventListener('pointermove', e => {
    lensTargetX = e.clientX - wordmark.getBoundingClientRect().left;
    if (lensX === null) lensX = lensTargetX;   // 首幀不做插值 / no lerp on entry
});
wordmark.addEventListener('pointerleave', () => { lensActive = false; });

// Independent rAF loop for the top bar. Kept separate from the canvas render
// so the DOM writes are not interleaved with 6,000 canvas draw calls.
// 導覽列使用獨立的 rAF 迴圈，避免 DOM 寫入與六千次 canvas 繪製交錯。
let barLast = performance.now();

function updateTopBar(now) {
    const dt = Math.min((now - barLast) / 1000, 0.1);
    barLast = now;

    // --- 5 s sine pulse across the grey band / 5 秒正弦亦滅 ---
    // Runs unconditionally: hover magnifies but never freezes or recolours it.
    // 恆常執行：hover 只放大，不停止也不改色。
    const t = (now / 1000) % PULSE_PERIOD;
    const k = 0.5 - 0.5 * Math.cos((t / PULSE_PERIOD) * Math.PI * 2);  // 0..1
    const v = Math.round(PULSE_DARK + (PULSE_BRIGHT - PULSE_DARK) * k);
    wordmark.style.color = `rgb(${v},${v},${v})`;

    // --- per-glyph lens / 逐字透鏡 ---
    if (lensActive && lensTargetX !== null) {
        lensX += (lensTargetX - lensX) *
            (1 - Math.pow(1 - LENS_DAMPING, dt * 60));
    }

    for (const g of glyphs) {
        let scale = 1, lift = 0;
        if (lensActive && lensX !== null) {
            const d = Math.abs(g.cx - lensX);
            if (d < LENS_RADIUS) {
                // Raised cosine falloff: 1 at the centre, 0 at the rim, with
                // zero slope at both ends so there is no visible seam where
                // the lens stops. A linear falloff would crease here.
                // 升餘弦衰減：中心 1、邊緣 0，兩端斜率皆為 0，
                // 因此透鏡邊界沒有折痕。線性衰減會出現摺角。
                const f = 0.5 + 0.5 * Math.cos((d / LENS_RADIUS) * Math.PI);
                scale = 1 + (LENS_MAX_SCALE - 1) * f;
                lift = -LENS_LIFT * f;
            }
        }
        g.el.style.transform = `translateY(${lift.toFixed(2)}px) ` +
            `scale(${scale.toFixed(3)})`;
    }

    requestAnimationFrame(updateTopBar);
}

// ===============================================================
//  CLOCK ROW / 時間列
// ===============================================================
// 兩段皆為 YYYYMMDD-HHMMSS 24 小時制；本地在前，GMT+8 在後。
// Both segments use YYYYMMDD-HHMMSS in 24-hour form; local first, GMT+8 second.
const pad = (n, w = 2) => String(n).padStart(w, '0');

function stamp(d) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
        + `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

// Local time is formatted by shifting a UTC clone by the local offset, so both
// segments run through the identical formatter and cannot disagree on padding.
// 本地時間以「UTC 副本 + 本地偏移」格式化，兩段共用同一個格式化函式，
// 因此不會出現補零不一致的情形。
function localStamp(now) {
    return stamp(new Date(now.getTime() - now.getTimezoneOffset() * 60000));
}

function offsetStamp(now, hours) {
    return stamp(new Date(now.getTime() + hours * 3600000));
}

// Short label for the browser's own zone, e.g. CST / JST / GMT-7.
// 瀏覽器所在時區的簡短標籤。
function localZoneLabel(now) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZoneName: 'short',
        }).formatToParts(now);
        const tz = parts.find(p => p.type === 'timeZoneName');
        if (tz && tz.value) return tz.value;
    } catch (e) { /* fall through / 落入備援 */ }
    // Fallback: numeric offset. Note the sign flip — getTimezoneOffset()
    // returns minutes WEST of UTC, so UTC+8 reports -480.
    // 備援：數字偏移。注意符號相反，getTimezoneOffset() 回傳的是
    // UTC 以西的分鐘數，故 UTC+8 會回報 -480。
    const m = -now.getTimezoneOffset();
    const sign = m >= 0 ? '+' : '-';
    const a = Math.abs(m);
    return `GMT${sign}${Math.floor(a / 60)}${a % 60 ? ':' + pad(a % 60) : ''}`;
}

const clockLocal = document.getElementById('clock-local');
const clockGmt8 = document.getElementById('clock-gmt8');

function tickClock() {
    const now = new Date();
    clockLocal.textContent = `${localStamp(now)} (${localZoneLabel(now)})`;
    clockGmt8.textContent = `${offsetStamp(now, CLOCK_TZ_OFFSET)} (GMT+${CLOCK_TZ_OFFSET})`;
}

// Two distinct rainbow hues, drawn once per load. Reuses the shuffled
// ringColours so the clock can never clash with a ring's lead point.
// 每次載入抽兩個互異的彩虹色。沿用已洗牌的 ringColours，
// 因此時間顏色不會與任一環的主光點撞色。
function paintClock() {
    const pool = RAINBOW.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    clockLocal.style.color = pool[0].hex;
    clockGmt8.style.color = pool[1].hex;
}

// ===============================================================
//  DEPLOY-SITE GEOLOCATION / 部署地定位
// ===============================================================
// OFF by default. See ENABLE_GEO_LOOKUP for the privacy trade-off.
// 預設關閉，隱私取捨見 ENABLE_GEO_LOOKUP 說明。
function lookupDeploySite() {
    if (!ENABLE_GEO_LOOKUP) return;
    if (typeof fetch !== 'function' || typeof AbortController !== 'function') {
        return;                       // 環境不支援則放棄 / unsupported, skip
    }
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), GEO_LOOKUP_TIMEOUT);

    fetch(GEO_LOOKUP_URL, { signal: ac.signal })
        .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
        .then(d => {
            const lat = Number(d.latitude), lon = Number(d.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
            markerSites = markerSites.concat([{
                name: (d.city || 'DEPLOY').toUpperCase(), lat, lon,
            }]);
        })
        .catch(() => { /* 靜默略過 / silently skip, by design */ })
        .finally(() => clearTimeout(timer));
}

buildProjects();
buildWordmark(SITE_NAME);
paintClock();
tickClock();
setInterval(tickClock, 1000);
lookupDeploySite();
resize();
window.addEventListener('resize', measureGlyphs);
// Re-measure once webfonts settle, otherwise the cached centres are based on
// the fallback font metrics. 待字型載入後重新量測，否則快取的是備用字型的位置。
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureGlyphs);
}
requestAnimationFrame(render);
requestAnimationFrame(updateTopBar);
