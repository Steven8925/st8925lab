"""檢查已發佈頁面的連結完整性與外部相依的釘版本／SRI 狀態。
Check link integrity across published pages, plus pinning/SRI on external deps.

為什麼需要這支腳本 / Why this exists
------------------------------------
站台沒有任何自動化測試，也沒有 CI。連結壞掉只能等人點到才發現 —— 2026-09-24
的盤點就是靠人眼才找到 `/api/flights/status` 這類「設計上就是死的」端點。

這支腳本專門抓三類「本機看起來正常、線上壞掉」的問題：

1. **指向不存在的檔案**：最基本的死連結。
2. **指向存在但不會被發佈的檔案**：`.assetsignore` 把它擋掉了，所以本機開發一切
   正常、線上 404。這一類靠人眼幾乎不可能發現，因為檔案真的在那裡。
3. **指向 Worker 沒有實作的 `/api/*` 路徑**：`worker/index.js` 對 `/api/health`
   以外一律回 404。

同時報告外部 CDN 的釘版本與 SRI 狀態：全站目前 `integrity=` 出現 0 次，任一 CDN
被入侵等於本站被入侵。

用法 / Usage
------------
    python tools/check_links.py

已知限制 / Known limits
-----------------------
以正規表示式掃描，不是完整的 HTML/JS 剖析器。動態組出來的路徑（樣板字串中間插
變數）無法解析，會被標為 dynamic 並略過 —— 明確列出，不假裝檢查過。
外部連結**不發出任何網路請求**，只檢查寫法（是否釘版本、是否有 SRI）。
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

from check_public_surface import load_rules, is_ignored  # noqa: E402

ASSETSIGNORE = os.path.join(ROOT, ".assetsignore")

# href="..." / src="..." / fetch('...')
ATTR_RE = re.compile(r"""\b(?:href|src)\s*=\s*["']([^"']+)["']""")
FETCH_RE = re.compile(r"""\bfetch\(\s*["'`]([^"'`]+)["'`]""")
TAG_RE = re.compile(r"<(?:script|link)\b[^>]*>", re.I)
INTEGRITY_RE = re.compile(r"""\bintegrity\s*=\s*["']([^"']+)["']""", re.I)
URL_IN_TAG_RE = re.compile(r"""\b(?:href|src)\s*=\s*["'](https?://[^"']+)["']""")

API_LITERAL_RE = re.compile(r"""["'`](/api/[A-Za-z0-9/_-]+)""")

SKIP_PREFIX = ("mailto:", "tel:", "data:", "javascript:", "#", "//")

# worker/index.js 實際實作的路徑。
IMPLEMENTED_API = {"/api/health"}


def published_files(rules):
    out = set()
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if d not in {".git", "node_modules", "__pycache__",
                                    ".venv", ".pytest_cache"}]
        for fn in filenames:
            rel = os.path.relpath(os.path.join(dirpath, fn),
                                  ROOT).replace(os.sep, "/")
            if not is_ignored(rel, rules):
                out.add(rel)
    return out


def looks_dynamic(ref):
    """樣板字串／字串串接組出來的路徑，靜態掃描無法解析。

    壓縮後的 bundle 會出現 `+Lt(e)+` 這種片段，那是 JS 串接的殘骸，不是路徑。
    把它們當死連結報出來只會製造雜訊 —— 會亂叫的檢查等於沒有檢查。
    """
    return any(tok in ref for tok in ("${", "<%", "{{", "`", "+"))


def resolve(ref, from_rel):
    """把參照解析成 repo 相對的 POSIX 路徑。"""
    ref = ref.split("?", 1)[0].split("#", 1)[0]
    if not ref:
        return None
    if ref.startswith("/"):
        target = ref.lstrip("/")
    else:
        base = os.path.dirname(from_rel)
        target = os.path.normpath(os.path.join(base, ref)).replace(os.sep, "/")
    if target.startswith(".."):
        return None
    # 目錄式連結 -> index.html
    if target.endswith("/") or target == "":
        target = (target + "index.html").lstrip("/")
    return target


def main():
    rules = load_rules(ASSETSIGNORE)
    pub = published_files(rules)
    pages = sorted(f for f in pub if f.endswith((".html", ".js")))

    print("=" * 78)
    print("連結完整性檢查 / link integrity check")
    print("=" * 78)
    print("掃描 %d 個已發佈的 HTML/JS 檔\n" % len(pages))

    missing, unpublished, dead_api, dynamic = [], [], [], []
    api_refs = {}

    for rel in pages:
        path = os.path.join(ROOT, rel.replace("/", os.sep))
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
        except OSError:
            continue

        # 同網域 API 字面值：端點常被組進變數再交給 fetch（例如
        # `let endpoint = \`/api/flights/status?...\`` ），所以只看 fetch() 的
        # 參數會漏掉。改掃字串字面值。
        for m in API_LITERAL_RE.finditer(text):
            api_refs.setdefault(m.group(1), set()).add(rel)

        refs = set(ATTR_RE.findall(text)) | set(FETCH_RE.findall(text))
        for ref in refs:
            if ref.startswith(("http://", "https://")):
                continue          # 外部相依在第 4 節單獨處理（只看 script/link 標籤）
            if ref.startswith(SKIP_PREFIX):
                continue
            if looks_dynamic(ref):
                dynamic.append((rel, ref))
                continue
            if ref.startswith("/api/"):
                continue          # 第 3 節以字面值掃描統一處理
            target = resolve(ref, rel)
            if target is None:
                continue
            on_disk = os.path.exists(os.path.join(ROOT,
                                                  target.replace("/", os.sep)))
            if not on_disk:
                missing.append((rel, ref, target))
            elif target not in pub:
                unpublished.append((rel, ref, target))

    print("[1] 指向不存在的檔案 / targets that do not exist")
    print("-" * 78)
    if missing:
        for src, ref, tgt in sorted(missing):
            print("  FAIL  %s  ->  %s  (解析為 %s)" % (src, ref, tgt))
    else:
        print("  OK    無死連結")
    print()

    print("[2] 指向存在但不會被發佈的檔案 / exists on disk, excluded from publishing")
    print("-" * 78)
    if unpublished:
        for src, ref, tgt in sorted(unpublished):
            print("  FAIL  %s  ->  %s" % (src, ref))
            print("        %s 存在於磁碟，但被 .assetsignore 排除 -> 線上 404" % tgt)
    else:
        print("  OK    沒有頁面指向被排除的檔案")
    print()

    print("[3] 同網域 /api/* 參照 / same-origin API references  （資訊性，不判定成敗）")
    print("-" * 78)
    print("  worker/index.js 只實作 %s，其餘一律 404。" % ", ".join(sorted(IMPLEMENTED_API)))
    print("  但多數呼叫在執行期會加上 BACKEND_URL 前綴改送 Render —— 是否加前綴")
    print("  取決於執行期變數，靜態掃描無法判定。故本節只列出，不作為閘門；")
    print("  真正的判定屬於執行期／E2E 測試。")
    print()
    for path_ in sorted(api_refs):
        mark = "實作" if path_ in IMPLEMENTED_API else "未實作"
        print("  [%s] %s" % (mark, path_))
        for src in sorted(api_refs[path_])[:2]:
            print("            出現於 %s" % src)
    print()

    print("[4] 外部相依：釘版本與 SRI / external deps: pinning and SRI")
    print("-" * 78)
    # 只看 <script src> 與 <link href> —— 那才是「會執行／會套用」的相依。
    # 一般 <a href> 指向 Google Maps 之類的是使用者連結，不是供應鏈風險。
    sri_by_url = {}
    for rel in pages:
        if not rel.endswith(".html"):
            continue
        path = os.path.join(ROOT, rel.replace("/", os.sep))
        with open(path, encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        for tag in TAG_RE.findall(text):
            m = URL_IN_TAG_RE.search(tag)
            if m and not looks_dynamic(m.group(1)):
                url = m.group(1)
                sri_by_url.setdefault(url, {"sri": False, "where": set()})
                sri_by_url[url]["where"].add(rel)
                if INTEGRITY_RE.search(tag):
                    sri_by_url[url]["sri"] = True

    no_sri = 0
    unpinned = []
    for url in sorted(sri_by_url):
        has_sri = sri_by_url[url]["sri"]
        pinned = bool(re.search(r"@\d+\.\d+\.\d+|/\d+\.\d+\.\d+/|@\d+/", url))
        if not has_sri:
            no_sri += 1
        if not pinned:
            unpinned.append(url)
        print("  %-5s %-5s %s" % ("SRI" if has_sri else "-",
                                  "PIN" if pinned else "-", url))
        for src in sorted(sri_by_url[url]["where"])[:2]:
            print("            引用於 %s" % src)
    print()
    print("  外部相依 %d 個；無 SRI %d 個；未釘版本 %d 個"
          % (len(sri_by_url), no_sri, len(unpinned)))
    print()

    if dynamic:
        print("[5] 動態組成、無法靜態判定 / dynamic, not checked")
        print("-" * 78)
        for src, ref in sorted(set(dynamic))[:15]:
            print("  SKIP  %s  ->  %s" % (src, ref[:60]))
        if len(set(dynamic)) > 15:
            print("  ... 另 %d 個" % (len(set(dynamic)) - 15))
        print()

    problems = []
    if missing:
        problems.append("%d 個死連結" % len(missing))
    if unpublished:
        problems.append("%d 個連結指向被排除的檔案（線上會 404）" % len(unpublished))

    # --- 供應鏈債務的「棘輪」/ supply-chain debt ratchet -------------------
    # 全站目前 0 個 SRI、4 個未釘版本。若現在就讓 CI 因此變紅，CI 會從第一天
    # 就是紅的 —— 那會訓練所有人忽略它，比沒有 CI 更糟。
    # 改為記錄已知的既有債務（baseline），只在**新增**未達標的相依時失敗。
    # 債務本身列在 DEFECTS.md，由 Batch 2 清償；清償後把 baseline 清空即可自動變成嚴格模式。
    baseline_path = os.path.join(ROOT, "tools", "links_baseline.txt")
    known = set()
    if os.path.exists(baseline_path):
        with open(baseline_path, encoding="utf-8") as fh:
            known = {ln.strip() for ln in fh
                     if ln.strip() and not ln.startswith("#")}
    substandard = {u for u in sri_by_url
                   if not sri_by_url[u]["sri"]
                   or not re.search(r"@\d+\.\d+\.\d+|/\d+\.\d+\.\d+/|@\d+/", u)}
    if "--update-baseline" in sys.argv:
        with open(baseline_path, "w", encoding="utf-8", newline="\r\n") as fh:
            fh.write("# 已知未達標的外部相依（無 SRI 或未釘版本）。\n")
            fh.write("# 這是待清償的債務，不是核可清單。清單見 DEFECTS.md S-7d。\n")
            fh.write("# 新增的相依若未達標，CI 會失敗；修好後把該行從這裡刪除。\n")
            for u in sorted(substandard):
                fh.write(u + "\n")
        print("  已更新 baseline：%d 個已知未達標相依" % len(substandard))
    else:
        new_bad = sorted(substandard - known)
        if new_bad:
            print("  新增的未達標相依（不在 baseline 內）：")
            for u in new_bad:
                print("    FAIL  %s" % u)
            problems.append("%d 個**新增**的外部相依沒有 SRI 或沒釘版本" % len(new_bad))
        fixed = sorted(known - substandard)
        if fixed:
            print("  已改善、可從 baseline 移除：")
            for u in fixed:
                print("    OK    %s" % u)
        print("  既有債務 %d 個（記錄於 baseline，由 Batch 2 清償）"
              % len(substandard & known))

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
