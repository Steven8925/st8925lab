#!/usr/bin/env python3
"""檢查 Travel-Assistance/tailwind.css 是否仍與 index.html 同步。

為什麼需要這支 / Why this exists
================================
2026-09-24 把 Travel-Assistance/index.html 的 Tailwind Play CDN 換成建置期
產生的 tailwind.css。這個改動本身是對的（Play CDN 官方明載不適用正式環境），
但它引入一個**新的失效模式**：

    有人在 index.html 加了一個 Tailwind class，卻沒有重跑建置。
    那個 class 不會有任何 CSS。**不會報錯，不會有 console 訊息** ——
    只是那個元素的樣式默默掉光。

用 Play CDN 時這個問題不存在（瀏覽器即時編譯）。所以如果不補上這支檢查，
這次改動等於把「執行期第三方相依」換成「靜默樣式漂移」，那不是改善。
Phase 2 的主題是單一真相來源；一個沒有機制保證的產出檔正是它的反面。

做法 / Approach
===============
不重跑 Tailwind（CI 不一定有 node，且父專案 CI 刻意不取 private submodule）。
改為記錄「index.html 的 class 詞彙表」指紋：

    建置時   -> tools/tailwind_classes.sha256 記下當時的詞彙表指紋
    檢查時   -> 重新抽取並比對。不同就代表 markup 的 class 變了，CSS 必須重建。

抽取範圍刻意限制在「一定是 class 的位置」，不是整份檔案做 token 切分：
  1. class="…" / class='…' 屬性內容（含模板字串片段，插值本身剔除）
  2. 變數名含 class/Class 的字串常值（badgeClass、activeClass）
  3. classList.add/remove/toggle/replace('…') 的字串引數
  4. .className = `…` 的模板內容

這樣散文改動不會誤觸。專案已有明確教訓：「一個會亂叫的檢查等於沒有檢查。」
A prose edit must not trip this check, or the check will be ignored.

submodule 不在時回報 SKIP 而非 FAIL —— 父專案 CI 刻意不取它（見
.github/workflows/checks.yml 的說明），把缺席當失敗會讓 CI 天天紅。

離開碼 / Exit codes
===================
0 = 通過或 SKIP    1 = 不同步或設定不一致
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TA = os.path.join(ROOT, "Travel-Assistance")
HTML = os.path.join(TA, "index.html")
CSS = os.path.join(TA, "tailwind.css")
CONFIG = os.path.join(TA, "tailwind.singlefile.config.js")
INPUT = os.path.join(TA, "tailwind.input.css")
FINGERPRINT = os.path.join(ROOT, "tools", "tailwind_classes.sha256")

BUILD_CMD = ("cd Travel-Assistance && npx --yes tailwindcss@3.4.3 "
             "-c tailwind.singlefile.config.js -i tailwind.input.css "
             "-o tailwind.css --minify")


# ── class 詞彙表抽取 ───────────────────────────────────────────────────
def _tokens_from_classlist(text):
    """把一段 class 屬性值切成 token，剔除 ${…} 插值本身。"""
    # 先把插值換成空白：插值的內容（變數名）不是 class
    cleaned = re.sub(r"\$\{[^}]*\}", " ", text)
    return [w for w in cleaned.split() if w]


def extract_class_vocabulary(html):
    """只從「一定是 class 的位置」抽取。回傳排序後的集合。"""
    vocab = set()

    # 1) class="…" / class='…'  （含 HTML 與模板字串中的 class=）
    for m in re.finditer(r'class=\\?"([^"]*)"', html):
        vocab.update(_tokens_from_classlist(m.group(1)))
    for m in re.finditer(r"class=\\?'([^']*)'", html):
        vocab.update(_tokens_from_classlist(m.group(1)))

    # 2) 變數名含 class/Class 的字串常值
    #    例：const badgeClass = 'bg-sky-100 text-sky-800 border-sky-200';
    for m in re.finditer(r"\b\w*[Cc]lass\w*\s*=\s*([^;]{0,400})", html):
        for lit in re.findall(r"'([^'\n]*)'|\"([^\"\n]*)\"", m.group(1)):
            vocab.update(_tokens_from_classlist(lit[0] or lit[1]))
        for lit in re.findall(r"`([^`]*)`", m.group(1)):
            vocab.update(_tokens_from_classlist(lit))

    # 3) classList.add/remove/toggle/replace('…')
    for m in re.finditer(r"classList\.(?:add|remove|toggle|replace)\(([^)]*)\)",
                         html):
        for lit in re.findall(r"'([^'\n]*)'|\"([^\"\n]*)\"", m.group(1)):
            vocab.update(_tokens_from_classlist(lit[0] or lit[1]))
        for lit in re.findall(r"`([^`]*)`", m.group(1)):
            vocab.update(_tokens_from_classlist(lit))

    return sorted(vocab)


def fingerprint_of(vocab):
    h = hashlib.sha256()
    h.update("\n".join(vocab).encode("utf-8"))
    return h.hexdigest()


# ── 主流程 ─────────────────────────────────────────────────────────────
def main():
    print("=" * 78)
    print("Tailwind 建置同步檢查 / tailwind build freshness check")
    print("=" * 78)

    if not os.path.exists(HTML):
        print("\n  SKIP  Travel-Assistance/index.html 不存在。")
        print("        該目錄是 private submodule；父專案 CI 刻意不取它")
        print("        （見 .github/workflows/checks.yml）。缺席不算失敗。")
        return 0

    problems = []

    # [1] 必要檔案
    print("\n[1] 建置檔案是否齊備")
    print("-" * 78)
    for label, path in (("產出 tailwind.css", CSS),
                        ("設定 tailwind.singlefile.config.js", CONFIG),
                        ("輸入 tailwind.input.css", INPUT)):
        exists = os.path.exists(path)
        size = os.path.getsize(path) if exists else 0
        print("  %-5s %-40s %s"
              % ("OK" if exists else "FAIL", label,
                 ("%d bytes" % size) if exists else "缺少"))
        if not exists:
            problems.append("%s 缺少" % label)

    if not os.path.exists(CSS):
        print("\n  產出檔不存在，無法繼續。重建指令：")
        print("    %s" % BUILD_CMD)
        return 1

    # 產出檔太小幾乎一定是建置失敗留下的空殼
    css_size = os.path.getsize(CSS)
    if css_size < 10000:
        print("  FAIL  tailwind.css 只有 %d bytes —— 對這個頁面而言過小，"
              "幾乎一定是建置失敗。" % css_size)
        problems.append("tailwind.css 過小")

    # [2] index.html 的引用方式
    print("\n[2] index.html 是否正確引用（且不再載入 Play CDN）")
    print("-" * 78)
    html = open(HTML, encoding="utf-8").read()

    links_css = 'href="tailwind.css"' in html
    print("  %-5s <link rel=\"stylesheet\" href=\"tailwind.css\">"
          % ("OK" if links_css else "FAIL"))
    if not links_css:
        problems.append("index.html 沒有引用 tailwind.css")

    loads_cdn = ('src="https://cdn.tailwindcss.com' in html
                 or "src='https://cdn.tailwindcss.com" in html)
    print("  %-5s 不再載入 cdn.tailwindcss.com" % ("FAIL" if loads_cdn else "OK"))
    if loads_cdn:
        problems.append("index.html 仍載入 Play CDN")

    # 層疊順序：<link> 必須在那段 inline <style> 之後，否則 utility 會被
    # 自訂樣式壓過去（Play CDN 是執行期附加，天然排在最後）。
    i_link = html.find('href="tailwind.css"')
    i_style_end = html.rfind("</style>", 0, html.find("</head>"))
    order_ok = i_link > i_style_end > 0
    print("  %-5s <link> 位於 inline </style> 之後（重現 Play CDN 的層疊順序）"
          % ("OK" if order_ok else "FAIL"))
    if not order_ok:
        problems.append("tailwind.css 的引用位置會改變層疊順序")

    # [3] class 詞彙表指紋
    print("\n[3] class 詞彙表是否與上次建置相同")
    print("-" * 78)
    vocab = extract_class_vocabulary(html)
    fp = fingerprint_of(vocab)
    print("  詞彙表 token 數 : %d" % len(vocab))
    print("  目前指紋        : %s" % fp[:16])

    if not os.path.exists(FINGERPRINT):
        print("  FAIL  找不到 %s" % os.path.relpath(FINGERPRINT, ROOT))
        print("        首次建立請執行：")
        print("          python tools/check_tailwind_build.py --write-fingerprint")
        problems.append("缺少指紋基準檔")
    else:
        recorded = open(FINGERPRINT, encoding="utf-8").read().split()[0].strip()
        print("  記錄的指紋      : %s" % recorded[:16])
        if recorded == fp:
            print("  OK    相同 —— markup 的 class 詞彙未變，tailwind.css 仍有效")
        else:
            print("  FAIL  不同 —— index.html 的 class 詞彙變了，"
                  "tailwind.css 可能缺少新 class")
            print()
            print("        這正是本檢查存在的理由：缺少的 class**不會報錯**，")
            print("        只會讓某些元素的樣式默默掉光。請重建：")
            print("          %s" % BUILD_CMD)
            print("        重建並在瀏覽器確認後，更新指紋：")
            print("          python tools/check_tailwind_build.py --write-fingerprint")
            problems.append("class 詞彙表與上次建置不符")

    print()
    print("=" * 78)
    if problems:
        print("未通過項目 %d：" % len(problems))
        for p in problems:
            print("  - %s" % p)
        return 1
    print("全部通過。")
    return 0


def write_fingerprint():
    if not os.path.exists(HTML):
        print("index.html 不存在（submodule 未取出），無法寫入指紋。")
        return 1
    html = open(HTML, encoding="utf-8").read()
    vocab = extract_class_vocabulary(html)
    fp = fingerprint_of(vocab)
    body = ("%s\n"
            "\n"
            "# Travel-Assistance/index.html 的 class 詞彙表 SHA-256。\n"
            "# 由 tools/check_tailwind_build.py --write-fingerprint 產生。\n"
            "# 只有在重建過 tailwind.css **並且在瀏覽器確認過**之後才該更新這個值。\n"
            "# 先更新指紋再重建，等於把檢查關掉。\n"
            "# token 數：%d\n") % (fp, len(vocab))
    # 與 repo 其餘文字檔一致採 CRLF
    open(FINGERPRINT, "wb").write(body.replace("\n", "\r\n").encode("utf-8"))
    print("已寫入 %s" % os.path.relpath(FINGERPRINT, ROOT))
    print("  指紋    : %s" % fp)
    print("  token 數: %d" % len(vocab))
    return 0


if __name__ == "__main__":
    if "--write-fingerprint" in sys.argv:
        sys.exit(write_fingerprint())
    sys.exit(main())
