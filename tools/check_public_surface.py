"""檢查「實際會被公開發佈的檔案」是否與預期一致。
Check that the set of publicly published files matches what we expect.

為什麼需要這支腳本 / Why this exists
------------------------------------
`wrangler.jsonc` 的 `assets.directory` 是 `"."`，所以**整個 repo 根就是網站根目錄**。
一個檔案會不會被全世界下載，取決於 `.assetsignore` 這一份規則檔 —— 而 2026-09-23 與
2026-09-24 兩次盤點都發現有東西漏掉了（`/.git/config` 回 HTTP 200、backend 原始碼、
`.agentMemory/`、根目錄 `.env` 規則整個缺席）。

人眼複查一份 136 行的 ignore 檔、對上千個檔案，不可能可靠。依山姆哥裁示 5B：
**能機器判定的一律腳本化，以離開碼判定。**

The repo root IS the web root, so whether a file is downloadable by anyone depends
entirely on `.assetsignore`. Two separate audits found gaps in it. Reviewing a
136-line ignore file against a thousand files by eye is not a control; this is.

判定方式 / What it checks
-------------------------
1. **型別黑名單**：任何會被發佈的 `.py` / `.md` / `.yaml` / `.env` / dotfile 等，
   一律視為失敗。這是不需要維護清單就能擋住的那一類回歸。
2. **快照比對**：與 `tools/published_manifest.txt` 比對。新增任何檔案到公開面都會
   被指出來，要求人為確認後以 `--update` 更新快照。
3. **自我測試**：先用幾個「已知答案」驗證比對器本身是否正確（例如 `.git` 必須被排除、
   `index.html` 必須被發佈、`cloudmd/option_C/public/robots.txt` 必須**仍然**被排除
   —— 那是 `.assetsignore:104-111` 記載過的負向規則陷阱）。比對器錯了就先報自己。

用法 / Usage
------------
    python tools/check_public_surface.py            # 檢查，離開碼判定
    python tools/check_public_surface.py --update   # 覆核後更新快照

已知限制 / Known limits
-----------------------
本檔自行實作 gitignore 語意的一個子集（`#` 註解、`!` 反向、前導 `/` 錨定、
結尾 `/` 限目錄、`*` 不跨越 `/`、`**` 跨越）。它不是 Cloudflare 的實作，
也沒有呼叫 wrangler。因此它能抓回歸，但**不能證明**線上狀態 ——
線上狀態只能靠實際 HTTP 請求確認。這一點不隱瞞。
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETSIGNORE = os.path.join(ROOT, ".assetsignore")
MANIFEST = os.path.join(ROOT, "tools", "published_manifest.txt")

# 永遠不該出現在公開面的副檔名／檔名型態。
FORBIDDEN_EXT = {
    ".py", ".pyc", ".md", ".txt", ".yaml", ".yml", ".toml", ".ini", ".cfg",
    ".sql", ".sh", ".ps1", ".bat", ".env", ".pem", ".key", ".log", ".zip",
}
# 型別黑名單的例外：這些是刻意公開的根目錄 SEO 檔案。
FORBIDDEN_EXEMPT = {"robots.txt", "llms.txt", "sitemap.xml"}

# 走訪時完全跳過（.git 內有上萬個檔案，且 .assetsignore 已排除）。
HARD_SKIP = {".git", "node_modules", "__pycache__", ".venv", ".pytest_cache"}


# --------------------------------------------------------------------------
# gitignore 語意子集
# --------------------------------------------------------------------------
def _translate(pattern):
    """把單一 gitignore 樣式轉成正規表示式（對 POSIX 風格相對路徑比對）。"""
    anchored = pattern.startswith("/")
    dir_only = pattern.endswith("/")
    pat = pattern.strip("/") if anchored else pattern.rstrip("/")
    if anchored:
        pat = pattern[1:].rstrip("/")

    has_slash = "/" in pat
    out, i = [], 0
    while i < len(pat):
        ch = pat[i]
        if ch == "*":
            if pat[i:i + 2] == "**":
                out.append(".*")
                i += 2
                if i < len(pat) and pat[i] == "/":
                    i += 1
                continue
            out.append("[^/]*")
        elif ch == "?":
            out.append("[^/]")
        elif ch == "[":
            j = pat.find("]", i)
            if j == -1:
                out.append(re.escape(ch))
            else:
                out.append(pat[i:j + 1])
                i = j
        else:
            out.append(re.escape(ch))
        i += 1
    body = "".join(out)

    # 無斜線的樣式可匹配任意層級的該名稱；有斜線者錨定於根。
    prefix = "" if (anchored or has_slash) else "(?:.*/)?"
    # dir_only 只匹配目錄（或其底下的東西）；否則檔案或目錄皆可。
    suffix = "/.*" if dir_only else "(?:/.*)?"
    return re.compile("^" + prefix + body + suffix + "$")


def load_rules(path):
    rules = []
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n").rstrip("\r")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            negate = line.startswith("!")
            if negate:
                line = line[1:]
            rules.append((negate, _translate(line), line))
    return rules


def _match_last(relposix, rules):
    """最後一條命中的規則決定結果（gitignore 語意）。"""
    ignored = False
    for negate, rx, _ in rules:
        if rx.match(relposix):
            ignored = not negate
    return ignored


def is_ignored(relposix, rules):
    """判定是否被排除，含 gitignore 的「父目錄已排除就無法反向再納入」規則。

    git 明訂：It is not possible to re-include a file if a parent directory of
    that file is excluded。少了這條，一個未錨定的 `!foo` 會看起來能把被整層
    排除的目錄裡的檔案救回來 —— 那正是 .assetsignore:104-111 記載過的陷阱。
    """
    parts = relposix.split("/")
    for i in range(1, len(parts)):
        ancestor = "/".join(parts[:i])
        if _match_last(ancestor, rules):
            return True
    return _match_last(relposix, rules)


# --------------------------------------------------------------------------
def walk_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in HARD_SKIP]
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
            yield rel


def published(rules):
    return sorted(r for r in walk_files() if not is_ignored(r, rules))


# --------------------------------------------------------------------------
SELF_TESTS = [
    # (相對路徑, 應否被排除, 這條測試在防什麼)
    (".git/config", True, ".assetsignore:57-60 記載它曾回 HTTP 200"),
    (".env", True, "2026-09-24 新增的根目錄規則（S-1）"),
    (".env.example", False, "!.env.example 反向規則必須生效"),
    ("worker/index.js", True, "Worker 原始碼由 Worker 執行，不該再當靜態檔"),
    ("render.yaml", True, "含服務設定"),
    ("tools/check_public_surface.py", True, "tools/ 整層排除"),
    ("README.md", True, "*.md 全域排除"),
    ("robots.txt", False, "!/robots.txt 根目錄例外"),
    ("cloudmd/option_C/public/robots.txt", True,
     ".assetsignore:104-111 記載的陷阱：未錨定的 !robots.txt 會破壞 cloudmd/ 排除"),
    ("index.html", False, "首頁必須被發佈"),
    ("config.js", False, "首頁相依"),
    ("shared/wordmark.css", False, "唯一真正共用的 CSS"),
]


def run_self_tests(rules):
    print("[0] 比對器自我測試 / matcher self-test")
    print("-" * 78)
    bad = 0
    for rel, want_ignored, why in SELF_TESTS:
        got = is_ignored(rel, rules)
        ok = got == want_ignored
        if not ok:
            bad += 1
        print("  %-5s %-44s 預期%s 實得%s  %s"
              % ("OK" if ok else "FAIL", rel,
                 "排除" if want_ignored else "發佈",
                 "排除" if got else "發佈",
                 "" if ok else "<- " + why))
    print()
    return bad


def main():
    update = "--update" in sys.argv
    rules = load_rules(ASSETSIGNORE)
    print("=" * 78)
    print("公開暴露面檢查 / public surface check")
    print("=" * 78)
    print("規則來源 .assetsignore：%d 條有效規則\n" % len(rules))

    if run_self_tests(rules):
        print("ABORT: 比對器自己就不正確，後面的結論一律不可信。")
        return 2

    files = published(rules)
    total = sum(os.path.getsize(os.path.join(ROOT, f)) for f in files
                if os.path.exists(os.path.join(ROOT, f)))
    print("[1] 會被發佈的檔案：%d 個，合計 %.2f MB" % (len(files), total / 1048576))
    print("-" * 78)
    # 快照不存在時必須把清單印出來 —— 否則「先人工覆核上面的清單」是句空話。
    # 有快照時保持安靜，讓 CI 輸出聚焦在差異上。
    if not os.path.exists(MANIFEST) or "--list" in sys.argv:
        for rel in files:
            size = os.path.getsize(os.path.join(ROOT, rel))
            print("  %9d  %s" % (size, rel))
    else:
        print("  （已有快照，僅在第 3 節顯示差異；要看完整清單用 --list）")
    print()

    problems = []

    print("[2] 型別黑名單 / forbidden file types")
    print("-" * 78)
    offenders = []
    for rel in files:
        name = rel.rsplit("/", 1)[-1]
        if name in FORBIDDEN_EXEMPT:
            continue
        ext = os.path.splitext(name)[1].lower()
        if ext in FORBIDDEN_EXT or name.startswith("."):
            offenders.append(rel)
    if offenders:
        for rel in offenders[:40]:
            print("  FAIL  %s" % rel)
        if len(offenders) > 40:
            print("  ... 另 %d 個" % (len(offenders) - 40))
        problems.append("%d 個不該公開的型別出現在公開面" % len(offenders))
    else:
        print("  OK    沒有 .py/.md/.yaml/.env/dotfile 被發佈")
    print()

    print("[3] 與快照比對 / manifest diff")
    print("-" * 78)
    if update:
        with open(MANIFEST, "w", encoding="utf-8", newline="\r\n") as fh:
            fh.write("# 由 tools/check_public_surface.py --update 產生。\n")
            fh.write("# 這是「目前會被公開發佈的檔案」快照；任何新增都必須經人覆核。\n")
            fh.write("# Snapshot of what is publicly published. Any addition needs review.\n")
            for rel in files:
                fh.write(rel + "\n")
        print("  已更新快照：%d 個項目" % len(files))
        print("  （--update 只更新快照，不代表內容已被覆核）")
    elif not os.path.exists(MANIFEST):
        print("  快照不存在。先人工覆核上面的清單，再執行 --update 建立。")
        problems.append("尚未建立 published_manifest.txt 快照")
    else:
        with open(MANIFEST, encoding="utf-8") as fh:
            snap = [ln.strip() for ln in fh
                    if ln.strip() and not ln.startswith("#")]
        added = [f for f in files if f not in set(snap)]
        removed = [f for f in snap if f not in set(files)]
        for rel in added:
            print("  NEW   %s   <- 新增到公開面，需覆核" % rel)
        for rel in removed:
            print("  GONE  %s   <- 已不再發佈" % rel)
        if added:
            problems.append("%d 個檔案新增到公開面且未覆核" % len(added))
        if not added and not removed:
            print("  OK    與快照一致（%d 個項目）" % len(snap))
    print()

    print("=" * 78)
    if problems:
        print("未通過項目 %d：" % len(problems))
        for p in problems:
            print("  - %s" % p)
        print()
        print("提醒：.assetsignore 只擋靜態資產發佈，擋不住 GitHub。")
        print("本 repo 為 public，真正的外洩必須靠更換金鑰解決。")
        return 1
    print("全部通過。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
