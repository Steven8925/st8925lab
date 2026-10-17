// ===============================================================
//  FONT SCALE — shared component / 共用元件
//  頂列「A- / 100% / A+」字體大小控制，全站子專案共用同一份邏輯。
//
//  用法 / Usage:
//    1. 在 <head> 載入本檔與 fontscale.css（越早載入，越不會先閃一下原尺寸）。
//    2. 頁面 CSS 以 --font-scale 計算根字級，例如
//         html { font-size: calc(16px * var(--font-scale, 1)); }
//       各頁的基準值不同，目的是讓「主要文字」預設約 14px（2026-10-17 山姆哥選 1(b)）。
//    3. 頂列放一個空的 <div id="font-scale-slot"></div>，DOM 就緒後呼叫
//         initFontScale('font-scale-slot');
//
//  使用者選的倍率存在 localStorage 'st8925_font_scale'，所有子專案共用，
//  並透過 storage 事件同步到其他已開啟的分頁。
//  The chosen scale is shared by every subproject (one localStorage key)
//  and synced to other open tabs through the storage event.
// ===============================================================

(function () {
    var KEY  = 'st8925_font_scale';
    var MIN  = 0.85;
    var MAX  = 1.45;
    var STEP = 0.1;

    function clamp(v) {
        if (!isFinite(v)) return 1;
        return Math.min(MAX, Math.max(MIN, Math.round(v * 100) / 100));
    }

    function readSaved() {
        try { return clamp(parseFloat(localStorage.getItem(KEY) || '1')); }
        catch (_) { return 1; }   // 私密模式等情況讀不到 storage
    }

    var scale = readSaved();

    function apply() {
        document.documentElement.style.setProperty('--font-scale', String(scale));
        var labels = document.querySelectorAll('[data-font-scale="reset"]');
        for (var i = 0; i < labels.length; i++) {
            labels[i].textContent = Math.round(scale * 100) + '%';
        }
    }

    function setScale(next) {
        scale = clamp(next);
        apply();
        try { localStorage.setItem(KEY, String(scale)); } catch (_) { /* 存不了就只影響本頁 */ }
    }

    apply();   // 載入當下就套用，不等 DOM

    window.addEventListener('storage', function (e) {
        if (e.key !== KEY) return;
        scale = clamp(parseFloat(e.newValue || '1'));
        apply();
    });

    window.initFontScale = function (slotId) {
        var slot = document.getElementById(slotId);
        if (!slot || slot.childElementCount) return;
        slot.classList.add('font-scale-controls');
        slot.setAttribute('role', 'group');
        slot.setAttribute('aria-label', '調整介面字體大小');
        slot.title = '調整介面字體大小';
        var defs = [
            ['dec',   'A-',   '縮小字體', function () { setScale(scale - STEP); }],
            ['reset', '100%', '重設字體', function () { setScale(1); }],
            ['inc',   'A+',   '放大字體', function () { setScale(scale + STEP); }]
        ];
        defs.forEach(function (d) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'font-scale-btn';
            b.setAttribute('data-font-scale', d[0]);
            b.setAttribute('aria-label', d[2]);
            b.textContent = d[1];
            b.addEventListener('click', d[3]);
            slot.appendChild(b);
        });
        apply();
    };
})();
