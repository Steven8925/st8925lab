# ST8925 LAB — Project 02: Wayne IoT Server Gen 2 (Simulation & Production Console)

> **專案代碼**: `02`  
> **專案標籤**: `IOT GEN2 SIMULATOR & MONITOR`  
> **路由路徑**: `/iot-gen2-simulator-monitor/index.html` (對應首頁第二軌道環)  
> **狀態**: 生產級模擬展示 (LAB Staging) & VPS 部署套件就緒

---

## 1. 專案簡介 (Overview)

本專案為 **Wayne IoT Server Gen 2 (第二代物聯網架構)** 的前端實體模擬與監控中控台。系統模擬並呈現 21 台實體冰水主機 (Chillers) 與冷卻水塔 (Cooling Towers) 的 Modbus RTU/TCP 遙測數據上報、熱力學能效 (COP) 計算、動態 JSON 規則引擎求值、AI 48 小時負載預測與多通道警報推播分發。

---

## 2. 核心功能亮點 (Key Features)

1. **21 台實體機組跨廠區遙測模擬**：
   - 內湖生技園區 (4 主機 + 4 水塔)、台中榮總、信義金融大樓、竹科晶圓六廠等 8 大客戶。
   - 每秒動態模擬冰水出回水溫、冷卻水出回水溫、冷媒高低壓、總耗電量 (kW)、COP 能效與累計時數。
2. **Modbus 59 暫存器矩陣**：
   - 即時顯示 `AAA0001` ~ `AAA0059` 實體點位之狀態與數值。
3. **故障注入模擬器 (Fault Injector)**：
   - 一鍵模擬冷媒高壓過高 (`AAA0036` > 18.0)、防凍保護開關跳脫 (`AAA0013` = 1)、壓縮機過電流 (`AAA0018` = 1) 等實體警報。
4. **AI Prophet 48h 預測與異常檢測**：
   - 預測未來 48 小時設備運轉負載與置信區間，並提供孤立森林多維度能效異常評分。
5. **多通道警報推播預覽**：
   - 支援 LINE Notify / Flex Message 樣式卡片與 Flutter FCM Push 結構化 Payload 預覽。
6. **動態 JSON 規則引擎沙盒**：
   - 展示對標生產級 TimescaleDB / Redis 的 JSON 條件求值機制。

---

## 3. VPS 生產環境部署套件 (`iot-gen2-simulator-monitor/vps/`)

本專案目錄內收錄了完整之 VPS 生產環境交付物：
- `vps/docker-compose.yml`: TimescaleDB (PostgreSQL 16) + Redis 7 + PHP 8.3 JIT + Python AI 服務 + Nginx。
- `vps/db/01_init_timescaledb.sql`: 時序超表 (Hypertable) 初始化腳本、7天壓縮與數據留存策略。
- `vps/src/`: Laravel 11 Ingestion API、Redis Stream Batch Worker 與 Dynamic Rule Engine 服務。
- `vps/ai_service/`: FastAPI + Prophet + Scikit-Learn AI 微服務。
- `vps/README_VPS.md`: VPS 一鍵部署與生產運維指南。

---

## 4. 全站相容性與驗證

本專案符合 ST8925 LAB 宇宙深空設計體系規範：
- 共享 `../config.js` 單一資料源。
- 共享 `../shared/wordmark.js` 站名元件與字型對齊。
- 支援首頁軌道色相傳遞 (`--accent`, `--c`)。
- 通過 `python verify.py` 全站自動化測試。
