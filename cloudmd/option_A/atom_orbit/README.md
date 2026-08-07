# Electron Orbit — Isolated Program

Electrons orbiting an atomic nucleus, extracted from the original simulator into a standalone program with **all parameters hardcoded** (no sliders, no control panel).

```
6 orbit rings  x  2 electrons per ring  =  12 electrons
```

| File | Track | Output |
|---|---|---|
| `index.html` | Web, interactive | Canvas 2D, drag-to-rotate, continuous rAF. Zero dependencies. |
| `orbit_viewer.py` | Python, interactive | matplotlib `mplot3d` window, 80 frames @ `interval=30` ms |
| `orbit_gif.py` | Python, batch | `electron_orbit.gif`, `fps=30`, written next to the script |
| `electron_orbit.gif` | artifact | 700x700, 80 frames, ~998 KB (pre-rendered) |

GIF timing caveat: `PillowWriter(fps=30)` implies 33.3 ms/frame, but the GIF format stores frame delay in 1/100 s units, so Pillow writes **30 ms**. Actual playback is `80 x 30 ms = 2.4 s` (≈33.3 fps effective). The `2.67 s` the script prints is computed from the requested `fps`, not read back from the file.

---

## Fixed Parameters

Every value is a named constant in one block at the top of each file.

| Parameter | Web (`index.html`) | Python (`orbit_viewer.py`) |
|---|---|---|
| Orbit rings | `ORBIT_RINGS = 6` | `ORBIT_RINGS = 6` |
| Electrons / ring | `ELECTRONS_PER_RING = 2` | `ELECTRONS_PER_RING = 2` |
| **Total electrons** | **12** | **12** |
| Radius | `RADIUS = 240` px | `RADIUS = 1.3` data units |
| Tilt | `TILT_DEG = 65` | `TILT_DEG = 65` |
| Ring alpha | `RING_ALPHA = 0.4` | `RING_ALPHA = 0.4` |
| Ring segments | `120` | `200` |
| Nucleus marker | `NUCLEUS_PX = 14` (x fov) | `NUCLEUS_SIZE = 250` (scatter `s`) |
| Frames | continuous `requestAnimationFrame` | `FRAMES = 80`, `INTERVAL_MS = 30` |
| GIF rate | — | `FPS = 30` (in `orbit_gif.py`) |
| Trail | `15` pts, `TRAIL_DTHETA = 0.04` rad | `15` pts over `TRAIL_SPAN = 0.5` rad |
| Interactivity | full drag + reset | mplot3d rotate only | 

Radius note: you gave a range (100–240 px); **240 px** was selected. It is a single constant — edit `RADIUS` in `index.html:66` to change it.

Trail note: the two trail specs are equivalent by design, not by accident. Web samples 15 points at 0.04 rad spacing = 0.56 rad of arc; Python spreads 15 points across 0.5 rad. Web draws them as fading dots, Python as a single polyline, which is why the sampling is expressed differently.

---

## The Geometry

One function in each file, identical math. A circle in the XY plane is tilted about X by `TILT`, then spun about Z by the ring's `planeAngle`:

```
x0 = R·cos(θ)
y0 = R·sin(θ)

x  = x0·cos(planeAngle) − y0·cos(tilt)·sin(planeAngle)
y  = x0·sin(planeAngle) + y0·cos(tilt)·cos(planeAngle)
z  = y0·sin(tilt)
```

`planeAngle = k·π / 6` for ring `k`, so the 6 rings fan out at **0°, 30°, 60°, 90°, 120°, 150°**. A full turn (`2π`) would duplicate rings — a ring rotated by `π` occupies the same plane — so the fan spans a half turn only.

The 2 electrons on each ring sit `2π / 2 = π` apart (antipodal), plus a per-ring phase of `planeAngle` so rings do not all start in lockstep.

The web version adds a camera and perspective divide that matplotlib handles internally:

```
rotate about Y by rotY  →  rotate about X by rotX
fov   = 600 / (600 + z)
px    = centerX + x·fov
py    = centerY + y·fov
scale = fov              // also drives marker radius and line width
```

---

## Running

### Web

```bash
cd atom_orbit
python3 -m http.server 8000
# open <sCRub_customurl_qLwFxHhTPExdcuqoRk1kbXuAsvDCKywqx8wGWY9pAe2>
```

Also works by opening `index.html` directly via `file://` — it is fully self-contained (no CDN, no external fonts, no `<img>`).

Controls: **drag** to rotate, **double-click** to reset the camera.

### Python

```bash
pip install numpy matplotlib pillow   # pillow only needed for GIF export

python3 orbit_viewer.py               # interactive window
python3 orbit_gif.py                  # writes ./electron_orbit.gif
```

Verified in this workspace with numpy 2.5.1, matplotlib 3.11.1, Pillow 12.3.0.

---

## Verification Performed

- **GIF rendered end-to-end**: 80 frames, 700x700, 1,022,040 bytes. Frame delay read back from the file with PIL: `30 ms` → 2.4 s actual loop (see timing caveat above).
- **Frame 20 rendered to PNG and inspected**: 12 cyan electron markers, 6 ring outlines, red nucleus with glow, trails present. This is a visual judgement, not a machine assertion.
- **Geometry cross-check**: JS `ringPoint()` transcribed to Python and compared against `orbit_viewer.ring_point()` over 6 rings x 2 electrons x 12 frames. Max absolute difference `0.000e+00` — the two tracks are bit-identical in the same units. Ring plane angles confirmed as `0, 30, 60, 90, 120, 150` deg; per-ring electron phase separation confirmed as `pi` (antipodal); `electron_specs` length confirmed as 12.
- **HTML structure**: all tags balanced, no unclosed elements; every `getElementById` target exists in the markup (`c`, `fps`, `wrap`).
- **JS brackets**: string/template/comment-aware scan reports balanced braces, parens, brackets.
- **Not verified**: JS could not be run through a parser or engine — `node --check` aborts in this sandbox with `Cannot load externalized builtin: "internal/deps/cjs-module-lexer/lexer"`, and no deno/bun/esprima is available. The bracket scan is a structural check, not a full parse, and no browser render was captured. Please confirm in a browser.

---

## What Changed vs. the Original

Fixes carried over from the code review, each traceable to a specific problem in the source:

1. **Absolute Windows path removed.** Original `save_orbit_gif.py:83` hardcoded `c:/Users/win87/Desktop/個人網站/circle/electron_orbit.gif`. Now `Path(__file__).resolve().with_name('electron_orbit.gif')` — writes beside the script on any OS.

2. **`blit=False`.** Original passed `blit=True` while mutating `Line3D` artists via `set_3d_properties`. Matplotlib blitting is built for 2D artists; 3D artists need re-projection when the camera moves, so blitting leaves stale pixels during interactive rotation. Correctness over the small speed gain.

3. **Geometry deduplicated.** Original had the same math copied into three files, and it had already drifted (nucleus `s=250` vs `s=280`, ring alpha `0.5` vs `0.45`). Now `orbit_gif.py` imports `orbit_viewer` rather than copying it, so the GIF and the window can never disagree. The JS copy is unavoidable (different language) and is verified equal numerically instead.

4. **Idempotent DPR scaling.** Original `resizeCanvas()` relied on the implicit fact that assigning `canvas.width` resets the transform, so the following `ctx.scale(dpr, dpr)` applied exactly once. Now `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` — safe to call repeatedly regardless of assignment order.

5. **Pointer events instead of mouse events.** Original bound `mousedown`/`mousemove`/`mouseup` with no `pointercancel`, so it was undraggable on touch devices and drag state could stick. Now uses `pointerdown`/`pointermove`/`pointerup`/`pointercancel` with `setPointerCapture`.

6. **Camera pitch clamped.** `rotX` is limited to `±π/2` so the view cannot roll past vertical and invert.

7. **FPS smoothed.** Original `Math.round(1 / delta) || 60` jittered every frame. Now an exponential moving average (`α = 0.1`), with `delta` clamped to 0.1 s so a tab switch does not produce a huge orbital jump.

8. **`Agg` backend set before pyplot import** in `orbit_gif.py`, so batch export never tries to open a display.

---

## Scope of the Model

Classical **Rutherford–Bohr** picture: point electrons on fixed circular tracks. It does **not** model orbitals, probability densities, spin, or shell capacity. "12 electrons" is a visual count, not a physically meaningful electron configuration.

Known rendering limit: ring occlusion uses a painter's algorithm with one mean Z per ring (`index.html`, `avgZ - 5`). Where two tilted rings cross, one ring is drawn entirely in front of the other. Correct per-pixel occlusion needs per-segment splitting or a WebGL depth buffer. With 6 rings this is more visible than with 4.
