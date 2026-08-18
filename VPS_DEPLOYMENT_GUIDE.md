# ST8925 LAB — 生產環境 (VPS Prod) 完整遷移部署與運維手冊 / VPS Production Deployment & Operations Manual

> **目標環境 Target Environment**: Linux VPS (Ubuntu 22.04 LTS / 24.04 LTS or Debian 12)  
> **專案涵蓋 Projects Covered**: 
> 1. `alarm-notification-simulator` (Project 01) — 告警推播與排班升級中樞
> 2. `iot-gen2-simulator-monitor` (Project 02) — Wayne IoT Gen 2 遙測採集與規則引擎
> 3. `ai-diagnostic-kb` (Project 03) — AI 智慧診斷、CUSUM 漂移預警與 RAG 領域知識庫
> **文件版本 Version**: 1.0 (Production Release)  
> **發布日期 Date**: 2026-08-18  
> **權威性 Authority**: 本手冊為 ST8925 LAB 跨專案於 VPS 生產環境部署的唯一標準指引。

---

## 1. 系統架構與拓撲全景 / Architecture & Topology Overview

ST8925 LAB 在生產環境中採用高內聚、非同步解耦的微服務架構，所有後端容器透過內部專屬 Docker Bridge 網路通訊，對外僅透過 Nginx 反向代理暴露 HTTPS (443) 埠：

```mermaid
flowchart TB
    subgraph INGRESS["反向代理與安全層 (Edge / Ingress)"]
        CLIENT["🌐 外部使用者 (Browser / Mobile / LINE / FCM)"]
        NGINX["🛡️ Nginx 1.24+ (HTTPS / SSL / WebSocket / Gzip / Rate Limit)"]
        CLIENT <-->|HTTPS:443 / WSS| NGINX
    end

    subgraph APPS["前端靜態資產 (Static Frontends)"]
        FE_HOME["首頁宇宙軌道 (HTML/JS/CSS)"]
        FE_P01["P01: 告警模擬前端 (Vite/React)"]
        FE_P02["P02: IoT Gen 2 前端 (Vanilla JS/Chart.js)"]
        FE_P03["P03: AI 診斷知識庫 (Cyber Glassmorphism)"]
    end

    subgraph BACKENDS["後端微服務 (Microservices Layer)"]
        P01_API["🔔 P01 Fastify API (Port 4000)"]
        P01_OPS["⚙️ P01 Ops Server & WebSocket (Port 4001)"]
        P02_API["📡 P02 Laravel 11 Ingestion API (Port 8080)"]
        P02_WORKER["⚡ P02 Redis Stream Worker"]
        P02_AI["📈 P02 Prophet 48h AI Service (Port 8001)"]
        P03_AI["🤖 P03 FastAPI AI Diagnostic KB (Port 8000)"]
    end

    subgraph STORAGE["資料持久化與快取 (Data Layer)"]
        PG["🐘 PostgreSQL 16 + TimescaleDB + pgvector (Port 5432)"]
        REDIS["⚡ Redis 7 In-Memory & Streams (Port 6379)"]
        SQLITE["📁 SQLite (P01 獨立帳本)"]
    end

    subgraph EXTERNAL["外部 AI 與通訊雲端 (Cloud Providers)"]
        GEMINI["✨ Google Gemini 1.5/2.0 API & Embeddings"]
        LINE["💬 LINE Messaging API"]
        FCM["🔥 Firebase Cloud Messaging"]
    end

    NGINX -->|/| FE_HOME
    NGINX -->|/alarm-notification-simulator/| FE_P01
    NGINX -->|/iot-gen2-simulator-monitor/| FE_P02
    NGINX -->|/ai-diagnostic-kb/| FE_P03

    NGINX -->|/api/alarm/| P01_API
    NGINX -->|/ops/ & /ws| P01_OPS
    NGINX -->|/api/iot/| P02_API
    NGINX -->|/api/ai/| P03_AI

    P01_API --> SQLITE
    P01_API --> LINE
    P01_API --> FCM

    P02_API --> REDIS
    P02_WORKER --> REDIS
    P02_WORKER --> PG
    P02_API --> P02_AI

    P03_AI --> PG
    P03_AI --> GEMINI

    P02_WORKER -.->|觸發 AI 預警| P03_AI
    P03_AI -.->|推送診斷告警| P01_API
```

### 服務埠號與通訊矩陣 / Service Port Matrix

| 服務名稱 Service Name | 容器名稱 Container | 內部埠 Internal Port | 外部存取 External Routing | 職責說明 Role |
|---|---|---|---|---|
| **Nginx Web/Proxy** | `st8925-nginx` | 80 / 443 | Public (`https://st8925lab.com`) | SSL 終端、靜態檔案託管、反向代理、WebSocket 升級 |
| **P01 Fastify API** | `st8925-alarm-api` | 4000 | `/api/alarm/*` | 告警收容、去重、排班與推播分發 |
| **P01 Ops Server** | `st8925-alarm-ops` | 4001 | `/ops/*` & WebSocket | 模擬營運端點與即時 WebSocket 廣播 |
| **P02 Ingestion API** | `st8925-iot-api` | 8080 | `/api/iot/*` | 高頻 Modbus 遙測接收 (<30ms)、動態規則求值 |
| **P02 Stream Worker** | `st8925-iot-worker` | — | Internal | Redis Streams 批次聚合寫入 PostgreSQL |
| **P02 Prophet AI** | `st8925-iot-ai` | 8001 | Internal | 48 小時時序負載預測與孤立森林異常評分 |
| **P03 AI Diagnostic KB** | `st8925-ai-kb` | 8000 | `/api/ai/*` | CUSUM 漂移計算、pgvector 向量檢索、Gemini RAG 診斷 |
| **PostgreSQL 16** | `st8925-postgres` | 5432 | 127.0.0.1:5432 (Localhost only) | TimescaleDB 時序超表 + pgvector 768維知識庫 |
| **Redis 7** | `st8925-redis` | 6379 | 127.0.0.1:6379 (Localhost only) | 高頻緩衝隊列、即時機況快取、分散式鎖 |

---

## 2. 伺服器前置環境準備 / Prerequisites & Server Hardening

### 2.1 硬體規格建議 / Recommended Server Sizing
- **CPU**: 4 vCPU 核心以上 (支援並行 CUSUM 演算法與 FastAPI 非同步請求)
- **RAM**: 8 GB RAM 以上 (建議配置 4GB Swap)
- **SSD**: 80 GB NVMe SSD 以上 (預留 TimescaleDB 壓縮時序與知識庫空間)
- **OS**: Ubuntu 22.04 LTS 或 24.04 LTS (x86_64)

### 2.2 基礎套件安裝與系統更新 / System Packages
以 `root` 或具備 `sudo` 權限之使用者登入 VPS：

```bash
# 1. 更新系統套件
sudo apt update && sudo apt upgrade -y

# 2. 安裝必備基礎工具
sudo apt install -y curl wget git ufw jq htop ca-certificates gnupg lsb-release certbot python3-certbot-nginx

# 3. 安裝 Docker Engine 24+ 與 Docker Compose v2
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 驗證 Docker 安裝
docker --version
docker compose version
```

### 2.3 UFW 防火牆安全性配置 / Firewall Configuration
```bash
# 允許 SSH (請依實際 SSH Port 調整，預設為 22)
sudo ufw allow 22/tcp

# 允許 Web 流量
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 啟用防火牆 (其餘資料庫與內部微服務埠號皆被阻擋於本機)
sudo ufw enable
sudo ufw status verbose
```

---

## 3. 目錄結構佈局與專案 Clone / Directory Layout & Codebase Setup

建議將整套系統統一部署於 `/opt/st8925lab`：

```bash
# 建立專案主目錄
sudo mkdir -p /opt/st8925lab
sudo chown -R $USER:$USER /opt/st8925lab

# Clone GitHub 倉儲
git clone https://github.com/Steven8925/st8925lab.git /opt/st8925lab
cd /opt/st8925lab
```

### 伺服器部署目錄架構 / Server Directory Tree
```
/opt/st8925lab/
├── .env                                # ★ 生產環境變數檔案 (不進版控，見 §4)
├── docker-compose.prod.yml              # ★ 統一容器編排檔 (見 §5)
├── nginx/
│   └── conf.d/st8925lab.conf           # ★ Nginx 反向代理配置 (見 §7)
├── certs/                              # SSL 憑證放置目錄
├── data/
│   ├── pgdata/                         # PostgreSQL 資料持久化目錄
│   ├── redisdata/                      # Redis RDB/AOF 檔案
│   └── alarm_sqlite/                   # P01 SQLite 資料庫
├── alarm-notification-simulator/
│   ├── index.html & assets/            # 前端靜態資源
│   └── source/                         # 後端 Fastify / Ops Server 原始碼
├── iot-gen2-simulator-monitor/
│   ├── index.html & modules/           # 前端靜態資源
│   └── vps/                            # Laravel & Python 原始碼及 DB 腳本
└── ai-diagnostic-kb/
    ├── index.html & modules/           # 前端靜態資源
    └── source/backend/                 # FastAPI 診斷引擎與知識庫原始碼
```

---

## 4. 生產環境變數設定 / Environment Variables Setup

在 `/opt/st8925lab/.env` 建立統一環境變數設定檔（請務必替換預設密鑰）：

```bash
cat << 'EOF' > /opt/st8925lab/.env
# ===============================================================
# ST8925 LAB — PRODUCTION ENVIRONMENT CONFIGURATION
# ===============================================================

# --- 網域與主機設定 / Domain & Host ---
DOMAIN_NAME=st8925lab.com
APP_ENV=production
APP_DEBUG=false

# --- PostgreSQL & TimescaleDB ---
POSTGRES_DB=st8925_prod
POSTGRES_USER=st8925_admin
POSTGRES_PASSWORD=SuperStrongPostgresPass_2026_Secure!
DATABASE_URL=postgresql://st8925_admin:SuperStrongPostgresPass_2026_Secure!@postgres:5432/st8925_prod

# --- Redis 7 ---
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=SuperStrongRedisPass_2026_Secure!

# --- P03: AI Diagnostic & Knowledge Base ---
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyD...YourActualGoogleGeminiApiKey...
GEMINI_MODEL=gemini-1.5-flash
EMBEDDING_PROVIDER=gemini
OPENAI_API_KEY=
LOG_LEVEL=INFO

# --- P01: Alarm Notification Simulator ---
ALARM_JWT_SECRET=super_secret_jwt_alarm_key_2026_xyz_production
SEED_MANAGER_EMAIL=manager@st8925lab.com
SEED_ADMIN_EMAIL=admin@st8925lab.com
SEED_PASSWORD=Prod-Alarm-2026-Strict!
LINE_CHANNEL_ACCESS_TOKEN=
FCM_SERVER_KEY=

# --- P02: Wayne IoT Server Gen 2 ---
LARAVEL_APP_KEY=base64:3m8zX9Y7wP2qR4sT6uV8wX0yZ1aB3cE5gH7jK9mN1pQ=
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
EOF

# 設定權限保護密鑰
chmod 600 /opt/st8925lab/.env
```

---

## 5. 統一 Docker Compose 編排檔 / Master Docker Compose Manifest

建立 `/opt/st8925lab/docker-compose.prod.yml`：

```yaml
version: '3.8'

networks:
  st8925-net:
    driver: bridge

volumes:
  pgdata:
  redisdata:
  alarm_data:

services:
  # ── 1. PostgreSQL 16 + TimescaleDB + pgvector ──
  postgres:
    image: timescale/timescaledb-ha:pg16
    container_name: st8925-postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./iot-gen2-simulator-monitor/vps/db:/docker-entrypoint-initdb.d:ro
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - st8925-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── 2. Redis 7 緩衝與 Streams ──
  redis:
    image: redis:7-alpine
    container_name: st8925-redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redisdata:/data
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - st8925-net
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── 3. Project 03: AI 智慧診斷與知識庫微服務 (FastAPI) ──
  ai-diagnostic-kb:
    build:
      context: ./ai-diagnostic-kb/source/backend
      dockerfile: Dockerfile
    container_name: st8925-ai-kb
    restart: always
    environment:
      - PORT=8000
      - DATABASE_URL=${DATABASE_URL}
      - LLM_PROVIDER=${LLM_PROVIDER}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=${GEMINI_MODEL}
      - EMBEDDING_PROVIDER=${EMBEDDING_PROVIDER}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LOG_LEVEL=${LOG_LEVEL}
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - st8925-net

  # ── 4. Project 02: Wayne IoT Gen 2 Ingestion API (Laravel 11 / PHP 8.3 JIT) ──
  iot-gen2-api:
    build:
      context: ./iot-gen2-simulator-monitor/vps
      dockerfile: Dockerfile.php
    container_name: st8925-iot-api
    restart: always
    environment:
      - APP_ENV=production
      - APP_KEY=${LARAVEL_APP_KEY}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_DATABASE=${POSTGRES_DB}
      - DB_USERNAME=${POSTGRES_USER}
      - DB_PASSWORD=${POSTGRES_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    ports:
      - "127.0.0.1:8080:80"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - st8925-net

  # ── 5. Project 02: Redis Stream Batch Worker ──
  iot-gen2-worker:
    build:
      context: ./iot-gen2-simulator-monitor/vps
      dockerfile: Dockerfile.worker
    container_name: st8925-iot-worker
    restart: always
    environment:
      - DB_HOST=postgres
      - DB_DATABASE=${POSTGRES_DB}
      - DB_USERNAME=${POSTGRES_USER}
      - DB_PASSWORD=${POSTGRES_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    depends_on:
      - iot-gen2-api
    networks:
      - st8925-net

  # ── 6. Project 02: Prophet 48h AI 微服務 ──
  iot-gen2-ai:
    build:
      context: ./iot-gen2-simulator-monitor/vps/ai_service
      dockerfile: Dockerfile
    container_name: st8925-iot-ai
    restart: always
    ports:
      - "127.0.0.1:8001:8001"
    networks:
      - st8925-net

  # ── 7. Project 01: Fastify 告警推播 API ──
  alarm-api:
    build:
      context: ./alarm-notification-simulator/source
      dockerfile: Dockerfile.api
    container_name: st8925-alarm-api
    restart: always
    environment:
      - PORT=4000
      - JWT_SECRET=${ALARM_JWT_SECRET}
      - SEED_MANAGER_EMAIL=${SEED_MANAGER_EMAIL}
      - SEED_ADMIN_EMAIL=${SEED_ADMIN_EMAIL}
      - SEED_PASSWORD=${SEED_PASSWORD}
    volumes:
      - alarm_data:/app/data
    ports:
      - "127.0.0.1:4000:4000"
    networks:
      - st8925-net

  # ── 8. Project 01: 模擬營運伺服器與 WebSocket ──
  alarm-ops:
    build:
      context: ./alarm-notification-simulator/source
      dockerfile: Dockerfile.ops
    container_name: st8925-alarm-ops
    restart: always
    environment:
      - PORT=4001
      - API_URL=http://alarm-api:4000
    depends_on:
      - alarm-api
    ports:
      - "127.0.0.1:4001:4001"
    networks:
      - st8925-net
```

---

## 6. 資料庫遷移、種子資料與基線預計算 / Database Migration & Seeding

### 6.1 啟動資料庫容器
```bash
cd /opt/st8925lab
docker compose -f docker-compose.prod.yml up -d postgres redis
```

### 6.2 執行資料表 Schema 初始化
```bash
# 1. 進入 PostgreSQL 執行 P02 TimescaleDB 時序初始化
docker exec -i st8925-postgres psql -U st8925_admin -d st8925_prod < ./iot-gen2-simulator-monitor/vps/db/01_init_timescaledb.sql

# 2. 執行 P03 AI 診斷知識庫與 pgvector 資料表建立
docker exec -i st8925-postgres psql -U st8925_admin -d st8925_prod < ./iot-gen2-simulator-monitor/vps/db/04_ai_diagnostic_kb.sql
```

### 6.3 啟動所有後端微服務
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 6.4 知識庫種子資料灌入與 21 台機組基線預計算
```bash
# 1. 執行知識庫種子寫入 (15 故障決策樹 + 20 維修工單 + 30 條 FAQ + 12 零件排程)
docker exec -it st8925-ai-kb python -c "
from knowledge_base.manager import KnowledgeBaseManager
mgr = KnowledgeBaseManager()
print('Seeding knowledge base records...')
"

# 2. 觸發全機隊 21 台機組 30 天滾動基線計算
curl -s -X POST http://127.0.0.1:8000/api/baseline/recalculate | jq .
```

---

## 7. Nginx 反向代理與 SSL 憑證配置 / Nginx Reverse Proxy & SSL Setup

建立 `/etc/nginx/sites-available/st8925lab.com.conf`：

```nginx
# HTTP 轉導至 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name st8925lab.com www.st8925lab.com;
    return 301 https://$host$request_uri;
}

# HTTPS 主伺服器配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name st8925lab.com www.st8925lab.com;

    # SSL 憑證路徑 (Let's Encrypt Certbot 自動生成)
    ssl_certificate /etc/letsencrypt/live/st8925lab.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/st8925lab.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 根目錄指向全站靜態檔案
    root /opt/st8925lab;
    index index.html;

    # Gzip 壓縮支援
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 1. 全站首頁與靜態子頁託管
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Project 01: 告警通知前端與 API 代理
    location /alarm-notification-simulator/ {
        try_files $uri $uri/ /alarm-notification-simulator/index.html;
    }
    location /api/alarm/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /ops/ {
        proxy_pass http://127.0.0.1:4001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 3. Project 02: Wayne IoT Gen 2 前端與 Ingestion API 代理
    location /iot-gen2-simulator-monitor/ {
        try_files $uri $uri/ /iot-gen2-simulator-monitor/index.html;
    }
    location /api/iot/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. Project 03: AI 智慧診斷知識庫前端與 FastAPI 代理
    location /ai-diagnostic-kb/ {
        try_files $uri $uri/ /ai-diagnostic-kb/index.html;
    }
    location /api/ai/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

### 啟用 Nginx 配置並申請 SSL 憑證
```bash
sudo ln -sf /etc/nginx/sites-available/st8925lab.com.conf /etc/nginx/sites-enabled/
sudo nginx -t

# 申請 Let's Encrypt 免費憑證
sudo certbot --nginx -d st8925lab.com -d www.st8925lab.com --non-interactive --agree-tos -m stsai@st8925lab.com

# 重新載入 Nginx
sudo systemctl reload nginx
```

---

## 8. 自動化維護與 Crontab 排程 / Scheduled Maintenance & Cron Jobs

在 VPS 主機設定定時維護任務：

```bash
sudo crontab -e
```

加入以下排程：

```bash
# 1. 每日凌晨 02:30 重新計算全機隊 21 台機組滾動統計基線 (Baseline Profiles)
30 2 * * * curl -s -X POST http://127.0.0.1:8000/api/baseline/recalculate > /dev/null 2>&1

# 2. 每 15 分鐘執行一次全機隊 CUSUM 漂移與劣化巡檢 (連鎖通知 P01)
*/15 * * * * curl -s -X POST http://127.0.0.1:8000/api/drift/check-fleet > /dev/null 2>&1

# 3. 每週日凌晨 04:00 清理 90 天以上過期無效時序數據與 Redis AOF 緊縮
0 4 * * 0 docker exec -i st8925-postgres psql -U st8925_admin -d st8925_prod -c "SELECT drop_chunks('sensor_data', INTERVAL '90 days');" > /dev/null 2>&1
```

---

## 9. 部署驗收、健康檢查與煙霧測試 / Health Checks & Smoke Testing

執行以下驗證指令確認各服務運作正常：

```bash
# 1. 檢查所有 Docker 容器狀態
docker compose -f /opt/st8925lab/docker-compose.prod.yml ps

# 2. 測試 P03 AI 診斷知識庫健康狀態
curl -s http://127.0.0.1:8000/health | jq .
# 預期: {"status":"ok","service":"ai-diagnostic-kb","llm_provider":"gemini","db_connected":true}

# 3. 測試 P03 RAG 知識庫語義檢索
curl -s -X POST http://127.0.0.1:8000/api/kb/search \
  -H "Content-Type: application/json" \
  -d '{"query":"冷卻水塔散熱片結垢","limit":2}' | jq .

# 4. 測試 P02 Ingestion API
curl -s http://127.0.0.1:8080/api/health | jq .

# 5. 測試 P01 告警 API 健康檢查
curl -s http://127.0.0.1:4000/health | jq .

# 6. 測試公開 HTTPS 首頁
curl -I https://st8925lab.com
# 預期: HTTP/2 200
```

---

## 10. 生產環境疑難排解與運維 SOP / Troubleshooting & Runbook

### 狀況 1：FastAPI 診斷服務回報 Gemini API 超額 (Rate Limit / Quota Exceeded)
- **現象**: `/api/diagnosis` 回應延遲或回傳 429 / 503 錯誤。
- **排查**: 檢查日誌 `docker logs -f st8925-ai-kb`。
- **處理**: 
  - `ai-diagnostic-kb` 內建 Fallback 機制，當 Gemini API 失敗或未配置金鑰時，系統會自動無縫切換至「內建工業專家規則推理引擎」(Rule-based Expert Engine)，診斷輸出不中斷。
  - 或在 `.env` 中設定 `OPENAI_API_KEY` 並切換 `LLM_PROVIDER=openai`。

### 狀況 2：TimescaleDB 時序寫入阻塞或磁碟空間滿載
- **排查**: 執行 `docker exec -it st8925-postgres df -h` 與 `SELECT hypertable_detailed_size('sensor_data');`。
- **處理**:
  - 確認時序壓縮策略是否正常運行：
    ```sql
    SELECT * FROM timescaledb_information.compression_settings;
    ```
  - 手動執行手動壓縮：
    ```sql
    SELECT compress_chunk(i) FROM show_chunks('sensor_data', older_than => INTERVAL '7 days') i;
    ```

### 狀況 3：WebSocket (Ops Server) 連線頻繁斷線
- **排查**: 檢查 Nginx 配置中 `proxy_read_timeout` 與 `proxy_send_timeout` 是否低於 60 秒。
- **處理**: 確保 Nginx 中包含：
  ```nginx
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 120s;
  ```

---

*本手冊由 ST8925 LAB 核心架構小組維護，若遇部署架構變更，請同步更新本檔案。*
