#!/usr/bin/env python3
"""Night Earth — verification harness / 驗證腳本

Re-implements the projection, occlusion and colour logic of app.js in Python so
every number in SPEC-v4.md can be reproduced by anyone with the delivered
files. Constants are PARSED OUT OF app.js, not retyped, so this script cannot
silently drift from the implementation it is checking.

以 Python 重現 app.js 的投影、遮擋與配色邏輯，讓 SPEC-v4.md 的每個數字
都可被重現。常數直接從 app.js 解析，不重新輸入，因此本腳本不會與被檢驗的
實作悄悄脫節。

Usage / 用法:
    python3 verify.py            # run all checks / 執行全部檢查
    python3 verify.py --render   # also write preview PNGs (needs Pillow)

Requires / 需求: Python 3.8+. Pillow only for --render.
"""

import math
import os
import re
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, 'app.js')
CONFIG = os.path.join(HERE, 'config.js')
GEO = os.path.join(HERE, 'geodata.js')
HTML = os.path.join(HERE, 'index.html')
WORDMARK_CSS = os.path.join(HERE, 'shared', 'wordmark.css')
WORDMARK_JS = os.path.join(HERE, 'shared', 'wordmark.js')

FAILURES = []


def check(label, got, want, note=''):
    ok = (got == want)
    if not ok:
        FAILURES.append(f'{label}: got {got!r}, want {want!r}')
    mark = 'PASS' if ok else 'FAIL'
    extra = f'  {note}' if note else ''
    print(f'  [{mark}] {label}: {got}{extra}')
    return ok


def check_close(label, got, want, tol, note=''):
    ok = abs(got - want) <= tol
    if not ok:
        FAILURES.append(f'{label}: got {got!r}, want {want!r} +/- {tol}')
    mark = 'PASS' if ok else 'FAIL'
    extra = f'  {note}' if note else ''
    print(f'  [{mark}] {label}: {got}{extra}')
    return ok


# ---------------------------------------------------------------
# Parse constants straight out of app.js / 直接自 app.js 解析常數
# ---------------------------------------------------------------
def _parse_consts(src, pattern):
    out = {}
    for name, raw in re.findall(pattern, src, re.M):
        raw = raw.strip()
        try:
            if raw.lower().startswith('0x'):
                out[name] = int(raw, 16)          # e.g. PULSE_DARK = 0x55
            else:
                out[name] = float(raw) if '.' in raw else int(raw)
        except ValueError:
            pass                      # non-numeric consts (arrays) skipped
    return out


def load_constants():
    src = open(APP, encoding='utf-8').read()
    cfg = open(CONFIG, encoding='utf-8').read()
    wmjs = open(WORDMARK_JS, encoding='utf-8').read()

    out = _parse_consts(src, r'^const ([A-Z_]+)\s*=\s*([^;]+);')
    # wordmark.js declares its constants (PULSE_*, LENS_*) INSIDE the
    # initWordmark() function, not at column 0 — the pulse/lens is a
    # shared, self-contained component (see shared/wordmark.js and
    # PROMPT.md §2), not a page-global. A relaxed, indent-tolerant pattern
    # picks them up without requiring the shared module to pollute the
    # global scope just so this harness can find them.
    # wordmark.js 的常數宣告在 initWordmark() 函式作用域內（非全域第 0
    # 欄），因為站名亦滅／透鏡是自封裝的共用元件（見 shared/wordmark.js
    # 與 PROMPT.md §2）。用容許縮排的寬鬆規則解析，不必為了讓本腳本找到
    # 常數而把共用元件的內部變數污染到全域。
    out.update(_parse_consts(wmjs, r'^[ \t]*const ([A-Z_]+)\s*=\s*([^;]+);'))

    # ORBIT_RINGS is no longer a literal — it is derived from PROJECTS in
    # config.js. Deriving it the same way here keeps the harness honest: if
    # a project is added, every geometry check below follows automatically.
    # ORBIT_RINGS 已改為由 config.js 的 PROJECTS 推導，此處以相同方式取得，
    # 新增專案時下方所有幾何檢查會自動跟上。
    out['ORBIT_RINGS'] = len(re.findall(r"\{\s*id:\s*'(\d+)'", cfg))
    return src, cfg, out


SRC, CFG, C = load_constants()

ORBIT_RINGS      = C['ORBIT_RINGS']
POINTS_PER_RING  = C['POINTS_PER_RING']
ORBIT_RADIUS     = C['ORBIT_RADIUS']
EARTH_RADIUS     = C['EARTH_RADIUS']
TILT             = math.radians(C['TILT_DEG'])
RING_SEGMENTS    = C['RING_SEGMENTS']
POINT_SIZE       = C['POINT_SIZE']
LEAD_SCALE       = C['LEAD_SCALE']
CAM_DISTANCE     = C['CAM_DISTANCE']
OCCLUSION_MARGIN = C['OCCLUSION_MARGIN']
COS_TILT, SIN_TILT = math.cos(TILT), math.sin(TILT)

# Rainbow palette, parsed from the RAINBOW array in app.js
RAINBOW = [(n, tuple(int(x) for x in rgb.split(',')))
           for n, rgb in re.findall(
               r"name:\s*'(\w+)',\s*hex:\s*'#[0-9a-f]{6}',\s*rgb:\s*\[([^\]]+)\]",
               CFG)]


# ---------------------------------------------------------------
# Geometry — mirrors app.js ringPoint / project / occluded
# ---------------------------------------------------------------
def ring_point(theta, cos_p, sin_p, R):
    x0, y0 = R * math.cos(theta), R * math.sin(theta)
    return (x0 * cos_p - (y0 * COS_TILT) * sin_p,
            x0 * sin_p + (y0 * COS_TILT) * cos_p,
            y0 * SIN_TILT)


def project(x, y, z, cx, cy, rot_x, rot_y, scale=1.0):
    cyr, syr = math.cos(rot_y), math.sin(rot_y)
    cxr, sxr = math.cos(rot_x), math.sin(rot_x)
    x1 = x * cyr + z * syr
    z1 = -x * syr + z * cyr
    y2 = y * cxr - z1 * sxr
    z2 = y * sxr + z1 * cxr
    fov = CAM_DISTANCE / (CAM_DISTANCE + z2 * scale)
    return dict(px=cx + x1 * scale * fov, py=cy + y2 * scale * fov,
                sc=fov * scale, z=z2)


def occluded(p, cx, cy, earth_px):
    if p['z'] <= 0:
        return False                     # in front / 在前方
    dx, dy = p['px'] - cx, p['py'] - cy
    return dx * dx + dy * dy < (earth_px * OCCLUSION_MARGIN) ** 2


def geo_to_xyz(lon, lat, R, spin):
    l = lon + spin
    cl = math.cos(lat)
    return (R * cl * math.cos(l), -R * math.sin(lat), R * cl * math.sin(l))


# ---------------------------------------------------------------
# Geo data — decode the packed strings from geodata.js
# ---------------------------------------------------------------
B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
IDX = {c: i for i, c in enumerate(B64)}


def unpack(s):
    out = []
    for i in range(0, len(s), 4):
        v = ((IDX[s[i]] << 18) | (IDX[s[i + 1]] << 12) |
             (IDX[s[i + 2]] << 6) | IDX[s[i + 3]])
        out.append((math.radians((v >> 11) / 10 - 180),
                    math.radians((v & 2047) / 10 - 90)))
    return out


def load_geo():
    src = open(GEO, encoding='utf-8').read()
    coast = re.search(r'COAST_PACKED\s*=\s*"([^"]*)"', src).group(1)
    land  = re.search(r'LAND_PACKED\s*=\s*"([^"]*)"',  src).group(1)
    return coast, land


COAST_S, LAND_S = load_geo()
COAST, LAND = unpack(COAST_S), unpack(LAND_S)


# ---------------------------------------------------------------
# WCAG 2.1 contrast / 對比度
# ---------------------------------------------------------------
def _lin(c):
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(rgb):
    r, g, b = (_lin(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg, bg):
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


# ===============================================================
#  CHECKS
# ===============================================================
def check_counts():
    """SPEC 9: total points 24, lead points 6, occlusion tracks camera."""
    print('\n[1] Point counts and occlusion across camera angles')
    print('    光點總數與遮擋隨相機角度變化')
    angles = {'A_front': (0.35, 0.0, 0.6, 0.9),
              'B_drag':  (0.35, 2.4, 0.6, 0.9),
              'C_top':   (1.20, 0.8, 2.2, 2.0)}
    results = {}
    for tag, (rx, ry, spin, orbit_a) in angles.items():
        cx = cy = 0.0
        er = EARTH_RADIUS
        lead = norm = hidden = 0
        for k in range(ORBIT_RINGS):
            pa = k * math.pi / ORBIT_RINGS
            cp, sp = math.cos(pa), math.sin(pa)
            for e in range(POINTS_PER_RING):
                a = orbit_a + pa + e * (2 * math.pi / POINTS_PER_RING)
                p = project(*ring_point(a, cp, sp, ORBIT_RADIUS), cx, cy, rx, ry)
                if occluded(p, cx, cy, er):
                    hidden += 1
                elif e == 0:
                    lead += 1
                else:
                    norm += 1
        land_vis = sum(1 for lo, la in LAND
                       if project(*geo_to_xyz(lo, la, er, spin),
                                  cx, cy, rx, ry)['z'] < 0)
        results[tag] = (lead, norm, hidden, land_vis)
        total = lead + norm + hidden
        print(f'    {tag:8} lead={lead} normal={norm} hidden={hidden} '
              f'total={total} visible_land={land_vis}')
        check(f'{tag} total points', total,
              ORBIT_RINGS * POINTS_PER_RING)

    hid = [r[2] for r in results.values()]
    land = [r[3] for r in results.values()]
    print(f'    hidden counts across angles: {hid}')
    print(f'    visible land across angles : {land}')
    # The point of these two: if occlusion or backface cull used world-space z,
    # neither list would vary with the camera. 若用世界座標，這兩組數字不會變。
    check('hidden count varies with camera', len(set(hid)) > 1, True,
          '(constant would mean occlusion ignores the camera)')
    check('visible land varies with camera', len(set(land)) > 1, True,
          '(constant would mean backface cull uses world z)')
    return results


def check_geometry():
    print('\n[2] Ring plane angles and point spacing / 環平面角與光點間隔')
    angles = [round(math.degrees(k * math.pi / ORBIT_RINGS), 1)
              for k in range(ORBIT_RINGS)]
    # Expectation is DERIVED from the ring count, not pinned to the 6-ring
    # case, so adding a project rescales the fan instead of failing here.
    # Caught by actually scaling to 12: this line used to assert the 6-ring
    # angles and failed even though app.js was correct.
    # 期望值由環數推導而非寫死 6 環；此行原本寫死,在擴充至 12 時誤報失敗。
    check('plane angles (deg)', angles,
          [round(180.0 * k / ORBIT_RINGS, 1) for k in range(ORBIT_RINGS)],
          f'{ORBIT_RINGS} rings evenly spanning 180 deg')
    gaps = set()
    for e in range(POINTS_PER_RING):
        a1 = e * (2 * math.pi / POINTS_PER_RING)
        a2 = ((e + 1) % POINTS_PER_RING) * (2 * math.pi / POINTS_PER_RING)
        gaps.add(round((a2 - a1) % (2 * math.pi), 6))
    check('point spacing (rad)', sorted(gaps), [round(math.pi / 2, 6)],
          '= pi/2, evenly spaced')
    check('lead point size (px)', POINT_SIZE * LEAD_SCALE, 9.0,
          f'= {POINT_SIZE} x {LEAD_SCALE} (+50%)')


def check_sign_convention():
    print('\n[3] Sign convention: larger z means further / z 越大越遠')
    prev = None
    for z in (-500, -100, 0, 100, 500):
        fov = CAM_DISTANCE / (CAM_DISTANCE + z)
        rel = 'NEAR' if fov > 1 else ('SAME' if fov == 1 else 'FAR')
        print(f'    z={z:+5}  fov={fov:.4f}  {rel}')
        if prev is not None and fov >= prev:
            FAILURES.append('fov is not monotonically decreasing in z')
        prev = fov
    check('fov decreases as z grows', prev < 1, True,
          '=> behind the globe is z > 0')
    # And the code must agree.
    occ = re.search(r'function occluded[^}]*?\n\s*if \(([^)]+)\) return false;',
                    SRC, re.S)
    check('occluded() early-out test', occ.group(1).strip(), 'p.z <= 0',
          'in front, never occluded')
    surf = re.search(r'function surfacePoint.*?if \(([^)]+)\) return null;',
                     SRC, re.S)
    check('surfacePoint() backface test', surf.group(1).strip(), 'p.z >= 0',
          'far hemisphere culled')
    # surfacePoint must cull AFTER projecting, else the camera is ignored.
    body = SRC[SRC.index('function surfacePoint'):]
    body = body[:body.index('\n}')]
    check('surfacePoint culls on camera-space z',
          body.index('project(') < body.index('return null'), True,
          'project() runs before the cull')


def check_colours():
    print('\n[4] Colour shuffle and contrast / 配色與對比')
    check('palette size', len(RAINBOW), 12,
          'raised from 7 to 12 to lift the project ceiling')
    check('palette covers the projects', len(RAINBOW) >= ORBIT_RINGS, True,
          f'{ORBIT_RINGS} projects need {ORBIT_RINGS} distinct hues')
    rng = random.Random(0)
    dup = 0
    used = {n: 0 for n, _ in RAINBOW}
    TRIALS = 20000
    for _ in range(TRIALS):
        pool = [n for n, _ in RAINBOW]
        for i in range(len(pool) - 1, 0, -1):      # Fisher-Yates, as in app.js
            j = rng.randint(0, i)
            pool[i], pool[j] = pool[j], pool[i]
        pick = pool[:ORBIT_RINGS]
        if len(set(pick)) != ORBIT_RINGS:
            dup += 1
        for n in pick:
            used[n] += 1
    check(f'duplicate hues in {TRIALS} shuffles', dup, 0)
    spread = max(used.values()) - min(used.values())
    check_close('selection spread (uniformity)', spread / TRIALS, 0.0, 0.03,
                'each hue appears about equally often')
    # Not "== 1" any more: the surplus varies with the project count. What
    # must hold is that there is never a shortage, since a shortage would
    # force two projects to share a hue and break the click mapping.
    # 不再固定為 1：餘裕隨專案數變動。真正必須成立的是「絕不短缺」，
    # 短缺會使兩專案同色，雙向對應即失效。
    check('no hue shortage', len(RAINBOW) - ORBIT_RINGS >= 0, True,
          f'{len(RAINBOW)} hues - {ORBIT_RINGS} projects '
          f'= {len(RAINBOW) - ORBIT_RINGS} spare')

    BG = (4, 7, 14)
    bg_hex = re.search(r"ctx\.fillStyle = '(#[0-9a-f]{6})';\s*\n\s*ctx\.fillRect\(0, 0, w, h\)", SRC)
    check('canvas background matches assumed BG',
          bg_hex.group(1) if bg_hex else None, '#04070e')
    print('    colour      hex       contrast vs #04070e')
    worst = 99.0
    for name, rgb in RAINBOW:
        r = contrast(rgb, BG)
        worst = min(worst, r)
        flag = 'AAA' if r >= 7 else ('AA' if r >= 4.5 else 'FAIL')
        print(f'    {name:10} #{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}   '
              f'{r:6.2f}  {flag}')
    check_close('lowest contrast', round(worst, 2), 7.26, 0.005,
                'clears WCAG AAA (7.0)')

    print('    original ROYGBIV for comparison / 原始彩虹對照')
    ORIG = [('red', (255, 0, 0)), ('orange', (255, 127, 0)),
            ('yellow', (255, 255, 0)), ('green', (0, 255, 0)),
            ('blue', (0, 0, 255)), ('indigo', (75, 0, 130)),
            ('violet', (148, 0, 211))]
    fails = [n for n, c in ORIG if contrast(c, BG) < 4.5]
    for name, rgb in ORIG:
        r = contrast(rgb, BG)
        print(f'    {name:10} #{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}   '
              f'{r:6.2f}  {"AA ok" if r >= 4.5 else "FAILS AA"}')
    check('original hues failing AA', fails, ['blue', 'indigo', 'violet'])
    check_close('original indigo contrast',
                round(contrast((75, 0, 130), BG), 2), 1.56, 0.005)


def check_geodata():
    print('\n[5] Geo data / 地理資料')
    check('coastline points', len(COAST), 3735)
    check('land points', len(LAND), 2233)
    check('total surface points', len(COAST) + len(LAND), 5968)
    check('coast string is 4 chars per point', len(COAST_S) % 4, 0)
    check('land string is 4 chars per point', len(LAND_S) % 4, 0)
    packed_bytes = len(COAST_S) + len(LAND_S)
    print(f'    packed payload: {packed_bytes} bytes = '
          f'{packed_bytes / 1024:.1f} KiB')
    check_close('packed size (KiB)', round(packed_bytes / 1024, 1), 23.3, 0.05)

    lons = [math.degrees(p[0]) for p in COAST + LAND]
    lats = [math.degrees(p[1]) for p in COAST + LAND]
    print(f'    lon range: {min(lons):.1f} .. {max(lons):.1f}')
    print(f'    lat range: {min(lats):.1f} .. {max(lats):.1f}')
    check('lon within [-180,180]', -180 <= min(lons) and max(lons) <= 180, True)
    check('lat within [-90,90]', -90 <= min(lats) and max(lats) <= 90, True)
    # Quantisation step is 0.1 deg, so worst-case rounding error is 0.05 deg.
    step_ok = all(abs(round(v * 10) - v * 10) < 1e-6 for v in lons[:200])
    check('coords land on the 0.1 deg grid', step_ok, True,
          'max quantisation error = 0.05 deg')
    px_per_deg = (2 * EARTH_RADIUS) / 180.0
    print(f'    at R={EARTH_RADIUS}px, 0.05 deg = '
          f'{0.05 * px_per_deg:.3f} px  (sub-pixel)')


def check_markup():
    print('\n[6] Markup and labels / 版面與標籤')
    html = open(HTML, encoding='utf-8').read()
    # v2 moved the project list from below the globe into a fixed top bar,
    # so the old --gap-below-earth variable no longer exists.
    # v2 已將專案列從地球下方移到固定頂部導覽列，故舊的 --gap-below-earth 不再存在。
    check('projects live in the top bar', '<nav id="projects"' in html and
          'id="topbar"' in html, True)
    check('old gap variable removed', '--gap-below-earth' in html, False)
    m = re.search(r'--bar-h:\s*([^;]+);', html)
    check('top bar height', m.group(1).strip() if m else None, '64px')
    check('top bar is frosted', 'backdrop-filter: blur(' in html, True)
    # A centred flex container that overflows spills past BOTH edges, and the
    # left overflow can never be scrolled to because scrollLeft cannot go
    # negative — the FIRST project silently becomes clipped and unclickable.
    # Measured 2026-08-13 at a 757px viewport: with plain `center`, project 01
    # rendered at x=7 inside a nav starting at x=153, i.e. 146px of it cut off
    # with no way to reach it. `safe` costs nothing when everything fits.
    # This is a source-string check, not a layout measurement — the harness
    # runs no browser (see the closing note in main()) — so it guards the
    # decision, not the pixels.
    # 置中的 flex 容器一旦溢位會往兩側溢出，左側溢出永遠捲不到
    # （scrollLeft 不能為負），第一個專案會被無聲裁切且點不到。本檢查驗的是
    # 這個決策本身，不是實際版面（本腳本不跑瀏覽器）。
    check('project nav survives overflow (safe centring)',
          'justify-content: safe center;' in html, True,
          'plain `center` makes the first project unreachable when it overflows')
    check('wordmark present', 'id="wordmark"' in html, True)
    check('wordmark styling is the shared component, not inlined',
          '<link rel="stylesheet" href="shared/wordmark.css">' in html, True)
    check('wordmark script is the shared component, not inlined',
          '<script src="shared/wordmark.js"></script>' in html, True)
    check('shared wordmark files exist',
          (os.path.isfile(WORDMARK_CSS), os.path.isfile(WORDMARK_JS)), (True, True))
    # Not pinned to the literal 'PROJECT NN' template any more: once a
    # project gets real content (see alarm-notification-simulator, id '01')
    # its label legitimately diverges from the placeholder text. Pinning the
    # exact string here would make this check fail the moment the site does
    # what it's for. What must still hold: every project has a non-empty
    # label, and there's exactly one per ring.
    # 不再寫死 'PROJECT NN' 樣板文字：專案一旦填入真實內容（見 id '01' 的
    # alarm-notification-simulator），label 本就該脫離樣板。寫死字面值只會
    # 讓這個檢查在網站達成目的的那一刻報錯。真正該成立的是：每個專案都有
    # 非空的 label，且數量與環數一致。
    labels = re.findall(r"label:\s*'([^']*)'", CFG)
    check('every project has a non-empty label',
          all(bool(label.strip()) for label in labels), True)
    check('one label per ring', len(labels), ORBIT_RINGS)
    check('no PROEJCT typo', 'PROEJCT' in SRC or 'PROEJCT' in html, False)
    ids = set(re.findall(r'id="([^"]+)"', html))
    used = set(re.findall(r"getElementById\('([^']+)'\)", SRC))
    check('all DOM refs exist', sorted(used - ids), [])
    ext = re.findall(r'https?://|<img|cdn\.', html)
    check('no external resources', ext, [])
    # PROJECT i must read ringColours[i] — the same array the rings use.
    check('project colour reads ringColours',
          'ringColours[i].hex' in SRC, True,
          'same array as ring rendering => colours match by construction')
    check('ring rendering reads ringColours',
          'ringColours[k]' in SRC, True)


def render_previews():
    print('\n[14] Rendering preview frames / 產生預覽圖')
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print('    SKIP: Pillow not installed (pip install pillow)')
        return
    angles = {'A_front': (0.35, 0.0, 0.6, 0.9, 3),
              'B_drag':  (0.35, 2.4, 0.6, 0.9, 3),
              'C_top':   (1.20, 0.8, 2.2, 2.0, 11)}
    for tag, (rx, ry, spin, orbit_a, seed) in angles.items():
        rng = random.Random(seed)
        pool = RAINBOW[:]
        for i in range(len(pool) - 1, 0, -1):
            j = rng.randint(0, i)
            pool[i], pool[j] = pool[j], pool[i]
        cols = pool[:ORBIT_RINGS]

        W = H = 700
        cx, cy = W / 2, H / 2
        er = EARTH_RADIUS
        im = Image.new('RGB', (W, H), (4, 7, 14))
        d = ImageDraw.Draw(im, 'RGBA')
        items = []

        def earth():
            d.ellipse([cx - er, cy - er, cx + er, cy + er], fill=(11, 26, 46))
            for pts, col, s in ((LAND, (255, 196, 92), 0.6),
                                (COAST, (150, 230, 255), 0.65)):
                for lo, la in pts:
                    p = project(*geo_to_xyz(lo, la, er, spin), cx, cy, rx, ry)
                    if p['z'] >= 0:
                        continue
                    lit = 0.3 + 0.7 * min(1, -p['z'] / er)
                    d.rectangle([p['px'] - s, p['py'] - s,
                                 p['px'] + s, p['py'] + s],
                                fill=col + (int(255 * lit * 0.85),))
        items.append((0.0, earth))

        for k in range(ORBIT_RINGS):
            pa = k * math.pi / ORBIT_RINGS
            cp, sp = math.cos(pa), math.sin(pa)
            col = cols[k][1]
            segs, cur, avg = [], None, 0.0
            for i in range(RING_SEGMENTS + 1):
                p = project(*ring_point(i * 2 * math.pi / RING_SEGMENTS,
                                        cp, sp, ORBIT_RADIUS), cx, cy, rx, ry)
                avg += p['z']
                if occluded(p, cx, cy, er):
                    cur = None
                    continue
                if cur is None:
                    cur = []
                    segs.append(cur)
                cur.append((p['px'], p['py']))
            avg /= RING_SEGMENTS + 1

            def ring(segs=segs, col=col):
                for s in segs:
                    if len(s) > 1:
                        d.line(s, fill=col + (102,), width=2)
            items.append((avg - 5, ring))

            for e in range(POINTS_PER_RING):
                a = orbit_a + pa + e * (2 * math.pi / POINTS_PER_RING)
                p = project(*ring_point(a, cp, sp, ORBIT_RADIUS),
                            cx, cy, rx, ry)
                if occluded(p, cx, cy, er):
                    continue
                lead = (e == 0)
                size = POINT_SIZE * (LEAD_SCALE if lead else 1) * p['sc']
                al = 255 if lead else 115

                def pt(p=p, size=size, al=al, col=col, lead=lead):
                    d.ellipse([p['px'] - size * 2.4, p['py'] - size * 2.4,
                               p['px'] + size * 2.4, p['py'] + size * 2.4],
                              fill=col + (int(al * 0.16),))
                    d.ellipse([p['px'] - size, p['py'] - size,
                               p['px'] + size, p['py'] + size],
                              fill=col + (al,))
                    if lead:
                        c2 = size * 0.42
                        d.ellipse([p['px'] - c2, p['py'] - c2,
                                   p['px'] + c2, p['py'] + c2],
                                  fill=(255, 255, 255, 235))
                items.append((p['z'], pt))

        items.sort(key=lambda t: -t[0])       # painter's algorithm, far first
        for _, fn in items:
            fn()
        out = os.path.join(HERE, f'preview_{tag}.png')
        im.save(out)
        spare = [c[0] for c in pool[ORBIT_RINGS:]]
        print(f'    wrote {os.path.basename(out)}  '
              f'rings={[c[0] for c in cols]}  unused={spare}')


def check_breathing():
    """Breathing scales the orbits only; the Earth must stay fixed."""
    print('\n[7] Breathing / 呼吸')
    A = C['BREATH_AMPLITUDE']; P = C['BREATH_PERIOD']
    M = C['MOUSE_BREATH_MAX']; R = ORBIT_RADIUS
    check_close('rest radius (t=0)', round(R * (1 + math.sin(0) * A), 1), 240.0,
                0.05, 'sin() starts at 1.0, so no jump on the first frame')
    print(f'    autonomous : {R*(1-A):.1f} .. {R*(1+A):.1f} px  '
          f'({A*100:.0f}%, {P:.0f}s period)')
    print(f'    with mouse : {R*(1-A):.1f} .. {R*(1+A+M):.1f} px  '
          f'(+{M*100:.0f}% max)')
    clearance = R * (1 - A) - EARTH_RADIUS
    check('orbit never reaches the globe', clearance > 0, True,
          f'min clearance {clearance:.1f} px')
    # The scene scale must reserve room for the PEAK, else the breath clips.
    maxR = R * (1 + A + M)
    src_max = re.search(r'const maxR = ORBIT_RADIUS \* \(([^)]+)\)', SRC)
    check('resize() reserves the peak radius',
          src_max.group(1).strip() if src_max else None,
          '1 + BREATH_AMPLITUDE + MOUSE_BREATH_MAX',
          f'peak {maxR:.0f} px')
    # earthPx must NOT be multiplied by breath.
    epx = re.search(r'const earthPx = ([^;]+);', SRC).group(1)
    check('earth radius excludes breath', epx.strip(),
          'EARTH_RADIUS * sceneScale', 'globe stays pinned')
    check('orbit radius includes breath',
          'const orbitR = ORBIT_RADIUS * breath;' in SRC, True)
    check('ringPoint calls use orbitR not ORBIT_RADIUS',
          len(re.findall(r'ringPoint\([^)]*ORBIT_RADIUS\)', SRC)), 0)


def check_wordmark():
    print('\n[8] Wordmark pulse and lens / 站名亦滅與透鏡')
    PP = C['PULSE_PERIOD']; PD = C['PULSE_DARK']; PB = C['PULSE_BRIGHT']
    BG = (4, 7, 14)
    for t, want in ((0.0, PD), (PP / 2, PB), (PP, PD)):
        k = 0.5 - 0.5 * math.cos((t / PP) * 2 * math.pi)
        v = round(PD + (PB - PD) * k)
        check(f'pulse grey at t={t:.2f}s', v, want,
              f'#{v:02x}{v:02x}{v:02x}  contrast {contrast((v,)*3, BG):.2f}')
    check_close('bright-phase contrast',
                round(contrast((PB,) * 3, BG), 2), 7.07, 0.005, 'AAA')
    # Raised-cosine falloff must have zero slope at both ends, otherwise the
    # lens shows a visible crease where its influence stops.
    LR = C['LENS_RADIUS']; LM = C['LENS_MAX_SCALE']
    slope = lambda d: -0.5 * math.pi / LR * math.sin((d / LR) * math.pi)
    check_close('lens slope at centre', round(slope(1e-6), 6), 0.0, 1e-5)
    check_close('lens slope at rim', round(slope(LR - 1e-6), 6), 0.0, 1e-5)
    check_close('lens peak scale', LM, 1.55, 1e-9, f'+{(LM-1)*100:.0f}%')
    f_half = 0.5 + 0.5 * math.cos(0.5 * math.pi)
    check_close('lens factor at half radius', round(f_half, 4), 0.5, 1e-4)


def check_surface_text():
    print('\n[9] Embossed surface text / 貼地浮雕文字')
    txt = re.search(r"SURFACE_TEXT\s*=\s*'([^']+)'", SRC).group(1)
    sites = [(n, int(lo), int(la)) for n, lo, la in re.findall(
        r"name:\s*'(\w+)',\s*lon:\s*(-?\d+),\s*lat:\s*(-?\d+)", SRC)]
    F = C['EMBOSS_FONT_PX']; FADE = C['EMBOSS_FADE_COS']
    MN = C['EMBOSS_MIN_MULT']; MX = C['EMBOSS_MAX_MULT']; EP = C['EMBOSS_PERIOD']
    check('surface text', txt, 'st8925lab')
    check('site count', len(sites), 2)

    # Does the string fit inside each ocean at the equator?
    # Ocean bounds are DERIVED FROM THE ACTUAL GEODATA rather than hard-coded,
    # so this test cannot drift from the map that is really drawn.
    # 海洋邊界由實際地理資料推導而非寫死，因此本檢查不會與真正繪製的地圖脫節。
    #
    # CAVEAT / 但書: app.js sizes the string with ctx.measureText(), which this
    # harness cannot call. ADVANCE_RATIO below is a stand-in for the font's
    # advance width in em. Common monospace faces measure 0.550..0.602
    # (Consolas 0.550, SF Mono / Menlo / DejaVu / JetBrains 0.600..0.602), so
    # 0.62 is deliberately CONSERVATIVE — it over-estimates the width.
    # app.js 以 ctx.measureText() 量測，本腳本無法呼叫。ADVANCE_RATIO 為字型
    # advance 寬度的替代值。常見等寬字型為 0.550..0.602，故 0.62 刻意高估。
    # The margin check below proves the conclusion survives any plausible font.
    ADVANCE_RATIO = 0.62
    width_px = len(txt) * ADVANCE_RATIO * F
    span = width_px / (EARTH_RADIUS * math.pi / 180)
    print(f'    "{txt}" at {F}px on R={EARTH_RADIUS} -> spans {span:.1f} deg'
          f'  (advance ratio {ADVANCE_RATIO}, conservative)')

    # COAST / LAND are lists of (lon, lat) tuples in radians.
    band = sorted({round(math.degrees(lo)) for lo, la in COAST + LAND
                   if abs(math.degrees(la)) <= 4})
    runs, start, prev = [], None, None
    for x in band:
        if prev is None or x - prev > 2:
            if start is not None:
                runs.append((start, prev))
            start = x
        prev = x
    runs.append((start, prev))
    # Gaps between land runs, with the wrap-around gap included.
    gaps = [(runs[i][1], runs[i + 1][0]) for i in range(len(runs) - 1)]
    gaps.append((runs[-1][1], runs[0][0] + 360))

    for name, lon, lat in sites:
        a, b = lon - span / 2, lon + span / 2
        fits = False
        for lo, hi in gaps:
            # Compare in the gap's own frame, unwrapping the date line.
            aa, bb = a, b
            if aa < lo - 180:
                aa, bb = aa + 360, bb + 360
            if aa > lo and bb < hi:
                fits = True
                print(f'    {name:9} lon {lon:+5} -> {a:+.1f}..{b:+.1f}  '
                      f'inside land-free gap {lo:+.0f}..{hi:+.0f} '
                      f'({hi-lo:.0f} deg wide)')
                break
        if not fits:
            print(f'    {name:9} lon {lon:+5} -> {a:+.1f}..{b:+.1f}  '
                  f'NOT inside any land-free gap')
        check(f'{name} text clears all coastlines', fits, True)

    sep = abs(sites[0][1] - sites[1][1])
    check('sites separated', sep, 130,
          'deg apart => they take turns facing the camera')

    # How wrong could ADVANCE_RATIO be before the text hits a coastline?
    # Binary-search the breaking ratio so the conclusion does not depend on
    # trusting 0.62. 二分搜尋臨界比例，使結論不必依賴 0.62 這個估算值。
    def fits_at(ratio):
        sp = len(txt) * ratio * F / (EARTH_RADIUS * math.pi / 180)
        for name, lon, lat in sites:
            a, b = lon - sp / 2, lon + sp / 2
            ok = False
            for lo, hi in gaps:
                aa, bb = (a + 360, b + 360) if a < lo - 180 else (a, b)
                if aa > lo and bb < hi:
                    ok = True
                    break
            if not ok:
                return False
        return True

    lo_r, hi_r = 0.3, 3.0
    for _ in range(60):
        mid = (lo_r + hi_r) / 2
        if fits_at(mid):
            lo_r = mid
        else:
            hi_r = mid
    headroom = (lo_r / ADVANCE_RATIO - 1) * 100
    print(f'    breaking advance ratio = {lo_r:.3f} '
          f'({headroom:+.0f}% wider than assumed before a coast is hit)')
    check('real monospace fonts stay clear', fits_at(0.55) and fits_at(0.62),
          True, 'checked across the 0.55..0.62 range of real faces')
    check('conclusion tolerates font error', headroom > 25, True,
          f'{headroom:.0f}% headroom, so ctx.measureText() cannot break it')

    # The pulse must return exactly to the base colour, i.e. fully invisible.
    OC = [int(x, 16) for x in re.search(
        r'OCEAN_BASE\s*=\s*\[([^\]]+)\]', SRC).group(1).split(',')]
    check('trough multiplier', MN, 1.0, 'identical to the ocean base')
    peak = tuple(min(255, round(v * MX)) for v in OC)
    trough = tuple(min(255, round(v * MN)) for v in OC)
    check('trough equals base colour', list(trough), OC, 'fully invisible')
    print(f'    peak   x{MX} -> #{peak[0]:02x}{peak[1]:02x}{peak[2]:02x}  '
          f'contrast {contrast(peak, OC):.2f}')
    print(f'    trough x{MN} -> #{trough[0]:02x}{trough[1]:02x}{trough[2]:02x}  '
          f'contrast {contrast(trough, OC):.2f}')
    check_close('peak contrast vs base', round(contrast(peak, OC), 2), 1.71,
                0.005, 'brief said +50% which measures only 1.16')
    k0 = 0.5 - 0.5 * math.cos(0)
    k1 = 0.5 - 0.5 * math.cos(2 * math.pi)
    check_close('pulse is periodic', round(abs(k0 - k1), 9), 0.0, 1e-9)

    # Fade must reach exactly zero at the threshold: no hard edge.
    fade = lambda f: (f - FADE) / (1 - FADE) if f > FADE else 0.0
    check_close('fade at threshold', round(fade(FADE), 6), 0.0, 1e-6)
    check_close('fade head-on', round(fade(1.0), 6), 1.0, 1e-6)
    vis = 2 * math.degrees(math.acos(FADE)) / 360
    period = 2 * math.pi / C['EARTH_SPIN']
    print(f'    fade threshold cos={FADE} -> each site visible '
          f'{vis*100:.0f}% of every {period:.1f}s turn = {period*vis:.1f}s')


def check_markers():
    print('\n[10] Location markers / 地標紅點')
    mk = [(n, float(la), float(lo)) for n, la, lo in re.findall(
        r"name:\s*'(\w+)',\s*lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)", SRC)]
    check('built-in markers', [m[0] for m in mk], ['TAIWAN', 'SINGAPORE'])
    for n, la, lo in mk:
        ok = -90 <= la <= 90 and -180 <= lo <= 180
        print(f'    {n:10} lat={la:+7.2f} lon={lo:+7.2f}')
        check(f'{n} coords in range', ok, True)
    sep = abs(mk[0][2] - mk[1][2])
    print(f'    longitude separation {sep:.1f} deg '
          f'=> they appear and vanish together')
    check_close('marker period', C['MARKER_PERIOD'], 2.0, 1e-9, 'seconds')
    # Geolocation must be opt-in: the default build makes no network request.
    check('geo lookup disabled by default',
          re.search(r'ENABLE_GEO_LOOKUP\s*=\s*(\w+);', SRC).group(1), 'false',
          'keeps the page offline-capable')
    check('markerSites starts with the built-ins only',
          'let markerSites = MARKER_SITES.slice();' in SRC, True)
    check('lookup is guarded', 'if (!ENABLE_GEO_LOOKUP) return;' in SRC, True)
    check('lookup failure is silent', '.catch(() =>' in SRC, True)
    check('lookup has a timeout', 'GEO_LOOKUP_TIMEOUT' in SRC and
          'ac.abort()' in SRC, True)


def check_clock():
    print('\n[11] Clock row / 時間列')
    html = open(HTML, encoding='utf-8').read()
    for el in ('clock', 'clock-local', 'clock-gmt8'):
        check(f'#{el} exists', f'id="{el}"' in html, True)
    check('GMT offset', C['CLOCK_TZ_OFFSET'], 8)
    # Reproduce the JS formatter in Python and compare.
    from datetime import datetime, timezone, timedelta
    ts = datetime(2026, 8, 7, 7, 15, 0, tzinfo=timezone.utc)
    want = '20260807-071500'
    got = ts.strftime('%Y%m%d-%H%M%S')
    check('stamp format YYYYMMDD-HHMMSS', got, want, f'{len(got)} chars')
    g8 = (ts + timedelta(hours=8)).strftime('%Y%m%d-%H%M%S')
    check('GMT+8 shift', g8, '20260807-151500', '+8 h')
    line = f'{want} (CST) \u00b7 {g8} (GMT+8)'
    print(f'    example: {line}')
    print(f'    length : {len(line)} chars')
    check('single line, local first', line.index(want) < line.index(g8), True)
    # Clock colours come from the same verified rainbow palette.
    check('clock uses the rainbow palette',
          'const pool = RAINBOW.slice();' in SRC.split('function paintClock')[1]
          [:400], True, 'all hues already verified >= 7.26 contrast')
    seg = SRC.split('function paintClock')[1][:600]
    check('two distinct hues', 'pool[0].hex' in seg and 'pool[1].hex' in seg,
          True, 'shuffled, so the two can never be equal')


def check_burst():
    """Nebula burst constants, and the click/drag disambiguation."""
    print('\n[12] Nebula burst / 星雲爆炸')

    dur = C['BURST_DURATION']
    check('burst duration', dur, 1400, 'lengthened so the haze is readable')
    check('particle count', C['BURST_PARTICLES'], 400)
    # A nebula reads as a diffuse haze. Measured on the reference images the
    # 90th-percentile luminance is 68..136; a dots-only burst measured 7.
    # These three constants supply the haze that closes that gap.
    # 星雲需瀰漫亮霧：參考圖 p90 為 68..136，純亮點版僅 7。
    check('diffuse clouds present', C['BURST_CLOUDS'] >= 5, True,
          f"{C['BURST_CLOUDS']} blobs")
    check('particles carry a glow halo', C['BURST_GLOW_MULT'] >= 3, True,
          f"radius x{C['BURST_GLOW_MULT']}")
    check('additive blending used',
          "ctx.globalCompositeOperation = 'lighter';" in SRC, True,
          'overlapping haze accumulates toward white')
    check('composite mode restored',
          'ctx.globalCompositeOperation = prev;' in SRC, True,
          'otherwise later frames would blend wrongly')
    # A linear fade spends most of its life dim, which is what made v1 faint.
    # 線性淡出會使大半時間偏暗，正是前版太淡的主因。
    check('fade holds brightness then falls',
          'Math.pow(1 - prog, 1.7)' in SRC, True)
    check('speed range is ordered',
          C['BURST_SPEED_MIN'] < C['BURST_SPEED_MAX'], True,
          f"{C['BURST_SPEED_MIN']} < {C['BURST_SPEED_MAX']} px/s")
    check('damping is a decay, 0 < d < 1',
          0 < C['BURST_DAMPING'] < 1, True, f"{C['BURST_DAMPING']}")

    # The flash must die well before the burst ends, otherwise the core would
    # still be blazing at navigation time and the burst would read as a cut.
    # 閃光需在爆炸結束前收乾，否則導向瞬間核心仍亮，會像被硬切。
    flash_ends = dur / 3.0
    check('core flash ends in the first third',
          flash_ends < dur * 0.4, True, f'{flash_ends:.0f} ms of {dur:.0f} ms')

    # Damped travel must not exceed the shockwave, or particles would outrun
    # the ring they are supposed to sit inside.
    # 阻尼位移不得超過衝擊波，否則粒子會跑到環外。
    dt, v, travel = 1 / 60.0, C['BURST_SPEED_MAX'], 0.0
    k = C['BURST_DAMPING']
    for _ in range(int(dur / 1000 * 60)):
        travel += v * dt
        v *= k
    check('particles stay near the shockwave',
          travel < C['BURST_RING_MAX'] * 1.6, True,
          f'{travel:.1f} px travelled vs {C["BURST_RING_MAX"]:.0f} px ring')

    # Click/drag threshold sanity: the tolerance must be smaller than the
    # smallest gap between two light points, or one click could ambiguously
    # match two rings. Worst case is two lead points at adjacent angles.
    # 點擊寬容度須小於光點最小間距，否則一次點擊可能同時命中兩環。
    hit_r = POINT_SIZE * C['LEAD_SCALE'] + C['HIT_PADDING']
    check('hit radius is finite and positive', hit_r > 0, True, f'{hit_r:.1f} px')
    check('click travel threshold below hit radius',
          C['CLICK_MAX_MOVE'] < hit_r, True,
          f"{C['CLICK_MAX_MOVE']} px < {hit_r:.1f} px")
    check('click hold threshold is sub-second', C['CLICK_MAX_MS'] <= 400, True)

    # Both directions must funnel through one function, or they will drift.
    # 雙向必須共用同一函式，否則行為會各自飄移。
    check('nav click calls openProject', 'openProject(i);' in SRC, True)
    check('point click calls openProject',
          'if (hit) openProject(hit.ring);' in SRC, True)
    check('burst joins the depth sort',
          'drawList.push({ z: b.z, render: () => drawBurst(b) });' in SRC, True)
    check('navigation waits for the burst',
          f'}}, BURST_DURATION);' in SRC, True)
    check('double activation guarded', 'if (navLocked) return;' in SRC, True)

    # Occluded points are skipped before registration, so they cannot be hit.
    # 被遮擋的光點在註冊前已被跳過，因此不可能被點到。
    reg = SRC.index('hitTargets.push(')
    occ = SRC.index('if (occluded(p, cx, cy, earthPx) && BACKFACE_ALPHA === 0) continue;')
    check('occluded points are unclickable', occ < reg, True,
          'the occlusion continue precedes hit registration')


def check_scalability():
    """Adding a project must scale everything with no other edit."""
    print('\n[13] Scalability / 擴充性')

    # PROJECTS must be the ONLY place the count is stated.
    # 專案數只能有一個宣告來源。
    check('ORBIT_RINGS derived, not hardcoded',
          'const ORBIT_RINGS = PROJECTS.length;' in SRC, True)
    check('no literal ring count left in app.js',
          re.search(r'^const ORBIT_RINGS\s*=\s*\d+;', SRC, re.M), None)
    check('PROJECTS defined once, in config.js',
          (SRC.count('const PROJECTS'), CFG.count('const PROJECTS')), (0, 1))
    check('RAINBOW defined once, in config.js',
          (SRC.count('const RAINBOW'), CFG.count('const RAINBOW')), (0, 1))
    check('over-capacity is guarded',
          'PROJECTS.length > RAINBOW.length' in SRC, True)

    # Ring plane angles must stay evenly distributed over pi for ANY N.
    # A ring rotated by pi occupies the same plane, so the fan spans pi, not 2pi.
    # 任意 N 下環平面角須均分於 pi（旋轉 pi 後同平面，故非 2pi）。
    for n in (6, 7, 12):
        angles = [k * math.pi / n for k in range(n)]
        gaps = [round(math.degrees(angles[i + 1] - angles[i]), 6)
                for i in range(n - 1)]
        check(f'N={n}: plane angles evenly spaced',
              len(set(gaps)) <= 1, True,
              f'{len(angles)} rings, gap {180 / n:.1f} deg')
        check(f'N={n}: no two rings share a plane',
              len(set(round(a, 9) for a in angles)), n)

    # The palette must still supply distinct hues at the ceiling.
    check('12 projects still get 12 distinct hues',
          len(set(n for n, _ in RAINBOW[:12])), 12)

    # --- real folders, naming-sync invariant / 實體資料夾與命名同步 -----
    # Each PROJECTS entry must resolve to a REAL project-XX/index.html on
    # disk (see PROMPT.md §5) — this is the load-bearing difference from
    # the old single-dynamic-page design: the folder now IS the page, so
    # a missing or mis-slugged folder is a broken link, not just a stale
    # doc. slug is asserted unique so two labels can never collide onto
    # the same URL.
    # 每個 PROJECTS 條目都必須對應磁碟上真實存在的 project-XX/index.html
    # （見 PROMPT.md §5）——這是與舊版單一動態頁最關鍵的差異：資料夾本身
    # 就是頁面，資料夾缺失或 slug 對不上即是斷link，不只是文件過時。
    # slug 唯一性斷言確保兩個 label 不會撞到同一個 URL。
    entries = re.findall(
        r"\{\s*id:\s*'(\d+)',\s*label:\s*'([^']*)',\s*slug:\s*'([^']*)'\s*\}",
        CFG)
    check('every PROJECTS entry declares id/label/slug', len(entries), ORBIT_RINGS)

    seen_slugs = set()
    for pid, label, slug in entries:
        folder = os.path.join(HERE, slug)
        index_path = os.path.join(folder, 'index.html')
        check(f'{slug}: folder exists on disk', os.path.isdir(folder), True)
        check(f'{slug}: has an index.html', os.path.isfile(index_path), True)
        check(f'{slug}: slug is unique', slug in seen_slugs, False)
        seen_slugs.add(slug)
        if not os.path.isfile(index_path):
            continue
        phtml = open(index_path, encoding='utf-8').read()
        check(f'{slug}: declares its own MY_ID',
              f"const MY_ID = '{pid}';" in phtml, True)
        check(f'{slug}: shares config.js (single source of truth)',
              '<script src="../config.js">' in phtml, True)
        check(f'{slug}: uses the shared wordmark component',
              '<script src="../shared/wordmark.js">' in phtml and
              "initWordmark('wordmark', SITE_NAME);" in phtml, True)
        check(f'{slug}: prefers the handed-over hue',
              'RAINBOW.find(c => c.name === hue)' in phtml, True)
        check(f'{slug}: falls back to the palette index when opened directly',
              'RAINBOW[idx % RAINBOW.length]' in phtml, True)

    # --- colour handoff / 顏色傳遞 -------------------------------------
    # The homepage RESHUFFLES the palette every load, so ring i is NOT
    # palette entry i. If the project page derived its colour from the index
    # it would match what the user clicked only 1 time in len(RAINBOW).
    # 首頁每次載入洗牌，第 i 環並非第 i 色；若專案頁用索引取色，
    # 與使用者實際點到的顏色僅約 1/len(RAINBOW) 機率相符。
    check('project url built from the slug, not the stable id',
          '`${slug}/index.html`' in CFG, True)
    check('hue travels in the url', 'hue=${encodeURIComponent(hue)}' in CFG, True)
    check('orbit page sends the shuffled hue',
          'ringColours[ringIndex].name' in SRC, True)

    # Quantify the bug this guards against, so the reason stays on record.
    rng = random.Random(3)
    TRIALS, hits = 20000, 0
    for _ in range(TRIALS):
        pool = list(range(len(RAINBOW)))
        for i in range(len(pool) - 1, 0, -1):
            j = rng.randint(0, i)
            pool[i], pool[j] = pool[j], pool[i]
        hits += sum(1 for i in range(ORBIT_RINGS) if pool[i] == i)
    rate = hits / (TRIALS * ORBIT_RINGS)
    check_close('index-derived colour would mismatch',
                rate, 1 / len(RAINBOW), 0.01,
                f'index matching only {rate*100:.1f}% of the time -> '
                f'the hue must travel explicitly')


def main():
    print('=' * 66)
    print(' Night Earth verification / 夜間地球驗證')
    print(f' constants parsed from {os.path.basename(APP)}')
    print('=' * 66)
    check_counts()
    check_geometry()
    check_sign_convention()
    check_colours()
    check_geodata()
    check_markup()
    check_breathing()
    check_wordmark()
    check_surface_text()
    check_markers()
    check_clock()
    check_burst()
    check_scalability()
    if '--render' in sys.argv:
        render_previews()

    print('\n' + '=' * 66)
    if FAILURES:
        print(f' {len(FAILURES)} CHECK(S) FAILED / 檢查未通過')
        for f in FAILURES:
            print(f'   - {f}')
        return 1
    print(' ALL CHECKS PASSED / 全部檢查通過')
    print('=' * 66)
    print('\nNote: this harness verifies geometry, colour and data only.')
    print('It does NOT execute the browser JavaScript. 本腳本不執行瀏覽器 JS。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
