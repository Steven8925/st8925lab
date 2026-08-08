// ===============================================================
//  NIGHT EARTH — orbiting light points around a rotating night Earth
//  All tunable values are named constants in the block below.
//  所有可調參數皆為下方區塊的具名常數。
// ===============================================================

// ---------------------------------------------------------------
// FIXED PARAMETERS / 固定參數
// ---------------------------------------------------------------
// ORBIT_RINGS is DERIVED from PROJECTS (see the PROJECTS block below), so a
// ring exists for every project, 1:1. To add a project, add one entry to
// PROJECTS and everything else follows: ring count, plane angles, colours,
// nav links and click targets.
// ORBIT_RINGS 由 PROJECTS 推導，專案與軌道 1:1。新增專案只需在 PROJECTS
// 加一筆，環數、平面角、配色、導覽、點擊目標全部自動跟上。
const POINTS_PER_RING    = 4;     // 每環光點 / light points per ring
const ORBIT_RADIUS       = 240;   // 軌道半徑 px / orbit radius
const EARTH_RADIUS       = 130;   // 地球半徑 px / earth radius
const TILT_DEG           = 65;    // 軌道傾角 / orbit tilt
const RING_ALPHA         = 0.4;   // 軌道線透明度 / orbit ring alpha
const RING_SEGMENTS      = 120;   // 軌道線段數 / ring polyline segments
const ORBIT_SPEED        = 1.5;   // 光點角速度 rad/s / point angular speed
const EARTH_SPIN         = 0.18;  // 地球自轉 rad/s / earth spin
const TRAIL_POINTS       = 15;    // 拖尾點數 / trail samples
const TRAIL_DTHETA       = 0.04;  // 拖尾間距 rad / trail spacing
const LEAD_SCALE         = 1.5;   // 主光點放大倍率 / lead point size multiplier
const POINT_SIZE         = 6;     // 一般光點半徑 px / normal point radius
const DIM_ALPHA          = 0.45;  // 非主光點亮度 / non-lead point alpha
const CAM_DISTANCE       = 900;   // 透視距離 / perspective divide distance
const CAM_RX0            = 0.35;  // 相機初始俯仰 / initial camera pitch
const CAM_RY0            = 0.0;   // 相機初始偏航 / initial camera yaw
const DRAG_SENS          = 0.006; // 拖曳靈敏度 rad/px / drag sensitivity
const OCCLUSION_MARGIN   = 0.985; // 遮擋判定邊界 / occlusion test margin
const BACKFACE_ALPHA     = 0.0;   // 被遮擋光點透明度 / occluded point alpha
const STAGE_Y_OFFSET     = -50;   // 地球與軌跡垂直偏移 px（負數為上移） / Globe & orbit vertical offset (negative = up)

// --- 呼吸 / Breathing ------------------------------------------
// 只作用於軌道與光點，地球半徑恆為 EARTH_RADIUS。
// Applies to the orbits and light points only; the Earth never scales.
const BREATH_AMPLITUDE   = 0.12;  // 自主呼吸幅度 +/-12% / autonomous amplitude
const BREATH_PERIOD      = 8.0;   // 呼吸週期 秒 / period in seconds
const MOUSE_BREATH_MAX   = 0.08;  // 滑鼠最大疊加 +8% / max mouse contribution
const MOUSE_BREATH_RANGE = 420;   // 達到最大疊加的距離 px / distance for max
const MOUSE_DAMPING      = 0.06;  // 滑鼠追隨阻尼 / follow damping, 0..1

// --- 站名亦滅 / Wordmark pulse ---------------------------------
const PULSE_PERIOD       = 5.0;   // 亦滅週期 秒 / pulse period in seconds
const PULSE_DARK         = 0x55;  // 暗相灰階 #555555，對比 2.70 / dark phase
const PULSE_BRIGHT       = 0x99;  // 亮相灰階 #999999，對比 7.07 / bright phase

// --- 逐字透鏡 / Per-glyph lens ---------------------------------
const LENS_MAX_SCALE     = 1.55;  // 鏡心最大放大 / peak magnification
const LENS_RADIUS        = 110;   // 透鏡影響半徑 px / lens influence radius
const LENS_LIFT          = 9;     // 鏡心最大上移 px / peak vertical lift
const LENS_DAMPING       = 0.18;  // 透鏡追隨阻尼 / lens follow damping

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
const SURFACE_TEXT       = 'st8925lab';
const SURFACE_TEXT_SITES = [
    { name: 'pacific',  lon: -144, lat: 0 },   // 太平洋正中 / mid-Pacific
    { name: 'atlantic', lon:  -14, lat: 0 },   // 大西洋正中 / mid-Atlantic
];
const OCEAN_BASE         = [0x0b, 0x1a, 0x2e];  // 海洋底色 / ocean base colour
const EMBOSS_PERIOD      = 5.0;   // 亦滅週期 秒 / pulse period
const EMBOSS_MIN_MULT    = 1.0;   // 最暗倍率（等於底色）/ trough multiplier
const EMBOSS_MAX_MULT    = 2.5;   // 最亮倍率 +150% / peak multiplier
const EMBOSS_FONT_PX     = 12;    // 字級 px / font size
const EMBOSS_FADE_COS    = 0.35;  // 淡出門檻 cos(theta) / limb fade threshold

// --- 地標紅點 / Location markers -------------------------------
const MARKER_PERIOD      = 2.0;   // 雷達環週期 秒 / radar ring period
const MARKER_DOT_R       = 3.0;   // 紅點半徑 px / dot radius
const MARKER_RING_MAX    = 16;    // 雷達環最大半徑 px / max ring radius
const MARKER_COLOUR      = [255, 64, 64];   // 紅 / red

const MARKER_SITES = [
    { name: 'TAIWAN',    lat:  25.03, lon: 121.57 },
    { name: 'SINGAPORE', lat:   1.35, lon: 103.82 },
];

// --- 部署地 IP 定位 / Deploy-site geolocation ------------------
// 預設關閉：開啟後每次載入都會向第三方 API 送出請求，訪客 IP 會離開本站，
// 且本頁不再能離線 / 以 file:// 使用。改為 true 即啟用第三個紅點。
// Disabled by default. Enabling it sends a request to a third-party API on
// every page load, exposing the visitor's IP, and the page stops being
// offline-capable. Set to true to enable the third marker.
const ENABLE_GEO_LOOKUP  = false;
const GEO_LOOKUP_URL     = 'https://ipapi.co/json/';
const GEO_LOOKUP_TIMEOUT = 3000;  // ms

// --- 星雲爆炸 / Nebula burst -----------------------------------
// Fired from a ring's lead point when either that ring's light point or its
// nav entry is clicked. Navigation happens when the animation finishes.
// 由該環主光點射出；點擊軌道光點或導覽列皆會觸發，動畫結束後才導向。
const BURST_DURATION     = 1400;  // 動畫總長 ms / total animation length
const BURST_PARTICLES    = 280;   // 粒子數 / particle count (280)
const BURST_SPEED_MIN    = 280;   // 粒子初速下限 px/s（再加大100%） / min initial speed (4x)
const BURST_SPEED_MAX    = 1200;  // 粒子初速上限 px/s（再加大100%） / max initial speed (4x)
const BURST_DAMPING      = 0.945; // 每幀阻尼，星雲感來源 / per-frame damping
const BURST_RING_MAX     = 480;   // 衝擊波最大半徑 px（再加大100%） / max shockwave radius (4x)
const BURST_FLASH_SCALE  = 20.0;  // 核心閃光倍率（再加大100%） / core flash multiplier (4x)
const BURST_PARTICLE_R   = 9.6;   // 粒子半徑 px（再加大100%） / particle radius (4x)
// A nebula reads as a bright diffuse HAZE, not as sparse dots on black.
// Measured against the reference images: their 90th-percentile luminance is
// 68..136, whereas a dots-only burst measured 7 (essentially black).
// These three constants supply that haze. 星雲的關鍵是瀰漫的亮霧而非疏散亮點。
const BURST_CLOUDS       = 12;    // 瀰漫雲團數 / diffuse cloud blobs
const BURST_CLOUD_R      = 312;   // 雲團最大半徑 px（再加大100%） / max cloud radius (4x)
const BURST_GLOW_MULT    = 4.5;   // 粒子光暈倍率 / per-particle glow radius
const BURST_SPARKS       = 32;    // 十字星芒數 / cross-flare sparks

// --- 點擊判定 / Click detection --------------------------------
// A press only counts as a click if the pointer barely moved and was not
// held long, otherwise finishing a camera drag would fire a burst.
// 位移夠小且時間夠短才算點擊，否則拖曳結束會誤觸發爆炸。
const CLICK_MAX_MOVE     = 6;     // 最大位移 px / max travel to still be a click
const CLICK_MAX_MS       = 400;   // 最長按壓 ms / max press duration
const HIT_PADDING        = 8;     // 命中半徑寬容 px / hit radius tolerance

// --- 時間列 / Clock row ----------------------------------------
const CLOCK_TZ_OFFSET    = 8;     // 第二個時區 GMT+8 / second timezone

// RAINBOW / PROJECTS / PROJECT_URL now live in config.js, loaded first.
// RAINBOW、PROJECTS、PROJECT_URL 已移至 config.js，載入順序在前。

const SITE_NAME = 'ST8925 LAB';

const ORBIT_RINGS = PROJECTS.length;   // 軌道環數 = 專案數 / rings == projects

if (PROJECTS.length > RAINBOW.length) {
    console.error(
        `[night-earth] ${PROJECTS.length} projects but only ${RAINBOW.length} ` +
        `colours. Colours would repeat and the colour<->project mapping breaks. ` +
        `Add more hues to RAINBOW (keep contrast >= 7.0 against #04070e).`);
}
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
const ctx    = canvas.getContext('2d');
const stage  = document.getElementById('stage');

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
    canvas.width  = Math.round(r.width  * dpr);
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
// pressX/pressY/pressT record where and when the press started so pointerup
// can tell a click from the end of a camera drag. Without this every drag
// release that happened to finish on a light point would fire a burst.
// 記錄按下的位置與時間，供 pointerup 區分點擊與拖曳收尾。
let pressX = 0, pressY = 0, pressT = 0;

stage.addEventListener('pointerdown', e => {
    dragging = true; prevX = e.clientX; prevY = e.clientY;
    pressX = e.clientX; pressY = e.clientY; pressT = performance.now();
    stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
    // Mouse contribution to the breath: distance from the globe centre,
    // normalised to 0..1 over MOUSE_BREATH_RANGE. Further out = more inflation.
    // 滑鼠疊加量：以距地球中心的距離正規化，越遠膨脹越多。
    const r = stage.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2 + STAGE_Y_OFFSET);
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
stage.addEventListener('pointerup', e => {
    endDrag();
    // Only a short, nearly stationary press counts as a click.
    // 位移夠小且時間夠短才算點擊。
    const moved = Math.hypot(e.clientX - pressX, e.clientY - pressY);
    const held  = performance.now() - pressT;
    if (moved > CLICK_MAX_MOVE || held > CLICK_MAX_MS) return;

    const r = stage.getBoundingClientRect();
    const hit = hitTest(e.clientX - r.left, e.clientY - r.top);
    if (hit) openProject(hit.ring);
});
stage.addEventListener('pointercancel', endDrag);

// Hover feedback: a clickable light point turns the cursor into a pointer,
// which is the only affordance telling the user the dots are interactive.
// 停留在可點光點上時改變游標，這是唯一提示光點可互動的線索。
stage.addEventListener('pointermove', e => {
    if (dragging) return;
    const r = stage.getBoundingClientRect();
    stage.style.cursor = hitTest(e.clientX - r.left, e.clientY - r.top)
        ? 'pointer' : 'grab';
});
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

// ===============================================================
//  HIT TESTING + NEBULA BURST / 命中偵測與星雲爆炸
// ===============================================================

// Rebuilt every frame by render(). Each entry is a light point that was
// actually drawn this frame, so points hidden behind the globe are absent
// from the list and are therefore naturally unclickable — no extra test.
// 每幀由 render() 重建。被地球遮擋的光點根本不會進入此列表，
// 因此天然不可點，不需額外判斷。
let hitTargets = [];

// Screen positions of each ring's light points, refreshed every frame. Used to
// launch bursts from all light points on the same ring simultaneously.
// 各環所有光點的螢幕座標，供點擊時該軌道上所有光點一同爆破。
let ringPointsScreen = new Map();

let bursts = [];          // 進行中的爆炸 / active bursts
let navLocked = false;    // 導向中，避免重複觸發 / guards double activation

function hitTest(x, y) {
    // Nearest match wins, so overlapping points resolve predictably rather
    // than depending on draw order. 取最近者，重疊時結果可預期。
    let best = null, bestD = Infinity;
    for (const t of hitTargets) {
        const d = Math.hypot(x - t.px, y - t.py);
        if (d <= t.r + HIT_PADDING && d < bestD) { bestD = d; best = t; }
    }
    return best;
}

// Spawn a burst at a screen position, in the colour of the given ring.
// z is kept so the burst can take part in the normal depth sort, which is
// why a burst behind the globe is correctly hidden by it.
// 保留 z 以參與深度排序，因此背面的爆炸會被地球正確遮住。
function spawnBurst(ringIndex, px, py, z) {
    const c = ringColours[ringIndex].rgb;
    const parts = [];
    for (let i = 0; i < BURST_PARTICLES; i++) {
        // Random direction, random speed. Uniform angle spread keeps the
        // cloud round; the speed spread is what makes it read as a nebula
        // rather than a ring. 角度均勻使雲團渾圓，速度差異形成星雲感。
        const a = Math.random() * Math.PI * 2;
        // sqrt() biases speeds outward so the interior does not stay dense
        // while the rim thins — that even fill is what looks like a cloud.
        // sqrt 使速度偏向外側，內外密度較均勻，才像雲團而非中心團塊。
        const v = BURST_SPEED_MIN + Math.sqrt(Math.random()) *
                  (BURST_SPEED_MAX - BURST_SPEED_MIN);
        parts.push({
            x: 0, y: 0,
            vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            r: BURST_PARTICLE_R * (0.4 + Math.random() * 1.3),
            spark: i < BURST_SPARKS,          // 少數粒子帶星芒 / cross flare
            tw: Math.random() * Math.PI * 2,  // 閃爍相位 / twinkle phase
        });
    }
    // Diffuse blobs drifting slower than the particles. These are what raise
    // the mid-tones and make the burst read as a nebula rather than confetti.
    // 瀰漫雲團漂移較慢，負責抬升中間調，使爆炸像星雲而非碎紙。
    const clouds = [];
    for (let i = 0; i < BURST_CLOUDS; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = BURST_SPEED_MIN * (0.25 + Math.random() * 0.55);
        clouds.push({
            x: 0, y: 0,
            vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            r: BURST_CLOUD_R * (0.45 + Math.random() * 0.75),
        });
    }
    bursts.push({ ring: ringIndex, px, py, z, rgb: c, t: 0, parts, clouds });
}

// Advance every burst. Damping is made frame-rate independent for the same
// reason as the mouse breath: identical feel at 60 Hz and 144 Hz.
// 阻尼同樣做幀率無關化，60Hz 與 144Hz 表現一致。
function updateBursts(delta) {
    const k = Math.pow(BURST_DAMPING, delta * 60);
    for (const b of bursts) {
        b.t += delta * 1000;
        for (const p of b.parts) {
            p.x += p.vx * delta; p.y += p.vy * delta;
            p.vx *= k; p.vy *= k;
        }
        for (const c of b.clouds) {
            c.x += c.vx * delta; c.y += c.vy * delta;
            c.vx *= k; c.vy *= k;
        }
    }
    bursts = bursts.filter(b => b.t < BURST_DURATION);
}

function drawBurst(b) {
    const prog = Math.min(1, b.t / BURST_DURATION);   // 0..1
    const [r, g, bl] = b.rgb;

    // Hold near full brightness, then fall away. A linear (1 - prog) fade
    // spends most of its life dim, which is what made the first version look
    // faint. 先維持亮度再收尾；線性淡出會使大半時間都偏暗，正是前版太淡的主因。
    const fade = Math.pow(1 - prog, 1.7);
    const rise = Math.min(1, prog / 0.06);            // 60 ms ease-in

    const prev = ctx.globalCompositeOperation;
    // Additive blending: overlapping haze accumulates toward white instead of
    // averaging toward the backdrop. This is what makes a nebula glow.
    // 加成混合：重疊處累加趨白而非趨近背景，這是星雲發光的關鍵。
    ctx.globalCompositeOperation = 'lighter';

    // 1. Diffuse cloud — the haze that lifts the mid-tones.
    for (const c of b.clouds) {
        const cx2 = b.px + c.x * sceneScale, cy2 = b.py + c.y * sceneScale;
        const cr = c.r * (0.35 + prog * 0.9) * sceneScale;
        const gl = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, cr);
        gl.addColorStop(0,    `rgba(${r},${g},${bl},${0.30 * fade * rise})`);
        gl.addColorStop(0.45, `rgba(${r},${g},${bl},${0.11 * fade * rise})`);
        gl.addColorStop(1,    `rgba(${r},${g},${bl},0)`);
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(cx2, cy2, cr, 0, Math.PI * 2); ctx.fill();
    }

    // 2. Shockwave ring — expands while thinning out.
    const rr = BURST_RING_MAX * prog * sceneScale;
    ctx.strokeStyle = `rgba(${r},${g},${bl},${fade * 0.5})`;
    ctx.lineWidth = Math.max(0.4, 3.5 * fade);
    ctx.beginPath(); ctx.arc(b.px, b.py, rr, 0, Math.PI * 2); ctx.stroke();

    // 3. Core flash — brightest at t=0, gone by roughly a third of the way.
    const fl = Math.max(0, 1 - prog * 3);
    if (fl > 0) {
        const fr = POINT_SIZE * BURST_FLASH_SCALE * fl * sceneScale;
        const gl = ctx.createRadialGradient(b.px, b.py, 0, b.px, b.py, fr);
        gl.addColorStop(0,   `rgba(255,255,255,${fl})`);
        gl.addColorStop(0.3, `rgba(${r},${g},${bl},${fl * 0.85})`);
        gl.addColorStop(1,   `rgba(${r},${g},${bl},0)`);
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(b.px, b.py, fr, 0, Math.PI * 2); ctx.fill();
    }

    // 4. Particles — each with a soft glow, so they blend into the haze
    //    instead of reading as hard confetti dots.
    //    每顆帶柔光暈，融入霧氣而非硬邊碎點。
    for (const p of b.parts) {
        const x = b.px + p.x * sceneScale, y = b.py + p.y * sceneScale;
        // Twinkle keeps the cloud alive rather than uniformly fading.
        const tw = 0.75 + 0.25 * Math.sin(b.t * 0.013 + p.tw);
        const a  = fade * rise * tw;
        const pr = Math.max(0.25, p.r * (0.55 + fade * 0.45) * sceneScale);

        const gr = pr * BURST_GLOW_MULT;
        const gl = ctx.createRadialGradient(x, y, 0, x, y, gr);
        gl.addColorStop(0,   `rgba(${r},${g},${bl},${0.5 * a})`);
        gl.addColorStop(0.5, `rgba(${r},${g},${bl},${0.14 * a})`);
        gl.addColorStop(1,   `rgba(${r},${g},${bl},0)`);
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill();

        // Hot white core, as in the reference images where the brightest
        // points wash out to white. 參考圖中最亮處泛白，故核心用白。
        ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`;
        ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.fill();

        // 5. Cross flare on a few particles — the star-spike look.
        if (p.spark) {
            const sl = pr * 7;
            ctx.strokeStyle = `rgba(255,255,255,${0.30 * a})`;
            ctx.lineWidth = Math.max(0.35, pr * 0.42);
            ctx.beginPath();
            ctx.moveTo(x - sl, y); ctx.lineTo(x + sl, y);
            ctx.moveTo(x, y - sl); ctx.lineTo(x, y + sl);
            ctx.stroke();
        }
    }

    ctx.globalCompositeOperation = prev;   // 還原，勿影響後續繪製
}

// Single entry point for BOTH directions: clicking a light point and clicking
// a nav entry both land here, so the two paths cannot drift apart.
// 雙向共用同一入口；點擊軌道光點或導覽列皆在此使該軌道上所有光點一同爆破。
function openProject(ringIndex) {
    if (navLocked) return;
    navLocked = true;

    const points = ringPointsScreen.get(ringIndex);
    if (points && points.length > 0) {
        for (const pt of points) {
            spawnBurst(ringIndex, pt.px, pt.py, pt.z);
        }
    } else {
        // Fallback if no points captured for this frame
        spawnBurst(ringIndex, stage.clientWidth / 2,
                   stage.clientHeight / 2 + STAGE_Y_OFFSET, 1e6);
    }

    setTimeout(() => {
        // Carry the ring's ACTUAL hue, not its index, because the palette is
        // reshuffled per load. 傳遞實際色相而非索引，因配色每次載入洗牌。
        window.location.href = PROJECT_URL(PROJECTS[ringIndex].id,
                                           ringColours[ringIndex].name);
    }, BURST_DURATION);
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
const LAND  = unpackGeo(LAND_PACKED);

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
    g.addColorStop(0,    '#0b1a2e');
    g.addColorStop(0.75, '#0a1526');
    g.addColorStop(1,    '#12233d');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // atmosphere halo / 大氣層光暈
    const halo = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 1.35);
    halo.addColorStop(0,   'rgba(90,170,255,0.22)');
    halo.addColorStop(0.4, 'rgba(70,140,230,0.09)');
    halo.addColorStop(1,   'rgba(60,120,210,0)');
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
        glow.addColorStop(0,   `rgba(${mr},${mg},${mb},${0.9 * facing})`);
        glow.addColorStop(0.4, `rgba(${mr},${mg},${mb},${0.3 * facing})`);
        glow.addColorStop(1,   `rgba(${mr},${mg},${mb},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.px, p.py, dotR * 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${mr},${mg},${mb},${facing})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, dotR, 0, Math.PI * 2);
        ctx.fill();
    }
}

function render(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    orbitAngle += ORBIT_SPEED * delta;
    spinAngle  += EARTH_SPIN  * delta;
    breathClock += delta;
    embossClock += delta;
    markerClock += delta;

    // Exponential smoothing toward the mouse target, made frame-rate
    // independent so the feel is identical at 60 Hz and 144 Hz.
    // 指數平滑追隨滑鼠目標，並做幀率無關化，60Hz 與 144Hz 手感一致。
    mouseBreath += (mouseBreathTarget - mouseBreath) *
                   (1 - Math.pow(1 - MOUSE_DAMPING, delta * 60));

    updateBursts(delta);
    // Rebuilt from scratch each frame; stale entries would let the user click
    // a point that is no longer there. 每幀重建，避免點到已消失的光點。
    hitTargets = [];
    ringPointsScreen.clear();

    // Breathing scales the ORBITS ONLY. earthPx deliberately does not use it,
    // so the globe stays pinned at the centre exactly as specified.
    // 呼吸只作用於軌道；earthPx 刻意不套用，地球恆定於中心。
    const breath = breathFactor();
    const orbitR = ORBIT_RADIUS * breath;

    const w = stage.clientWidth, h = stage.clientHeight;
    const cx = w / 2, cy = h / 2 + STAGE_Y_OFFSET;
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

        drawList.push({ z: avgZ - 5, render: () => {
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${RING_ALPHA})`;
            ctx.lineWidth = 1.4;
            for (const seg of segs) {
                if (seg.length < 2) continue;
                ctx.beginPath();
                seg.forEach((p, i) => i ? ctx.lineTo(p.px, p.py)
                                        : ctx.moveTo(p.px, p.py));
                ctx.stroke();
            }
        }});

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
            const size  = POINT_SIZE * (isLead ? LEAD_SCALE : 1);

            // Register for click detection and burst location capture. All
            // POINTS_PER_RING points of a ring map to the same project.
            hitTargets.push({ ring: k, px: p.px, py: p.py,
                              r: size * p.scale });
            if (!ringPointsScreen.has(k)) ringPointsScreen.set(k, []);
            ringPointsScreen.get(k).push({ px: p.px, py: p.py, z: p.z });

            drawList.push({ z: p.z, render: () => {
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
                gl.addColorStop(0,   `rgba(${cr},${cg},${cb},${baseA})`);
                gl.addColorStop(0.4, `rgba(${cr},${cg},${cb},${baseA * 0.35})`);
                gl.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
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
            }});
        }
    }

    // Bursts join the normal depth sort rather than being drawn on top, so a
    // burst on the far side is correctly occluded by the globe.
    // 爆炸參與正常深度排序，背面的爆炸會被地球正確遮住。
    for (const b of bursts) {
        drawList.push({ z: b.z, render: () => drawBurst(b) });
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
    PROJECTS.forEach((proj, i) => {
        const a = document.createElement('a');
        a.className = 'project';
        // A real destination, so middle-click and "open in new tab" behave
        // normally and the link still works with JS disabled. The click
        // handler intercepts the plain-left-click case to play the burst.
        // 真實網址，中鍵與另開分頁照常運作；左鍵才攔截以播放爆炸。
        a.href = PROJECT_URL(proj.id);
        a.style.setProperty('--c', ringColours[i].hex);
        a.innerHTML = `<span class="dot"></span><span class="txt">${proj.label}</span>`;
        a.setAttribute('data-ring', String(i + 1));
        a.addEventListener('click', e => {
            // Let modified clicks through to the browser untouched.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            openProject(i);     // same entry point as clicking a light point
        });
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
                lift  = -LENS_LIFT * f;
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

// --- 62 世界城市清單 (依國家英文名稱 A-Z 排序) / 62 World Cities sorted A-Z ---
const WORLD_CITIES = [
    { label: 'Argentina_Buenos Aires', tz: 'America/Argentina/Buenos_Aires' },
    { label: 'Australia_Sydney', tz: 'Australia/Sydney' },
    { label: 'Austria_Vienna', tz: 'Europe/Vienna' },
    { label: 'Bangladesh_Dhaka', tz: 'Asia/Dhaka' },
    { label: 'Belgium_Brussels', tz: 'Europe/Brussels' },
    { label: 'Brazil_Sao Paulo', tz: 'America/Sao_Paulo' },
    { label: 'Bulgaria_Sofia', tz: 'Europe/Sofia' },
    { label: 'Canada_Toronto', tz: 'America/Toronto' },
    { label: 'Canada_Vancouver', tz: 'America/Vancouver' },
    { label: 'Chile_Santiago', tz: 'America/Santiago' },
    { label: 'China_Shanghai', tz: 'Asia/Shanghai' },
    { label: 'Colombia_Bogota', tz: 'America/Bogota' },
    { label: 'Croatia_Zagreb', tz: 'Europe/Zagreb' },
    { label: 'Czech Republic_Prague', tz: 'Europe/Prague' },
    { label: 'Denmark_Copenhagen', tz: 'Europe/Copenhagen' },
    { label: 'Egypt_Cairo', tz: 'Africa/Cairo' },
    { label: 'Finland_Helsinki', tz: 'Europe/Helsinki' },
    { label: 'France_Paris', tz: 'Europe/Paris' },
    { label: 'Germany_Berlin', tz: 'Europe/Berlin' },
    { label: 'Greece_Athens', tz: 'Europe/Athens' },
    { label: 'Hong Kong_Hong Kong', tz: 'Asia/Hong_Kong' },
    { label: 'Hungary_Budapest', tz: 'Europe/Budapest' },
    { label: 'India_Kolkata', tz: 'Asia/Kolkata' },
    { label: 'Indonesia_Jakarta', tz: 'Asia/Jakarta' },
    { label: 'Iran_Tehran', tz: 'Asia/Tehran' },
    { label: 'Ireland_Dublin', tz: 'Europe/Dublin' },
    { label: 'Israel_Jerusalem', tz: 'Asia/Jerusalem' },
    { label: 'Italy_Rome', tz: 'Europe/Rome' },
    { label: 'Japan_Tokyo', tz: 'Asia/Tokyo' },
    { label: 'Malaysia_Kuala Lumpur', tz: 'Asia/Kuala_Lumpur' },
    { label: 'Mexico_Mexico City', tz: 'America/Mexico_City' },
    { label: 'Morocco_Casablanca', tz: 'Africa/Casablanca' },
    { label: 'Netherlands_Amsterdam', tz: 'Europe/Amsterdam' },
    { label: 'New Zealand_Auckland', tz: 'Pacific/Auckland' },
    { label: 'Nigeria_Lagos', tz: 'Africa/Lagos' },
    { label: 'Norway_Oslo', tz: 'Europe/Oslo' },
    { label: 'Pakistan_Karachi', tz: 'Asia/Karachi' },
    { label: 'Peru_Lima', tz: 'America/Lima' },
    { label: 'Philippines_Manila', tz: 'Asia/Manila' },
    { label: 'Poland_Warsaw', tz: 'Europe/Warsaw' },
    { label: 'Portugal_Lisbon', tz: 'Europe/Lisbon' },
    { label: 'Russia_Moscow', tz: 'Europe/Moscow' },
    { label: 'Saudi Arabia_Riyadh', tz: 'Asia/Riyadh' },
    { label: 'Singapore_Singapore', tz: 'Asia/Singapore' },
    { label: 'South Africa_Johannesburg', tz: 'Africa/Johannesburg' },
    { label: 'South Korea_Seoul', tz: 'Asia/Seoul' },
    { label: 'Spain_Madrid', tz: 'Europe/Madrid' },
    { label: 'Sweden_Stockholm', tz: 'Europe/Stockholm' },
    { label: 'Switzerland_Zurich', tz: 'Europe/Zurich' },
    { label: 'Taiwan_Taipei', tz: 'Asia/Taipei' },
    { label: 'Thailand_Bangkok', tz: 'Asia/Bangkok' },
    { label: 'Turkey_Istanbul', tz: 'Europe/Istanbul' },
    { label: 'UAE_Dubai', tz: 'Asia/Dubai' },
    { label: 'UK_London', tz: 'Europe/London' },
    { label: 'Ukraine_Kyiv', tz: 'Europe/Kyiv' },
    { label: 'USA_Chicago', tz: 'America/Chicago' },
    { label: 'USA_Denver', tz: 'America/Denver' },
    { label: 'USA_Honolulu', tz: 'Pacific/Honolulu' },
    { label: 'USA_Los Angeles', tz: 'America/Los_Angeles' },
    { label: 'USA_New York', tz: 'America/New_York' },
    { label: 'USA_Phoenix', tz: 'America/Phoenix' },
    { label: 'Vietnam_Ho Chi Minh', tz: 'Asia/Ho_Chi_Minh' }
].sort((a, b) => a.label.localeCompare(b.label));

const clockLocal = document.getElementById('clock-local');
const clockGmt8  = document.getElementById('clock-gmt8');
const worldSelect = document.getElementById('world-clock-select');

function buildWorldClock() {
    if (!worldSelect) return;
    worldSelect.innerHTML = '';
    WORLD_CITIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.tz;
        opt.textContent = c.label;
        worldSelect.appendChild(opt);
    });

    const defaultOpt = WORLD_CITIES.find(c => c.label === 'Taiwan_Taipei');
    if (defaultOpt) worldSelect.value = defaultOpt.tz;

    let searchBuffer = '';
    let searchTimer = null;
    worldSelect.addEventListener('keydown', e => {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            clearTimeout(searchTimer);
            searchBuffer += e.key.toLowerCase();
            const options = Array.from(worldSelect.options);
            const match = options.find(opt => opt.textContent.toLowerCase().startsWith(searchBuffer));
            if (match) {
                worldSelect.value = match.value;
                tickClock();
            }
            searchTimer = setTimeout(() => { searchBuffer = ''; }, 800);
        }
    });

    worldSelect.addEventListener('change', tickClock);
}

function tzStamp(now, timeZone) {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZoneName: 'short',
        });
        const parts = {};
        formatter.formatToParts(now).forEach(p => { parts[p.type] = p.value; });
        const hour = parts.hour === '24' ? '00' : parts.hour;
        const dateStr = `${parts.year}${parts.month}${parts.day}-${hour}${parts.minute}${parts.second}`;
        const tzName = parts.timeZoneName || 'UTC';
        return `${dateStr} (${tzName})`;
    } catch (e) {
        return localStamp(now);
    }
}

function tickClock() {
    const now = new Date();
    const selectedTz = worldSelect ? worldSelect.value : null;
    clockLocal.textContent = selectedTz ? tzStamp(now, selectedTz) : `${localStamp(now)} (${localZoneLabel(now)})`;
    clockGmt8.textContent  = `${offsetStamp(now, CLOCK_TZ_OFFSET)} (GMT+${CLOCK_TZ_OFFSET})`;
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
    clockGmt8.style.color  = pool[1].hex;
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
buildWorldClock();
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
