"""比對 st-development skill 的兩份副本內容是否一致（忽略行尾差異）。
Compare the two copies of the st-development skill, ignoring line-ending differences.

為什麼需要這支腳本 / Why this exists
------------------------------------
本 repo 設定 core.autocrlf=true，而 st-development-skill.md 是以 LF 寫入的。
下次 git 重新 checkout 該檔時，工作目錄那份會被轉成 CRLF，而安裝到
~/.claude/skills/st-development/SKILL.md 的那份維持 LF —— **內容相同、行尾分歧**。
單純比對位元組或檔案大小會產生假警報，所以這裡比的是「行尾正規化後的內容」。

This repo sets core.autocrlf=true and st-development-skill.md was written as LF.
On the next checkout the working-copy will become CRLF while the installed global
copy stays LF: identical content, divergent endings. A byte-for-byte or size
comparison would therefore false-alarm, so this compares line-ending-normalised
content instead.

用法 / Usage
------------
    PYTHONIOENCODING=utf-8 python tools/check_skill_sync.py

離開碼 / Exit codes
    0  內容一致（行尾可能不同，會註明）   in sync
    1  內容不一致，已列出差異             content differs
    2  有一份找不到                       a copy is missing
"""
import difflib
import os
import sys

PROJECT = r"C:\Claude Projects\11_st8925lab\st-development-skill.md"
INSTALLED = os.path.join(
    os.path.expanduser("~"), ".claude", "skills", "st-development", "SKILL.md"
)

LABELS = ("專案副本 project copy", "全域安裝 installed copy")


def endings(raw):
    """回傳 (CRLF 數, 裸 LF 數, 標籤)。Return (CRLF count, bare-LF count, label)."""
    crlf = raw.count(b"\r\n")
    lf = raw.count(b"\n") - crlf
    if crlf and lf:
        label = "MIXED"
    elif crlf:
        label = "CRLF"
    elif lf:
        label = "LF"
    else:
        label = "none"
    return crlf, lf, label


def load(path, label):
    if not os.path.exists(path):
        print("MISSING  %s" % label)
        print("         %s" % path)
        return None
    raw = open(path, "rb").read()
    crlf, lf, tag = endings(raw)
    print("%-26s %6d bytes  %-5s (CRLF %d / bare LF %d)"
          % (label, len(raw), tag, crlf, lf))
    print("    %s" % path)
    return raw


print("st-development skill — 內容同步檢查 / content sync check")
print("=" * 72)

a = load(PROJECT, LABELS[0])
b = load(INSTALLED, LABELS[1])
print()

if a is None or b is None:
    print("結論 / RESULT: 無法比對，有一份副本不存在。")
    print("               Cannot compare — one copy does not exist.")
    print()
    print("修復 / Fix: 重新安裝 → python .wrangler/install_skill.py")
    sys.exit(2)

# 行尾正規化後才比對內容。Normalise endings before comparing content.
norm_a = a.replace(b"\r\n", b"\n")
norm_b = b.replace(b"\r\n", b"\n")

if norm_a == norm_b:
    print("結論 / RESULT: 內容一致 IN SYNC")
    if a == b:
        print("               位元組也完全相同（行尾一致）。")
        print("               Byte-identical; endings match too.")
    else:
        print("               行尾不同但內容相同 —— 這是 core.autocrlf=true 的")
        print("               預期結果，不需處理。")
        print("               Endings differ, content does not. This is the")
        print("               expected result of core.autocrlf=true; no action needed.")
    sys.exit(0)

# 內容真的不一樣，列出差異。Content genuinely differs — show it.
text_a = norm_a.decode("utf-8").split("\n")
text_b = norm_b.decode("utf-8").split("\n")

print("結論 / RESULT: 內容不一致 OUT OF SYNC")
print("               兩份副本的內容（非僅行尾）已分歧。")
print("               The two copies have genuinely diverged.")
print()

diff = list(difflib.unified_diff(
    text_a, text_b,
    fromfile="project/st-development-skill.md",
    tofile="~/.claude/skills/st-development/SKILL.md",
    lineterm="", n=2,
))

LIMIT = 200
for line in diff[:LIMIT]:
    print(line)
if len(diff) > LIMIT:
    print("... (差異共 %d 行，僅顯示前 %d 行 / %d diff lines, showing first %d)"
          % (len(diff), LIMIT, len(diff), LIMIT))

print()
print("修復 / Fix：先判斷哪一份才是要保留的版本，再單向覆蓋。")
print("Decide which copy is authoritative first, then copy one way.")
print("  專案 → 全域 project to global:  python .wrangler/install_skill.py")
print("  全域 → 專案 global to project:  手動比對後貼回，勿盲目覆蓋開發中的修改。")
print("                                   Merge by hand; do not blindly overwrite.")
sys.exit(1)
