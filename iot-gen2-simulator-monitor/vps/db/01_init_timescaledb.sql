-- =========================================================================
--  01_init_timescaledb.sql — Wayne IoT Server Gen 2 Core DDL
--  PostgreSQL 16 + TimescaleDB 時序超表、列式壓縮與連續聚合預計算視圖
-- =========================================================================

-- 1. 啟用 TimescaleDB 時序資料庫擴展
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. 客戶公司主表 (Companies Metadata)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    tax_id VARCHAR(30) NULL,
    contact_person VARCHAR(60) NULL,
    contact_phone VARCHAR(40) NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 案場設備主表 (Machines Metadata)
CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    custom_number VARCHAR(80) NOT NULL,
    serial_number VARCHAR(80) UNIQUE NOT NULL,
    model VARCHAR(60) NOT NULL,
    device_type VARCHAR(40) DEFAULT 'chiller', -- 'chiller' | 'tower' | 'pump'
    capacity_rt NUMERIC(8,2) DEFAULT 100.00,
    token VARCHAR(128) NOT NULL,
    msgstatus INT DEFAULT 0,
    msgtoken TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machines_cid_sn ON machines (company_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_machines_token ON machines (token);

-- 4. 核心時序資料超表 (Time-Series Hypertable)
CREATE TABLE IF NOT EXISTS sensor_data (
    time        TIMESTAMPTZ NOT NULL,
    machine_id  INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    cid         INT NOT NULL,
    payload     JSONB NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 轉換為 TimescaleDB Hypertable (按時間自動分區，每 7 天為一個 Chunk)
SELECT create_hypertable('sensor_data', 'time', chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE);

-- 建立機器與時間的高效複合索引
CREATE INDEX IF NOT EXISTS idx_sensor_data_machine_time ON sensor_data (machine_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_cid_time ON sensor_data (cid, time DESC);

-- 5. 啟用 90% 列式壓縮 (Columnar Compression)
ALTER TABLE sensor_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'machine_id, cid',
    timescaledb.compress_orderby = 'time DESC'
);

-- 自動壓縮策略：對超過 7 天之歷史 Chunk 自動執行壓縮
SELECT add_compression_policy('sensor_data', INTERVAL '7 days', if_not_exists => TRUE);

-- 自動保留策略：自動刪除超過 2 年之過期原始資料
SELECT add_retention_policy('sensor_data', INTERVAL '2 years', if_not_exists => TRUE);

-- 6. 連續預聚合視圖 (Continuous Aggregations for High-Speed Dashboards)
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_hourly_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS bucket,
    machine_id,
    AVG((payload->>'AAA0028')::numeric) AS avg_chilled_supply_temp,
    MAX((payload->>'AAA0028')::numeric) AS max_chilled_supply_temp,
    MIN((payload->>'AAA0028')::numeric) AS min_chilled_supply_temp,
    AVG((payload->>'AAA0029')::numeric) AS avg_chilled_return_temp,
    AVG((payload->>'AAA0030')::numeric) AS avg_cond_leaving_temp,
    AVG((payload->>'AAA0031')::numeric) AS avg_cond_entering_temp,
    AVG((payload->>'AAA0036')::numeric) AS avg_high_pressure,
    AVG((payload->>'AAA0037')::numeric) AS avg_low_pressure,
    AVG((payload->>'AAA0045')::numeric) AS avg_cop,
    AVG((payload->>'AAA0059')::numeric) AS avg_power_kw
FROM sensor_data
GROUP BY bucket, machine_id
WITH NO DATA;

-- 自動刷新連續聚合視圖 (每 30 分鐘自動計算過去 2 天數據)
SELECT add_continuous_aggregate_policy('sensor_hourly_summary',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- 7. 動態告警規則表 (Dynamic Alarm Rules - 取代 3151 行寫死程式碼)
CREATE TABLE IF NOT EXISTS alarm_rules (
    id SERIAL PRIMARY KEY,
    machine_id INT NULL REFERENCES machines(id) ON DELETE CASCADE,
    rule_code VARCHAR(64) UNIQUE NOT NULL,
    rule_name VARCHAR(150) NOT NULL,
    description TEXT,
    condition_json JSONB NOT NULL,
    duration_seconds INT DEFAULT 0,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning', -- 'warning' | 'critical'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 告警觸發與維修紀錄表 (Alarm Records & Event Tracking)
CREATE TABLE IF NOT EXISTS alarm_records (
    id BIGSERIAL PRIMARY KEY,
    machine_id INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    cid INT NOT NULL,
    rule_id INT REFERENCES alarm_rules(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL,
    rule_code VARCHAR(64) NOT NULL,
    trigger_values JSONB NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(64) NULL,
    acknowledged_at TIMESTAMPTZ NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alarm_records_search ON alarm_records (machine_id, is_resolved, created_at DESC);
