-- =========================================================================
--  04_ai_diagnostic_kb.sql — Wayne IoT AI Diagnostic & Knowledge Base DDL
--  PostgreSQL 16 + pgvector 擴展、基線分析、漂移事件、知識庫與 AI 診斷歷史表
-- =========================================================================

-- 1. 啟用 pgvector 向量擴展 (需已安裝 pgvector 擴展包)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 設備與型號時序基線表 (Baseline Profiles)
CREATE TABLE IF NOT EXISTS baseline_profiles (
    id              SERIAL PRIMARY KEY,
    machine_id      INT NULL REFERENCES machines(id) ON DELETE CASCADE,
    model           VARCHAR(60) NULL,
    field_code      VARCHAR(20) NOT NULL,            -- e.g. 'AAA0028', 'AAA0030', 'AAA0036', 'AAA0045'
    period_type     VARCHAR(20) NOT NULL,            -- 'weekly' | 'monthly' | 'quarterly'
    avg_value       NUMERIC(10,3) NOT NULL,
    std_value       NUMERIC(10,3) NOT NULL,
    min_value       NUMERIC(10,3) NULL,
    max_value       NUMERIC(10,3) NULL,
    sample_count    INT NOT NULL,
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_from      TIMESTAMPTZ NULL,
    valid_to        TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_bp_machine_field ON baseline_profiles (machine_id, field_code, period_type);
CREATE INDEX IF NOT EXISTS idx_bp_model_field ON baseline_profiles (model, field_code, period_type);

-- 3. 漂移與趨勢事件表 (Drift Events)
CREATE TABLE IF NOT EXISTS drift_events (
    id              BIGSERIAL PRIMARY KEY,
    machine_id      INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    field_code      VARCHAR(20) NOT NULL,
    drift_type      VARCHAR(30) NOT NULL,            -- 'gradual_increase' | 'gradual_decrease' | 'sudden_shift' | 'cusum_alert'
    baseline_value  NUMERIC(10,3) NOT NULL,
    current_value   NUMERIC(10,3) NOT NULL,
    deviation_pct   NUMERIC(6,2) NOT NULL,
    severity        VARCHAR(20) NOT NULL DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
    trend_slope     NUMERIC(10,6) NULL,
    trend_r_squared NUMERIC(5,4) NULL,
    cusum_value     NUMERIC(10,3) NULL,
    sensor_snapshot JSONB NULL,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_resolved     BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ NULL,
    resolution_note TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_drift_machine_time ON drift_events (machine_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_drift_unresolved ON drift_events (machine_id, is_resolved) WHERE NOT is_resolved;

-- 4. 故障診斷決策樹知識庫 (Troubleshooting Knowledge Base)
CREATE TABLE IF NOT EXISTS kb_troubleshooting (
    id                  SERIAL PRIMARY KEY,
    symptom_code        VARCHAR(64) NOT NULL UNIQUE,
    symptom_desc        TEXT NOT NULL,
    possible_causes     JSONB NOT NULL,
    recommended_actions JSONB NOT NULL,
    applicable_models   TEXT[] NULL,
    severity            VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
    category            VARCHAR(40) NOT NULL,                 -- 'thermal' | 'pressure' | 'electrical' | 'mechanical' | 'water_flow' | 'refrigerant'
    related_alarm_codes TEXT[] NULL,
    tags                TEXT[] NULL,
    embedding           vector(768) NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 維修工單歷史紀錄知識庫 (Work Orders Knowledge Base)
CREATE TABLE IF NOT EXISTS kb_work_orders (
    id                SERIAL PRIMARY KEY,
    machine_id        INT NULL REFERENCES machines(id) ON DELETE SET NULL,
    work_order_no     VARCHAR(30) UNIQUE NOT NULL,
    fault_phenomenon  TEXT NOT NULL,
    root_cause        TEXT NULL,
    repair_actions    TEXT NOT NULL,
    parts_replaced    JSONB NULL,
    labor_hours       NUMERIC(5,1) NULL,
    downtime_hours    NUMERIC(5,1) NULL,
    technician_name   VARCHAR(60) NULL,
    repair_date       DATE NOT NULL,
    alarm_codes       TEXT[] NULL,
    symptom_codes     TEXT[] NULL,
    effectiveness     VARCHAR(20) DEFAULT 'resolved', -- 'resolved' | 'partially_resolved' | 'recurred'
    notes             TEXT NULL,
    embedding         vector(768) NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 原廠與維運 FAQ 問答知識庫 (FAQ Knowledge Base)
CREATE TABLE IF NOT EXISTS kb_faq (
    id                SERIAL PRIMARY KEY,
    question          TEXT NOT NULL,
    answer            TEXT NOT NULL,
    category          VARCHAR(40) NOT NULL,
    applicable_models TEXT[] NULL,
    source            VARCHAR(100) NOT NULL DEFAULT 'field_experience',
    tags              TEXT[] NULL,
    embedding         vector(768) NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 耗材與零件壽命週期管理 (Parts Lifecycle Management)
CREATE TABLE IF NOT EXISTS kb_parts_lifecycle (
    id                      SERIAL PRIMARY KEY,
    part_name               VARCHAR(100) NOT NULL,
    part_category           VARCHAR(40) NOT NULL, -- 'filter' | 'bearing' | 'belt' | 'valve' | 'sensor' | 'oil' | 'gasket' | 'motor'
    expected_life_hours     INT NOT NULL,
    warning_threshold_hours INT NOT NULL,
    expected_life_years     NUMERIC(4,1) NULL,
    applicable_models       TEXT[] NULL,
    pm_interval_desc        TEXT NULL,
    replacement_procedure   TEXT NULL,
    estimated_cost_range    VARCHAR(60) NULL,
    failure_symptoms        TEXT[] NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI 診斷報告歷史表 (Diagnostic Reports)
CREATE TABLE IF NOT EXISTS diagnostic_reports (
    id                  BIGSERIAL PRIMARY KEY,
    machine_id          INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    report_type         VARCHAR(30) NOT NULL,            -- 'drift_analysis' | 'anomaly_diagnosis' | 'periodic_health' | 'manual_request'
    trigger_event_id    BIGINT NULL,
    trigger_source      VARCHAR(30) NULL,                -- 'drift_event' | 'alarm_record' | 'manual'
    diagnosis_summary   TEXT NOT NULL,
    possible_causes     JSONB NOT NULL,
    recommended_actions JSONB NOT NULL,
    further_checks      JSONB NULL,
    risk_assessment     JSONB NULL,
    confidence_score    NUMERIC(4,2) NULL,
    llm_model_used      VARCHAR(60) NULL,
    llm_tokens_used     INT NULL,
    rag_context_used    JSONB NULL,
    sensor_snapshot     JSONB NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dr_machine_time ON diagnostic_reports (machine_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_type ON diagnostic_reports (report_type, created_at DESC);
