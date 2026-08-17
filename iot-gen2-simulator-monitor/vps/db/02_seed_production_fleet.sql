-- =========================================================================
--  02_seed_production_fleet.sql — Wayne IoT Server Gen 2 Production Seed
--  初始化 21 處真實案場主機、客戶公司與動態告警規則
-- =========================================================================

-- 1. 插入示範園區與企業組織 (Anonymized)
INSERT INTO companies (id, name) VALUES
(1, 'A區智慧園區營運處'),
(2, 'B區區域醫療中心'),
(3, 'C區金融總部大樓'),
(4, 'D區高科技半導體園區'),
(5, 'E區醫學研究大樓'),
(6, 'F區綜合生醫園區'),
(7, 'G區精密製造廠區'),
(8, 'H區智慧綠能廠辦')
ON CONFLICT (id) DO NOTHING;

-- 2. 插入去識別化 21 台標準主機設備 (Anonymized Enterprise Fleet)
INSERT INTO machines (id, company_id, name, custom_number, serial_number, model, device_type, capacity_rt, token, msgstatus) VALUES
(15, 1, 'A區智慧園區-南區1號冰水主機', '南區1號機', 'ECO-CH-01', 'ECO-100RT', 'chiller', 100.0, 'tok_eco_s1_2026', 0),
(16, 1, 'A區智慧園區-南區1號冷卻水塔', '南區1號塔', 'ECO-CT-01', 'CT-120', 'tower', 120.0, 'tok_eco_ct1_2026', 0),
(17, 1, 'A區智慧園區-南區2號冰水主機', '南區2號機', 'ECO-CH-02', 'ECO-100RT', 'chiller', 100.0, 'tok_eco_s2_2026', 0),
(18, 1, 'A區智慧園區-南區2號冷卻水塔', '南區2號塔', 'ECO-CT-02', 'CT-120', 'tower', 120.0, 'tok_eco_ct2_2026', 0),
(19, 1, 'A區智慧園區-北區1號冰水主機', '北區1號機', 'ECO-CH-03', 'ECO-100RT', 'chiller', 100.0, 'tok_eco_n1_2026', 0),
(20, 1, 'A區智慧園區-北區1號冷卻水塔', '北區1號塔', 'ECO-CT-03', 'CT-120', 'tower', 120.0, 'tok_eco_ct3_2026', 0),
(21, 1, 'A區智慧園區-北區2號冰水主機', '北區2號機', 'ECO-CH-04', 'ECO-100RT', 'chiller', 100.0, 'tok_eco_n2_2026', 0),
(22, 1, 'A區智慧園區-北區2號冷卻水塔', '北區2號塔', 'ECO-CT-04', 'CT-120', 'tower', 120.0, 'tok_eco_ct4_2026', 0),
(5,  2, 'B區醫療中心-急重症1號主機', '急重症1號機', 'MED-CH-01', 'MED-200RT', 'chiller', 200.0, 'tok_med_1_2026', 0),
(7,  3, 'C區金融總部-大樓1號主機', '總部1號機', 'FIN-CH-01', 'FIN-80RT', 'chiller', 80.0, 'tok_fin_1_2026', 0),
(8,  3, 'C區金融總部-大樓2號主機', '總部2號機', 'FIN-CH-02', 'FIN-80RT', 'chiller', 80.0, 'tok_fin_2_2026', 0),
(6,  4, 'D區科技園區-晶圓一廠8號機', '晶圓8號機', 'SEMI-CH-01', 'SEMI-150RT', 'chiller', 150.0, 'tok_semi_8_2026', 0),
(12, 4, 'D區科技園區-封裝二廠主機', '封裝2號機', 'SEMI-CH-02', 'SEMI-150RT', 'chiller', 150.0, 'tok_semi_a2_2026', 0),
(13, 4, 'D區科技園區-研發總部主機', '研發總部機', 'SEMI-CH-03', 'SEMI-150RT', 'chiller', 150.0, 'tok_semi_b9_2026', 0),
(11, 5, 'E區研究醫院-研究棟2號主機', '研究2號機', 'HOSP-CH-01', 'HOSP-250RT', 'chiller', 250.0, 'tok_hosp_2_2026', 0),
(14, 5, 'E區研究醫院-門診棟3號主機', '門診3號機', 'HOSP-CH-02', 'HOSP-250RT', 'chiller', 250.0, 'tok_hosp_3_2026', 0),
(23, 6, 'F區生醫大樓-一號醫療主機', '生醫1號機', 'BIOMED-CH-01', 'BIO-300RT', 'chiller', 300.0, 'tok_bio_1_2026', 0),
(24, 6, 'F區生醫大樓-二號醫療主機', '生醫2號機', 'BIOMED-CH-02', 'BIO-300RT', 'chiller', 300.0, 'tok_bio_2_2026', 0),
(9,  7, 'G區精密製造-產線50RT主機', '製造50RT', 'MFG-CH-01', 'MFG-50RT', 'chiller', 50.0, 'tok_mfg_1_2026', 0),
(10, 7, 'G區精密製造-產線100RT主機', '製造100RT', 'MFG-CH-02', 'MFG-100RT', 'chiller', 100.0, 'tok_mfg_2_2026', 0),
(4,  8, 'H區綠能廠辦-示範1號主機', '綠能1號機', 'GRN-CH-01', 'GRN-60RT', 'chiller', 60.0, 'tok_grn_1_2026', 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    serial_number = EXCLUDED.serial_number,
    model = EXCLUDED.model,
    capacity_rt = EXCLUDED.capacity_rt;

-- 重設序列
SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies));
SELECT setval('machines_id_seq', (SELECT MAX(id) FROM machines));

-- 3. 插入結構化動態告警規則 (取代 3151 行寫死條件)
INSERT INTO alarm_rules (id, machine_id, rule_code, rule_name, description, condition_json, duration_seconds, severity, is_active) VALUES
(1, NULL, 'FREEZE_ALARM_CRITICAL', '冰水出水過低 / 結凍警報 (紅燈)', '冰水出水溫度低於 5.0°C 或觸發 AAA0013 警報點位', '{"operator":"OR","conditions":[{"field":"AAA0028","op":"<","value":5.0},{"field":"AAA0013","op":"==","value":1}]}', 0, 'critical', TRUE),
(2, NULL, 'HIGH_PRESSURE_CRITICAL', '壓縮機高壓過高跳脫 (紅燈)', '壓縮機高壓壓力超過 18.0 kg/cm² 觸發保護跳脫', '{"operator":"OR","conditions":[{"field":"AAA0036","op":">","value":18.0}]}', 0, 'critical', TRUE),
(3, NULL, 'HIGH_PRESSURE_WARNING', '壓縮機高壓偏高預警 (黃燈)', '壓縮機高壓壓力超過 17.0 kg/cm² 或冷卻水出水超過 36.5°C', '{"operator":"OR","conditions":[{"field":"AAA0036","op":">","value":17.0},{"field":"AAA0030","op":">","value":36.5}]}', 60, 'warning', TRUE),
(4, NULL, 'LOW_PRESSURE_TRIP', '壓縮機低壓過低跳脫 (紅燈)', '壓縮機低壓壓力低於 2.2 kg/cm² 可能冷媒洩漏', '{"operator":"OR","conditions":[{"field":"AAA0037","op":"<","value":2.2}]}', 0, 'critical', TRUE),
(5, NULL, 'OVERCURRENT_CRITICAL', '壓縮機過電流過載 (紅燈)', '觸發 AAA0018 警報或總功率超過 150 kW', '{"operator":"OR","conditions":[{"field":"AAA0018","op":"==","value":1},{"field":"AAA0059","op":">","value":150.0}]}', 0, 'critical', TRUE),
(6, NULL, 'COP_EFFICIENCY_DEGRADATION', '性能係數 C.O.P. 能效驟降 (黃燈)', '主機 COP 低於 3.8 且持續運轉中', '{"operator":"AND","conditions":[{"field":"AAA0045","op":"<","value":3.8}]}', 300, 'warning', TRUE),
(7, NULL, 'COMPOUND_LEGACY_3151', '複合防護規則 (原 3151 行條件)', '冷卻水進出溫差低於 2.0°C 且功率大於 60 kW (水流停滯異常)', '{"operator":"AND","conditions":[{"field":"_computed_cond_delta","op":"<","value":2.0},{"field":"AAA0059","op":">","value":60.0}]}', 60, 'warning', TRUE)
ON CONFLICT (id) DO UPDATE SET
    rule_name = EXCLUDED.rule_name,
    condition_json = EXCLUDED.condition_json,
    severity = EXCLUDED.severity;

SELECT setval('alarm_rules_id_seq', (SELECT MAX(id) FROM alarm_rules));
