#!/usr/bin/env python3
"""Build apps/web (the alarm simulator console) and wire it into the site.

Project 01 (alarm-notification-simulator/) is the one project page that
isn't hand-authored HTML — it's a Vite/React build. Rebuilding it correctly
takes several steps (build with the right base path, inject the site's
shared topbar/wordmark so it matches every other project page, copy the
output into place). This script does all of them in one run so a future
rebuild (e.g. after editing the copied source, or changing the Render
backend URLs) can't accidentally skip a step.

一鍵重建 Project 01 的前端：用正確的 base path 跑 Vite build、把全站共用的
頂列／站名注入進去（讓它跟其他 project 頁一致），再把產出複製到正確位置。
未來要重建（改了 source 底下的程式碼，或換了 Render 後端網址）時，跑這支
腳本即可，不必記住每個步驟。

Usage / 用法:
    python tools/build_alarm_frontend.py

Requires Node.js + npm. Does NOT run `npm install` for you if node_modules
already exists (safe to re-run without re-downloading every time); pass
--install to force a fresh `npm install --ignore-scripts`.

Why --ignore-scripts: apps/api's native deps (better-sqlite3, @node-rs/argon2)
need a C++ build toolchain this workstation doesn't have (no MSVC). We only
need to build apps/web here, which is pure JS/TS — skipping install scripts
avoids a failure that has nothing to do with what we're actually building.
Render's own build (a Linux box with prebuilt native binaries available)
installs apps/api for real, without this flag.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SOURCE_ROOT = HERE / "alarm-notification-simulator" / "source"
WEB_DIST = SOURCE_ROOT / "apps" / "web" / "dist"
LIVE_DIR = HERE / "alarm-notification-simulator"
BASE_PATH = "/alarm-notification-simulator/"

TOPBAR_CSS = """
    /* Injected by tools/build_alarm_frontend.py — same frosted top bar as
       every other project page, so this one doesn't look like a foreign
       page glued onto the site. */
    :root { --bar-h: 64px; --c: #4dabf7; }
    #st8925-topbar {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: var(--bar-h);
        z-index: 999999;
        display: flex;
        align-items: center;
        padding: 0 clamp(1rem, 3vw, 2.25rem);
        background: rgba(4, 7, 14, 0.55);
        backdrop-filter: blur(14px) saturate(120%);
        -webkit-backdrop-filter: blur(14px) saturate(120%);
        border-bottom: 2px solid var(--c);
        font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    }
    #root { padding-top: var(--bar-h); box-sizing: border-box; min-height: 100vh; }
"""

TOPBAR_HTML = (
    '<header id="st8925-topbar">'
    '<a id="wordmark" href="../index.html" aria-label="ST8925 LAB"></a>'
    "</header>\n"
)

# Same hue-handoff convention as every other project page (see
# project-02/index.html): prefer the colour actually clicked on the
# homepage's orbit ring (?hue=), fall back to this project's palette
# index only when opened directly. MY_ID is hardcoded '01' because this
# script only ever builds the one project it belongs to.
HUE_SCRIPT = """
const MY_ID = '01';
const idx  = PROJECTS.findIndex(p => p.id === MY_ID);
const proj = PROJECTS[idx];
const hue = new URLSearchParams(location.search).get('hue');
const col = RAINBOW.find(c => c.name === hue) || RAINBOW[idx % RAINBOW.length];
document.documentElement.style.setProperty('--c', col.hex);
initWordmark('wordmark', SITE_NAME);
"""


def run(cmd: list[str], cwd: Path) -> None:
    print(f"$ {' '.join(cmd)}   (cwd={cwd})")
    subprocess.run(cmd, cwd=cwd, check=True)


def build_frontend(force_install: bool) -> None:
    node_modules = SOURCE_ROOT / "node_modules"
    if force_install or not node_modules.is_dir():
        run(["npm", "install", "--ignore-scripts"], cwd=SOURCE_ROOT)

    npm_exe = "npm.cmd" if sys.platform == "win32" else "npm"
    run(
        [npm_exe, "exec", "-w", "@alarm/web", "--", "vite", "build", f"--base={BASE_PATH}"],
        cwd=SOURCE_ROOT,
    )


def inject_topbar(html: str) -> str:
    if "st8925-topbar" in html:
        return html  # already injected (re-run safety)

    html = html.replace(
        "</head>",
        '<link rel="stylesheet" href="../shared/wordmark.css">\n'
        f"<style>{TOPBAR_CSS}</style>\n</head>",
    )
    html = re.sub(r"(<body[^>]*>)", r"\1\n" + TOPBAR_HTML, html, count=1)
    html = html.replace(
        "</body>",
        '<script src="../config.js"></script>\n'
        '<script src="../shared/wordmark.js"></script>\n'
        f"<script>{HUE_SCRIPT}</script>\n</body>",
    )
    return html


def deploy_build() -> None:
    dist_index = WEB_DIST / "index.html"
    if not dist_index.is_file():
        raise SystemExit(f"ERROR: build output not found at {dist_index}")

    html = dist_index.read_text(encoding="utf-8")
    html = inject_topbar(html)
    (LIVE_DIR / "index.html").write_text(html, encoding="utf-8")

    live_assets = LIVE_DIR / "assets"
    if live_assets.exists():
        shutil.rmtree(live_assets)
    shutil.copytree(WEB_DIST / "assets", live_assets)

    print(f"Deployed: {LIVE_DIR / 'index.html'}")
    print(f"Deployed: {live_assets} ({len(list(live_assets.iterdir()))} files)")


def main() -> None:
    force_install = "--install" in sys.argv
    build_frontend(force_install)
    deploy_build()
    print("\nDone. Run `python verify.py` next.")


if __name__ == "__main__":
    main()
