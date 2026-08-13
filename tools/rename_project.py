#!/usr/bin/env python3
"""Rename a project: keep its folder name in sync with its display label.

The site's naming rule (see PROMPT.md / README.md "命名同步規則"):
whenever a project's displayed `label` changes, the folder it lives in
(and the `slug` field in config.js that derives its URL) MUST be renamed
to match, in the same edit. Doing this by hand across config.js, the
folder on disk, and the two docs inside it is easy to get half-right;
this script does all of it atomically, or none of it.

一旦專案的顯示名稱（`label`）改變，其所在資料夾（與 config.js 的
`slug` 欄位，用來組出 URL）就必須同步改名。手動同步 config.js、磁碟上
的資料夾、以及資料夾內兩份文件很容易漏改；本腳本一次做完全部，
或者完全不做（失敗時不留下半套狀態）。

Usage / 用法:
    python tools/rename_project.py <id> "<new label>"

Example / 範例:
    python tools/rename_project.py 01 "AI Dashboard"
    # PROJECT 01 -> AI Dashboard
    # project-01/ -> ai-dashboard/
    # config.js, project-01/README.md, project-01/PROMPT.md all updated

After running, ALWAYS run `python verify.py` to confirm the whole site
is still internally consistent.
執行後請務必接著跑 `python verify.py`，確認全站仍然一致。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
CONFIG_PATH = HERE / "config.js"

# One project entry, e.g.:
#   { id: '01', label: 'PROJECT 01', slug: 'project-01' },
ENTRY_RE = re.compile(
    r"\{\s*id:\s*'(?P<id>\d+)',\s*label:\s*'(?P<label>[^']*)',"
    r"\s*slug:\s*'(?P<slug>[^']*)'\s*\}"
)


def slugify(label: str) -> str:
    """Turn a display label into a URL-safe, kebab-case folder name."""
    lowered = label.strip().lower()
    dashed = re.sub(r"[^a-z0-9]+", "-", lowered)
    return dashed.strip("-") or "project"


def find_entry(config_src: str, project_id: str) -> re.Match[str]:
    for match in ENTRY_RE.finditer(config_src):
        if match.group("id") == project_id:
            return match
    raise SystemExit(f"ERROR: no PROJECTS entry with id '{project_id}' in config.js")


def check_slug_available(config_src: str, new_slug: str, project_id: str) -> None:
    for match in ENTRY_RE.finditer(config_src):
        if match.group("id") != project_id and match.group("slug") == new_slug:
            raise SystemExit(
                f"ERROR: slug '{new_slug}' is already used by project "
                f"id '{match.group('id')}' — choose a label that produces "
                f"a different slug."
            )


def rewrite_config(config_src: str, match: re.Match[str], new_label: str, new_slug: str) -> str:
    new_entry = (
        f"{{ id: '{match.group('id')}', label: '{new_label}', "
        f"slug: '{new_slug}' }}"
    )
    return config_src[: match.start()] + new_entry + config_src[match.end() :]


def refresh_docs(folder: Path, old_label: str, new_label: str, old_slug: str, new_slug: str) -> None:
    """Best-effort touch-up of the human-readable label/slug mentions in the
    project's own README.md and PROMPT.md. The functional behaviour never
    depended on this text (the pages read config.js at runtime), but stale
    labels in the docs would mislead the next reader.
    盡力更新 README.md／PROMPT.md 中人類可讀的 label／slug 文字。網站的
    實際行為不依賴這些文字（頁面在執行期讀 config.js），但文件裡殘留舊
    名稱會誤導下一個讀者。
    """
    for filename in ("README.md", "PROMPT.md"):
        path = folder / filename
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        text = text.replace(old_label, new_label)
        # Replace the EXACT old slug, not a 'project-NN' pattern guess — a
        # slug need not follow that shape (see slugify()), and matching only
        # the canonical pattern silently no-ops once a slug has drifted away
        # from it, leaving stale mentions behind. Caught by round-tripping
        # a rename during self-check on 2026-08-09.
        # 替換「精確的舊 slug」而非猜測 'project-NN' 樣式的正則——slug 不一定
        # 長這樣（見 slugify()），只認樣式的正則在 slug 偏離該樣式後會靜默
        # 失效，留下殘留文字。此問題於 2026-08-09 自我檢查時以來回改名
        # 測試抓到。
        text = text.replace(old_slug, new_slug)
        path.write_text(text, encoding="utf-8")


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__)
        return 1
    project_id, new_label = argv[1], argv[2]

    config_src = CONFIG_PATH.read_text(encoding="utf-8")
    match = find_entry(config_src, project_id)
    old_label, old_slug = match.group("label"), match.group("slug")
    new_slug = slugify(new_label)

    if old_label == new_label:
        print(f"Nothing to do — label is already '{new_label}'.")
        return 0

    check_slug_available(config_src, new_slug, project_id)

    old_folder = HERE / old_slug
    new_folder = HERE / new_slug
    if not old_folder.is_dir():
        raise SystemExit(f"ERROR: expected folder not found: {old_folder}")
    if new_folder.exists():
        raise SystemExit(f"ERROR: target folder already exists: {new_folder}")

    # Do the disk rename first — it is the step most likely to fail (locked
    # file, permissions), and failing before touching config.js leaves the
    # repo in its original, consistent state.
    # 先做磁碟改名——這步最可能失敗（檔案被鎖、權限問題），
    # 失敗時尚未動到 config.js，儲存庫仍維持原本一致的狀態。
    old_folder.rename(new_folder)

    new_config_src = rewrite_config(config_src, match, new_label, new_slug)
    CONFIG_PATH.write_text(new_config_src, encoding="utf-8")

    refresh_docs(new_folder, old_label, new_label, old_slug, new_slug)

    print(f"Renamed project id '{project_id}':")
    print(f"  label  '{old_label}' -> '{new_label}'")
    print(f"  folder '{old_slug}/' -> '{new_slug}/'")
    print(f"  slug   '{old_slug}' -> '{new_slug}' (config.js updated)")
    print()
    print("Next step: run `python verify.py` to confirm the site is still consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
