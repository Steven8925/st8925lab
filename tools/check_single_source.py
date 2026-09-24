"""檢查「單一真理源」的宣稱是否成立。
Check that the claimed single sources of truth actually are single.

為什麼需要這支腳本 / Why this exists
------------------------------------
`config.js` 宣稱新增專案「只要改這裡」。2026-09-24 盤點發現那不是真的：
`app.js` 的 `RESPONSIVE_LABELS` 以相同的 id 為鍵另建了一份硬編碼表，新增專案時
會靜默落到 `P<id>` 後備值 —— 不會報錯，只會顯示錯的名字。

同樣地 `ST8925-LAB-standalone.html` 由 `make_standalone.py` 產生，內含 `PROJECTS`
與 `RAINBOW` 的完整複本，但**沒有任何機制確保它與來源同步**。

「改 A 壞 B」是多份真理源的必然結果。這支腳本把「是否真的只有一份」變成可判定的事。

用法 / Usage
------------
    python tools/check_single_source.py

已知限制 / Known limits
-----------------------
以正規表示式讀取 JS 常值，不是 JS 剖析器。只驗證 id 集合與數量是否一致，
不驗證標籤文字是否恰當。不執行 `make_standalone.py`（執行會覆寫檔案）。
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CONFIG = os.path.join(ROOT, "config.js")
APP = os.path.join(ROOT, "app.js")
STANDALONE = os.path.join(ROOT, "ST8925-LAB-standalone.html")

ID_RE = re.compile(r"""id:\s*['"](\d+)['"]""")
SLUG_RE = re.compile(r"""slug:\s*['"]([^'"]+)['"]""")
LABEL_KEY_RE = re.compile(r"""^\s*['"]?(\d{2})['"]?\s*:\s*\{""", re.M)


def read(path):
    with open(path, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def block(text, start_marker, open_ch="[", close_ch="]"):
    """從 start_marker 起擷取一段平衡括號的常值。"""
    i = text.find(start_marker)
    if i == -1:
        return None
    j = text.find(open_ch, i)
    if j == -1:
        return None
    depth, k = 0, j
    while k < len(text):
        if text[k] == open_ch:
            depth += 1
        elif text[k] == close_ch:
            depth -= 1
            if depth == 0:
                return text[j:k + 1]
        k += 1
    return None


def main():
    problems = []
    print("=" * 78)
    print("單一真理源檢查 / single-source-of-truth check")
    print("=" * 78)

    cfg = read(CONFIG)
    app = read(APP)

    projects_block = block(cfg, "const PROJECTS")
    if projects_block is None:
        print("ABORT: 在 config.js 找不到 PROJECTS 常值")
        return 2
    cfg_ids = ID_RE.findall(projects_block)
    cfg_slugs = SLUG_RE.findall(projects_block)

    print("\n[1] config.js 的 PROJECTS（宣稱的唯一來源）")
    print("-" * 78)
    for i, (pid, slug) in enumerate(zip(cfg_ids, cfg_slugs)):
        print("  %s  %s" % (pid, slug))
    print("  共 %d 筆" % len(cfg_ids))

    print("\n[2] app.js 的 RESPONSIVE_LABELS（第二份以相同 id 為鍵的表）")
    print("-" * 78)
    labels_block = block(app, "RESPONSIVE_LABELS", "{", "}")
    if labels_block is None:
        print("  找不到 RESPONSIVE_LABELS —— 若已移除，這正是我們要的結果。")
        label_ids = []
    else:
        label_ids = LABEL_KEY_RE.findall(labels_block)
        print("  鍵：%s（共 %d 筆）" % (", ".join(label_ids), len(label_ids)))

    if labels_block is not None:
        missing = [i for i in cfg_ids if i not in label_ids]
        extra = [i for i in label_ids if i not in cfg_ids]
        if missing:
            print("  FAIL  PROJECTS 有但 RESPONSIVE_LABELS 沒有：%s" % ", ".join(missing))
            print("        這些專案會靜默落到 'P<id>' 後備值，不會報錯。")
            problems.append("RESPONSIVE_LABELS 缺 %d 個 id" % len(missing))
        if extra:
            print("  FAIL  RESPONSIVE_LABELS 有但 PROJECTS 沒有：%s" % ", ".join(extra))
            problems.append("RESPONSIVE_LABELS 多出 %d 個 id" % len(extra))
        if not missing and not extra:
            print("  OK    id 集合一致（但這仍是兩份表；一致只是現在剛好同步）")

    print("\n[3] 專案資料夾是否存在 / project folders exist")
    print("-" * 78)
    # Travel-Assistance 是 **私有** submodule（2026-09-24 查證：parent 為 PUBLIC，
    # submodule 為 PRIVATE）。沒有授權的環境（例如 CI 的預設 GITHUB_TOKEN）
    # clone 不到它，資料夾會是空的。那不是「檔案遺失」，是「取不到」——
    # 兩者必須分開報告，否則 CI 會為了一個環境限制而永遠紅燈。
    ta_dir = os.path.join(ROOT, "Travel-Assistance")
    ta_absent = (not os.path.isdir(ta_dir)) or not os.listdir(ta_dir)
    if ta_absent:
        print("  注意：Travel-Assistance submodule 未取出（私有 repo，此環境無權限）。")
        print("        該專案的檢查標為 SKIP，不計為失敗。")
    for pid, slug in zip(cfg_ids, cfg_slugs):
        page = os.path.join(ROOT, slug, "index.html")
        ok = os.path.exists(page)
        if not ok and slug == "Travel-Assistance" and ta_absent:
            print("  SKIP  %s/index.html（submodule 未取出）" % slug)
            continue
        if not ok:
            problems.append("%s (%s) 沒有 index.html" % (pid, slug))
        print("  %-5s %s/index.html" % ("OK" if ok else "FAIL", slug))

    print("\n[4] ST8925-LAB-standalone.html 是否與來源同步")
    print("-" * 78)
    if not os.path.exists(STANDALONE):
        print("  檔案不存在，略過。")
    else:
        sa = read(STANDALONE)
        sa_block = block(sa, "const PROJECTS")
        if sa_block is None:
            print("  FAIL  standalone 內找不到 PROJECTS 常值")
            problems.append("standalone 內找不到 PROJECTS")
        else:
            sa_ids = ID_RE.findall(sa_block)
            sa_slugs = SLUG_RE.findall(sa_block)
            same = (sa_ids == cfg_ids and sa_slugs == cfg_slugs)
            print("  standalone 的 PROJECTS：%d 筆" % len(sa_ids))
            if same:
                print("  OK    與 config.js 一致")
                print("        （注意：一致不等於有機制保證一致。standalone 是")
                print("        make_standalone.py 產生的凍結分支，本檢查就是那個缺少的機制。）")
            else:
                print("  FAIL  與 config.js 不一致")
                print("        config.js : %s" % ", ".join(cfg_slugs))
                print("        standalone: %s" % ", ".join(sa_slugs))
                print("        請重跑 python make_standalone.py")
                problems.append("standalone 與 config.js 不同步")

    print()
    print("=" * 78)
    if problems:
        print("未通過項目 %d：" % len(problems))
        for p in problems:
            print("  - %s" % p)
        return 1
    print("全部通過。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
