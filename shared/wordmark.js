// ===============================================================
//  WORDMARK — shared component / 共用元件
//  站名：5 秒灰階呼吸 + 滑鼠 hover 逐字透鏡放大。
//
//  Extracted from app.js so the homepage and all project-XX pages run
//  byte-identical logic instead of six pasted copies. Load this file
//  together with wordmark.css, then call:
//      initWordmark('wordmark', 'ST8925 LAB');
//  on any page with a matching <a id="wordmark"> element.
//
//  自 app.js 抽出，讓首頁與每個 project-XX 頁面共用同一份邏輯，
//  而非六份複製貼上。與 wordmark.css 成對載入，並呼叫
//  initWordmark('wordmark', 'ST8925 LAB') 完成綁定。
// ===============================================================

function initWordmark(elementId, text) {
    // --- 亦滅 / Pulse -------------------------------------------------
    const PULSE_PERIOD = 5.0;   // 亦滅週期 秒 / pulse period in seconds
    const PULSE_DARK   = 0x55;  // 暗相灰階 #555555，對比 2.70 / dark phase
    const PULSE_BRIGHT = 0x99;  // 亮相灰階 #999999，對比 7.07 / bright phase

    // --- 逐字透鏡 / Per-glyph lens -------------------------------------
    const LENS_MAX_SCALE = 1.55; // 鏡心最大放大 / peak magnification
    const LENS_RADIUS    = 110;  // 透鏡影響半徑 px / lens influence radius
    const LENS_LIFT      = 9;    // 鏡心最大上移 px / peak vertical lift
    const LENS_DAMPING   = 0.18; // 透鏡追隨阻尼 / lens follow damping

    const wordmark = document.getElementById(elementId);
    if (!wordmark) return null;

    let glyphs = [];         // 每個字元的 span 與其中心 x / spans and centres
    let lensX = null;        // 已平滑的鏡心位置 / smoothed lens centre
    let lensTargetX = null;  // 鏡心目標位置 / raw target
    let lensActive = false;

    // Split the wordmark into one span per character. Spaces get a dedicated
    // span so the lens deforms the gap too, keeping the arc continuous.
    // 站名逐字拆成 span；空白也給獨立 span，讓透鏡連空隙一起變形，弧線才連續。
    function buildWordmark(str) {
        wordmark.textContent = '';
        glyphs = [];
        for (const ch of str) {
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

    // Cache each glyph's resting centre. Measured with the lens off,
    // otherwise the magnified positions would feed back into the next
    // frame's calculation.
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

    // Independent rAF loop, kept separate from any page-specific canvas
    // render loop so DOM writes here never interleave with heavier drawing.
    // 獨立 rAF 迴圈，避免與頁面其他繪製（如首頁 canvas）交錯。
    let last = performance.now();

    function tick(now) {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;

        // --- 5 s sine pulse across the grey band / 5 秒正弦亦滅 ---
        // Runs unconditionally: hover magnifies but never freezes or
        // recolours it. 恆常執行：hover 只放大，不停止也不改色。
        const t = (now / 1000) % PULSE_PERIOD;
        const k = 0.5 - 0.5 * Math.cos((t / PULSE_PERIOD) * Math.PI * 2); // 0..1
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
                    // Raised cosine falloff: 1 at the centre, 0 at the rim,
                    // with zero slope at both ends so there is no visible
                    // seam where the lens stops. A linear falloff would
                    // crease here.
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

        requestAnimationFrame(tick);
    }

    buildWordmark(text);
    window.addEventListener('resize', measureGlyphs);
    // Re-measure once webfonts settle, otherwise the cached centres are
    // based on the fallback font metrics.
    // 待字型載入後重新量測，否則快取的是備用字型的位置。
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(measureGlyphs);
    }
    requestAnimationFrame(tick);

    return { measureGlyphs };
}
