# -*- coding: utf-8 -*-
"""
Script to update README.md and PROMPT.md with Wayne IoT Server Gen 2 integration details.
"""

from pathlib import Path

BASE_DIR = Path(r"d:\st8925lab")
README_PATH = BASE_DIR / "README.md"
PROMPT_PATH = BASE_DIR / "PROMPT.md"

# 1. Update PROMPT.md
prompt_text = PROMPT_PATH.read_text(encoding="utf-8")

# Update File Manifest in PROMPT.md
old_manifest = """├── alarm-notification-simulator/  id '01'實體專案：獨立靜態 HTML，由
│                              Vite/React 編譯產出，詳細架構與維護見其
│                              PROMPT.md（第 4 種運作模式）
├── project-02/ .. project-06/  五個獨立專案子頁（各含 index.html／README.md／PROMPT.md）"""

new_manifest = """├── alarm-notification-simulator/  id '01'實體專案：警報推播通知模擬器（Vite/React 編譯產出）
├── iot-gen2-simulator-monitor/    id '02'實體專案：Wayne IoT Server Gen 2 模擬監控中控台與 VPS 生產藍圖
├── project-03/ .. project-06/     四個獨立專案子頁（各含 index.html／README.md／PROMPT.md）"""

if old_manifest in prompt_text:
    prompt_text = prompt_text.replace(old_manifest, new_manifest)
elif "project-02" in prompt_text:
    prompt_text = prompt_text.replace("project-02", "iot-gen2-simulator-monitor")

# Update PROJECTS array snippet in PROMPT.md
old_projects_snippet = """const PROJECTS = [
    { id: '01', label: 'ALARM NOTIFICATION SIMULATOR', slug: 'alarm-notification-simulator' },
    { id: '02', label: 'PROJECT 02', slug: 'project-02' },
    { id: '03', label: 'PROJECT 03', slug: 'project-03' },
    { id: '04', label: 'PROJECT 04', slug: 'project-04' },
    { id: '05', label: 'PROJECT 05', slug: 'project-05' },
    { id: '06', label: 'PROJECT 06', slug: 'project-06' },
];"""

new_projects_snippet = """const PROJECTS = [
    { id: '01', label: 'ALARM NOTIFICATION SIMULATOR', slug: 'alarm-notification-simulator' },
    { id: '02', label: 'IOT GEN2 SIMULATOR & MONITOR', slug: 'iot-gen2-simulator-monitor' },
    { id: '03', label: 'PROJECT 03', slug: 'project-03' },
    { id: '04', label: 'PROJECT 04', slug: 'project-04' },
    { id: '05', label: 'PROJECT 05', slug: 'project-05' },
    { id: '06', label: 'PROJECT 06', slug: 'project-06' },
];"""

if old_projects_snippet in prompt_text:
    prompt_text = prompt_text.replace(old_projects_snippet, new_projects_snippet)

PROMPT_PATH.write_text(prompt_text, encoding="utf-8")
print("PROMPT.md updated successfully.")

# 2. Update README.md
readme_text = README_PATH.read_text(encoding="utf-8")

STAGE_14_MD = """

---

## 14. 階段 6 - 專案 02 整合：第二代物聯網架構 / Stage 6 - Project 02: Wayne IoT Server Gen 2 Integration

> **執行時間 / Timestamp**: 2026-08-17 ~ 2026-08-18  
> **專案代碼 / Project ID**: `02`  
> **顯示標籤 / Display Label**: `IOT GEN2 SIMULATOR & MONITOR`  
> **網址路徑 / URL Slug**: `https://st8925lab.com/iot-gen2-simulator-monitor/`  
> **生產藍圖目錄 / Production VPS Blueprint**: `iot-gen2-simulator-monitor/vps/`

---

### 14.1 專案背景與升級動機 / Background & Core Motivation

Wayne IoT 伺服器一代系統長期受限於虛擬主機（Shared Hosting）的架構瓶頸，包含：
1. **雙重 Throttle 限制**：Kernel 與 Route 層級重複限流導致 HTTP 429 錯誤。
2. **檔案排他鎖瓶頸**：`PatternController` 使用 `flock()` 造成多機並行時平均阻塞 2~15 秒。
3. **單線程同步阻塞**：單次 Ingest 需同步執行 MySQL Insert、3,151 條警報判斷與 LINE cURL。
4. **時序數據膨脹**：808 萬筆點位數據佔用 13.92 GB 儲存空間，缺乏分區與壓縮機制。

為此，第二代架構（Wayne IoT Server Gen 2）完成兩大核心交付：
- **前端 LAB 實體模擬監控台 (`iot-gen2-simulator-monitor/`)**：提供跨 8 大廠區 21 台實體冰水機與水塔之物理熱力學模擬、Modbus 59 點位即時遙測、動態 JSON 規則引擎求值、AI Prophet 48h 負載預測與多通道推播預覽。
- **後端生產級 VPS 套件 (`iot-gen2-simulator-monitor/vps/`)**：提供 TimescaleDB (PostgreSQL 16) Hypertable、Redis 7 Streams 批次寫入 Worker (< 30ms p99 Ingest、> 2,000 RPS)、FastAPI AI 微服務與 Docker Compose 部署設定。

---

### 14.2 命名與路由同步原則 / Naming & URL Route Synchronization

依據 ST8925 LAB 命名同步原則（`label <-> slug <-> folder` 三位一體）：
- **Display Label**: `IOT GEN2 SIMULATOR & MONITOR`
- **Folder & Slug**: `iot-gen2-simulator-monitor`
- **Single Source of Truth (`config.js`)**:
  ```javascript
  { id: '02', label: 'IOT GEN2 SIMULATOR & MONITOR', slug: 'iot-gen2-simulator-monitor' }
  ```
- **自動化維護**: 使用 `tools/rename_project.py` 可原子化同步磁碟資料夾與設定檔，消除手動更新遺漏。

---

### 14.3 前端核心模組架構 / Frontend Architecture & Module Breakdown

| 檔案路徑 | 職責與技術實現 |
|---|---|
| `index.html` | 整合 3D 軌道毛玻璃 Topbar、Wordmark 元件、21 台機組下拉選單、狀態卡、即時 Chart.js 圖表、Modbus 矩陣、警報日誌與彈窗。 |
| `app.js` | 核心應用控制器：每秒驅動機隊物理循環、動態評估規則、繪製遙測圖表、分發警報事件。 |
| `style.css` | 深色工業級毛玻璃（Dark Glassmorphism）主題，支援動態繼承首頁洗牌色相 (`--accent`)。 |
| `modules/fleet-simulator.js` | 21 台實體機組熱力學連鎖演算法（出回水溫、冷媒高低壓、COP 能效、耗電量），支援 5 種實體故障注入。 |
| `modules/rule-engine.js` | 動態 JSON 條件樹警報規則引擎，對標後端 Redis / TimescaleDB 的高效記憶體比對。 |
| `modules/ai-predictor.js` | 結合日週期工業負載模型的 Prophet 48h 預測與孤立森林多維度異常評分。 |

---

### 14.4 生產級 VPS 交付物清單 / Production VPS Delivery Manifest

於 `iot-gen2-simulator-monitor/vps/` 目錄中完整收錄：
1. **`db/01_init_timescaledb.sql`**：時序超表 (Hypertable) 初始化腳本、7 天自動壓縮策略（預期壓縮率 > 90%）與連續聚合視圖。
2. **`src/app/Console/Commands/IotBatchWorker.php`**：Redis 7 Streams 高吞吐批次寫入進程，徹底解耦 HTTP Ingest 與資料庫寫入。
3. **`src/app/Services/DynamicRuleEngine.php`**：JSON 條件樹求值服務，啟動時預載入 Redis，單次判定僅需 500μs。
4. **`ai_service/main.py`**：FastAPI + Prophet 負載趨勢預測與孤立森林異常偵測微服務。
5. **`docker-compose.yml` & `nginx/`**：TimescaleDB + Redis + PHP 8.3-FPM + Python + Nginx 一鍵式容器化編排。

---

### 14.5 全站驗證結果 / Site-wide Verification Passed

執行全站驗證工具：
```powershell
$env:PYTHONIOENCODING="utf-8"; python verify.py
```
- **13 大類別驗證全數通過 (ALL CHECKS PASSED)**，包含色相合規 (WCAG AAA >= 7.26)、雙向 Wordmark 導航、實體資料夾對應、`MY_ID` 宣告、`config.js` 引用與軌道動態擴充性。
"""

if "## 14. 階段 6 - 專案 02 整合" not in readme_text:
    readme_text += STAGE_14_MD
    README_PATH.write_text(readme_text, encoding="utf-8")
    print("README.md updated with Stage 14 successfully.")
else:
    print("README.md already contains Stage 14.")
