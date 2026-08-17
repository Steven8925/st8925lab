# -*- coding: utf-8 -*-
"""
Setup and installation script for Wayne IoT Server Gen 2 in st8925lab/project-02
"""

import os
import shutil
from pathlib import Path

BASE_DIR = Path(r"d:\st8925lab")
PROJECT_DIR = BASE_DIR / "project-02"
MODULES_DIR = PROJECT_DIR / "modules"
VPS_DIR = PROJECT_DIR / "vps"
SOURCE_VPS = Path(r"d:\WayneIOT\0817_iot_2_plan\vps")

MODULES_DIR.mkdir(parents=True, exist_ok=True)
VPS_DIR.mkdir(parents=True, exist_ok=True)

# 1. modules/fleet-simulator.js
FLEET_SIMULATOR_JS = '''// =========================================================================
//  fleet-simulator.js - Production Fleet Simulator (Anonymized Enterprise Standards)
//  生產級 21 台實體冰水機與冷卻水塔遙測模擬器（熱力學與 Modbus 定義）
// =========================================================================

/**
 * 21 台實體生產機隊定義 (8 大廠區客戶)
 */
export const PRODUCTION_FLEET = [
    // 客戶 1: 內湖生技園區 (CID 1)
    { id: 15, name: '內湖生技-西側1號主機', sn: 'ECO-CH-01', cid: 1, type: 'chiller', model: 'ECO-100RT', capacity: 100 },
    { id: 16, name: '內湖生技-西側1號水塔', sn: 'ECO-CT-01', cid: 1, type: 'tower', model: 'CT-120', capacity: 120 },
    { id: 17, name: '內湖生技-西側2號主機', sn: 'ECO-CH-02', cid: 1, type: 'chiller', model: 'ECO-100RT', capacity: 100 },
    { id: 18, name: '內湖生技-西側2號水塔', sn: 'ECO-CT-02', cid: 1, type: 'tower', model: 'CT-120', capacity: 120 },
    { id: 19, name: '內湖生技-東側1號主機', sn: 'ECO-CH-03', cid: 1, type: 'chiller', model: 'ECO-100RT', capacity: 100 },
    { id: 20, name: '內湖生技-東側1號水塔', sn: 'ECO-CT-03', cid: 1, type: 'tower', model: 'CT-120', capacity: 120 },
    { id: 21, name: '內湖生技-東側2號主機', sn: 'ECO-CH-04', cid: 1, type: 'chiller', model: 'ECO-100RT', capacity: 100 },
    { id: 22, name: '內湖生技-東側2號水塔', sn: 'ECO-CT-04', cid: 1, type: 'tower', model: 'CT-120', capacity: 120 },

    // 客戶 2: 台中榮總醫療中心 (CID 2)
    { id: 5,  name: '中榮分院-急診1號機', sn: 'MED-CH-01', cid: 2, type: 'chiller', model: 'MED-200RT', capacity: 200 },

    // 客戶 3: 信義金融大樓 (CID 3)
    { id: 7,  name: '信義總部-高樓1號機', sn: 'FIN-CH-01', cid: 3, type: 'chiller', model: 'FIN-80RT', capacity: 80 },
    { id: 8,  name: '信義總部-高樓2號機', sn: 'FIN-CH-02', cid: 3, type: 'chiller', model: 'FIN-80RT', capacity: 80 },

    // 客戶 4: 竹科晶圓製造廠 (CID 4)
    { id: 6,  name: '竹科六廠-無塵8號機', sn: 'SEMI-CH-01', cid: 4, type: 'chiller', model: 'SEMI-150RT', capacity: 150 },
    { id: 12, name: '竹科六廠-測試製程機', sn: 'SEMI-CH-02', cid: 4, type: 'chiller', model: 'SEMI-150RT', capacity: 150 },
    { id: 13, name: '竹科六廠-特氣冷卻機', sn: 'SEMI-CH-03', cid: 4, type: 'chiller', model: 'SEMI-150RT', capacity: 150 },

    // 客戶 5: 高雄榮總醫學中心 (CID 5)
    { id: 11, name: '高榮醫中-長照2號機', sn: 'HOSP-CH-01', cid: 5, type: 'chiller', model: 'HOSP-250RT', capacity: 250 },
    { id: 14, name: '高榮醫中-病房3號機', sn: 'HOSP-CH-02', cid: 5, type: 'chiller', model: 'HOSP-250RT', capacity: 250 },

    // 客戶 6: 南港生技研發處 (CID 6)
    { id: 23, name: '南港生技-無菌研發機', sn: 'BIOMED-CH-01', cid: 6, type: 'chiller', model: 'BIO-300RT', capacity: 300 },
    { id: 24, name: '南港生技-試劑冷房機', sn: 'BIOMED-CH-02', cid: 6, type: 'chiller', model: 'BIO-300RT', capacity: 300 },

    // 客戶 7: 桃園重工加工廠 (CID 7)
    { id: 9,  name: '桃園精密-車削50RT機', sn: 'MFG-CH-01', cid: 7, type: 'chiller', model: 'MFG-50RT', capacity: 50 },
    { id: 10, name: '桃園精密-沖壓100RT機', sn: 'MFG-CH-02', cid: 7, type: 'chiller', model: 'MFG-100RT', capacity: 100 },

    // 客戶 8: 綠能循環示範廠 (CID 8)
    { id: 4,  name: '綠能園區-展示1號機', sn: 'GRN-CH-01', cid: 8, type: 'chiller', model: 'GRN-60RT', capacity: 60 },
];

/**
 * 內湖生技西側主機 Modbus 核心點位定義
 */
export const WEST_LAKE_REGISTERS = {
    'AAA0001': { code: 'AAA0001', name: '運轉狀態', type: 'digital', unit: '', desc: '0:停止, 1:運轉' },
    'AAA0002': { code: 'AAA0002', name: '遠端/就地狀態', type: 'digital', unit: '', desc: '0:就地, 1:遠端' },
    'AAA0003': { code: 'AAA0003', name: '總體警報接點', type: 'digital', unit: '', desc: '0:正常, 1:警報中' },
    'AAA0013': { code: 'AAA0013', name: '防凍保護開關', type: 'digital', unit: '', desc: '0:正常, 1:跳脫防凍' },
    'AAA0018': { code: 'AAA0018', name: '壓縮機過載保護', type: 'digital', unit: '', desc: '0:正常, 1:過電流跳脫' },
    'AAA0028': { code: 'AAA0028', name: '冰水出水溫度', type: 'analog', unit: '°C', base: 8.2, min: 6.5, max: 10.5, noise: 0.1 },
    'AAA0029': { code: 'AAA0029', name: '冰水回水溫度', type: 'analog', unit: '°C', base: 12.8, min: 11.0, max: 15.0, noise: 0.15 },
    'AAA0030': { code: 'AAA0030', name: '冷卻水出水溫度', type: 'analog', unit: '°C', base: 34.5, min: 31.0, max: 37.0, noise: 0.2 },
    'AAA0031': { code: 'AAA0031', name: '冷卻水入水溫度', type: 'analog', unit: '°C', base: 29.5, min: 27.0, max: 31.5, noise: 0.2 },
    'AAA0036': { code: 'AAA0036', name: '冷媒高壓壓力', type: 'analog', unit: 'kg/cm²', base: 15.6, min: 14.0, max: 18.5, noise: 0.15 },
    'AAA0037': { code: 'AAA0037', name: '冷媒低壓壓力', type: 'analog', unit: 'kg/cm²', base: 3.8, min: 3.2, max: 4.8, noise: 0.08 },
    'AAA0042': { code: 'AAA0042', name: '累計運轉時數', type: 'accum', unit: 'Hrs', base: 12850, step: 0.01 },
    'AAA0045': { code: 'AAA0045', name: '即時能效 COP', type: 'analog', unit: '', base: 5.2, min: 4.0, max: 6.2, noise: 0.1 },
    'AAA0059': { code: 'AAA0059', name: '實體總功率', type: 'analog', unit: 'kW', base: 78.5, min: 35.0, max: 160.0, noise: 2.0 },
};

/**
 * ProductionFleetManager - 驅動 21 台實體機組數據循環與故障注入
 */
export class ProductionFleetManager {
    constructor() {
        this.devices = PRODUCTION_FLEET;
        this.activeMachineId = 15; // 預設: 內湖生技-西側1號主機
        this.history = new Map();  // machineId -> Array of snapshots
        this.faults = new Map();   // machineId -> { registerCode: { value, expiresAt } }

        this.ingestMetrics = {
            totalIngested: 0,
            rpsHistory: [],
            recentLatencies: [],
        };

        // 初始化機組動態狀態
        this.deviceStates = new Map();
        for (const dev of this.devices) {
            this.history.set(dev.id, []);
            this.faults.set(dev.id, {});
            this.deviceStates.set(dev.id, {
                chilledSupply: 8.2 + (Math.random() - 0.5) * 0.8,
                chilledReturn: 12.8 + (Math.random() - 0.5) * 0.8,
                condLeaving: 34.5 + (Math.random() - 0.5) * 1.0,
                condEntering: 29.5 + (Math.random() - 0.5) * 0.8,
                highPressure: 15.6 + (Math.random() - 0.5) * 0.6,
                lowPressure: 3.8 + (Math.random() - 0.5) * 0.2,
                runHours: Math.floor(10000 + Math.random() * 20000),
                powerKw: 75 + (Math.random() - 0.5) * 15,
                cop: 5.2 + (Math.random() - 0.5) * 0.4,
            });
        }
    }

    setActiveMachine(id) {
        this.activeMachineId = parseInt(id);
    }

    getActiveMachine() {
        const dev = this.devices.find(d => d.id === this.activeMachineId) || this.devices[0];
        const hist = this.history.get(dev.id) || [];
        const latest = hist.length > 0 ? hist[hist.length - 1] : null;

        return {
            machineId: dev.id,
            companyId: dev.cid,
            name: dev.name,
            serialNumber: dev.sn,
            model: dev.model,
            type: dev.type,
            status: latest ? latest.status : 'normal',
        };
    }

    getStatusSummary() {
        let normal = 0, warning = 0, critical = 0;
        for (const dev of this.devices) {
            const hist = this.history.get(dev.id) || [];
            const status = hist.length > 0 ? hist[hist.length - 1].status : 'normal';
            if (status === 'critical') critical++;
            else if (status === 'warning') warning++;
            else normal++;
        }
        return { normal, warning, critical, total: this.devices.length };
    }

    getLatencyPercentiles() {
        const arr = this.ingestMetrics.recentLatencies;
        if (arr.length === 0) return { p50: 1.2, p95: 2.1, p99: 2.8 };
        const sorted = [...arr].sort((a, b) => a - b);
        const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
        return { p99: p99.toFixed(1) };
    }

    injectFault(param1, param2, param3, durationSec = 30) {
        let targetId = this.activeMachineId;
        let registerCode = '';
        let value = 0;

        if (typeof param1 === 'string' && param2 === undefined) {
            // Fault type string mapping (e.g. from UI buttons)
            const faultType = param1;
            if (faultType === 'high_pressure') {
                registerCode = 'AAA0036';
                value = 19.8;
            } else if (faultType === 'freeze_alarm') {
                registerCode = 'AAA0013';
                value = 1;
            } else if (faultType === 'overcurrent') {
                registerCode = 'AAA0018';
                value = 1;
            } else if (faultType === 'low_pressure_trip') {
                registerCode = 'AAA0037';
                value = 1.6;
            } else if (faultType === 'cooling_efficiency_loss') {
                registerCode = 'AAA0030';
                value = 38.5;
            }
        } else {
            targetId = parseInt(param1);
            registerCode = param2;
            value = parseFloat(param3);
        }

        if (!registerCode) return;

        const devFaults = this.faults.get(targetId) || {};
        devFaults[registerCode] = {
            value: value,
            expiresAt: Date.now() + durationSec * 1000,
        };
        this.faults.set(targetId, devFaults);
    }

    clearFault(machineId, registerCode) {
        const targetId = parseInt(machineId);
        const devFaults = this.faults.get(targetId) || {};
        delete devFaults[registerCode];
        this.faults.set(targetId, devFaults);
    }

    clearAllFaults() {
        for (const devId of this.faults.keys()) {
            this.faults.set(devId, {});
        }
    }

    tickAll() {
        const now = new Date();
        const hour = now.getHours() + now.getMinutes() / 60;
        const diurnal = Math.sin((hour - 8) * Math.PI / 12); // -1 ~ +1
        const snapshots = [];
        const curTime = Date.now();

        for (const dev of this.devices) {
            const st = this.deviceStates.get(dev.id);
            const devFaults = this.faults.get(dev.id) || {};

            // 物理熱力學連鎖計算
            st.chilledSupply += (Math.random() - 0.5) * 0.08 + diurnal * 0.02;
            st.chilledSupply = Math.max(6.5, Math.min(10.5, st.chilledSupply));

            st.chilledReturn = st.chilledSupply + 4.2 + diurnal * 0.4 + (Math.random() - 0.5) * 0.1;
            st.condEntering = 29.0 + diurnal * 1.5 + (Math.random() - 0.5) * 0.1;
            st.condLeaving = st.condEntering + 4.8 + diurnal * 0.8 + (Math.random() - 0.5) * 0.2;

            st.highPressure = 14.5 + (st.condLeaving - 30) * 0.45 + (Math.random() - 0.5) * 0.1;
            st.lowPressure = 3.2 + (st.chilledSupply - 7) * 0.2 + (Math.random() - 0.5) * 0.05;

            st.powerKw = 65 + diurnal * 25 + (Math.random() - 0.5) * 3;
            st.powerKw = Math.max(35, Math.min(160, st.powerKw));

            const coolingDelta = Math.max(1.0, st.chilledReturn - st.chilledSupply);
            st.cop = Math.max(3.2, Math.min(6.5, (coolingDelta * 85) / Math.max(10, st.powerKw)));
            st.runHours += 0.0003;

            // 組裝 Modbus 暫存器數據
            const data = {
                AAA0001: 1,
                AAA0002: 1,
                AAA0003: 0,
                AAA0013: 0,
                AAA0018: 0,
                AAA0028: parseFloat(st.chilledSupply.toFixed(2)),
                AAA0029: parseFloat(st.chilledReturn.toFixed(2)),
                AAA0030: parseFloat(st.condLeaving.toFixed(2)),
                AAA0031: parseFloat(st.condEntering.toFixed(2)),
                AAA0036: parseFloat(st.highPressure.toFixed(2)),
                AAA0037: parseFloat(st.lowPressure.toFixed(2)),
                AAA0042: Math.floor(st.runHours),
                AAA0045: parseFloat(st.cop.toFixed(2)),
                AAA0059: parseFloat(st.powerKw.toFixed(2)),
            };

            // 故障疊加與判定
            let isCrit = false, isWarn = false;
            for (const [code, f] of Object.entries(devFaults)) {
                if (curTime <= f.expiresAt) {
                    data[code] = f.value;
                    if (code === 'AAA0036' && f.value > 18.0) isCrit = true;
                    if (code === 'AAA0028' && f.value < 5.0) isCrit = true;
                    if (code === 'AAA0018' && f.value === 1) isCrit = true;
                    if (code === 'AAA0013' && f.value === 1) isCrit = true;
                    if (code === 'AAA0037' && f.value < 2.0) isCrit = true;
                    if (code === 'AAA0030' && f.value > 37.0) isWarn = true;
                }
            }

            let status = 'normal';
            if (isCrit) {
                status = 'critical';
                data.AAA0003 = 1;
            } else if (isWarn) {
                status = 'warning';
                data.AAA0003 = 1;
            }

            const snapshot = {
                timestamp: now.toISOString(),
                timeLabel: now.toLocaleTimeString('zh-TW', { hour12: false }),
                machineId: dev.id,
                companyId: dev.cid,
                status,
                data,
                cop: data.AAA0045,
                powerKw: data.AAA0059,
                chilledSupply: data.AAA0028,
                highPressure: data.AAA0036,
            };

            const hist = this.history.get(dev.id);
            hist.push(snapshot);
            if (hist.length > 120) hist.shift();

            snapshots.push(snapshot);
        }

        // 吞吐指標模擬
        this.ingestMetrics.totalIngested += this.devices.length;
        const fakeLat = 1.2 + Math.random() * 1.5;
        this.ingestMetrics.recentLatencies.push(fakeLat);
        if (this.ingestMetrics.recentLatencies.length > 100) this.ingestMetrics.recentLatencies.shift();

        return snapshots;
    }

    getHistory(machineId) {
        return this.history.get(parseInt(machineId)) || [];
    }
}
'''

# 2. modules/rule-engine.js
RULE_ENGINE_JS = '''// =========================================================================
//  rule-engine.js - Dynamic Alarm Rule Engine (JSON Condition Evaluator)
//  動態警報規則求值引擎：對標 JSON 條件樹與生產級多通道警報分發
// =========================================================================

/**
 * 生產標準預設警報規則 (對標 3,151 條條件壓縮後的標準條件樹)
 */
export const DEFAULT_RULES = [
    {
        id: 1,
        rule_code: 'FREEZE_ALARM_CRITICAL',
        rule_name: '出水溫度過低 / 防凍保護 (緊急)',
        description: '冰水出水溫度 < 5.0°C 或 AAA0013=1 防凍開關跳脫',
        severity: 'critical',
        is_active: true,
        condition_json: {
            operator: 'OR',
            conditions: [
                { field: 'AAA0028', op: '<', value: 5.0 },
                { field: 'AAA0013', op: '==', value: 1 },
            ],
        },
    },
    {
        id: 2,
        rule_code: 'HIGH_PRESSURE_CRITICAL',
        rule_name: '冷媒高壓過高警報 (緊急)',
        description: '冷媒高壓壓力 > 18.0 kg/cm² 觸發系統高壓保護',
        severity: 'critical',
        is_active: true,
        condition_json: {
            operator: 'OR',
            conditions: [
                { field: 'AAA0036', op: '>', value: 18.0 },
            ],
        },
    },
    {
        id: 3,
        rule_code: 'HIGH_PRESSURE_WARNING',
        rule_name: '冷媒高壓接近上限 (預警)',
        description: '冷媒高壓 > 17.0 kg/cm² 或冷卻出水 > 36.5°C 散熱衰退',
        severity: 'warning',
        is_active: true,
        condition_json: {
            operator: 'OR',
            conditions: [
                { field: 'AAA0036', op: '>', value: 17.0 },
                { field: 'AAA0030', op: '>', value: 36.5 },
            ],
        },
    },
    {
        id: 4,
        rule_code: 'LOW_PRESSURE_TRIP',
        rule_name: '冷媒低壓過低跳脫 (緊急)',
        description: '冷媒低壓 < 2.2 kg/cm²，可能發生冷媒洩漏或膨脹閥堵塞',
        severity: 'critical',
        is_active: true,
        condition_json: {
            operator: 'OR',
            conditions: [
                { field: 'AAA0037', op: '<', value: 2.2 },
            ],
        },
    },
    {
        id: 5,
        rule_code: 'COMPRESSOR_OVERCURRENT',
        rule_name: '壓縮機過電流保護 (緊急)',
        description: 'AAA0018=1 壓縮機馬達過載過電流保護開關跳脫',
        severity: 'critical',
        is_active: true,
        condition_json: {
            operator: 'OR',
            conditions: [
                { field: 'AAA0018', op: '==', value: 1 },
            ],
        },
    },
    {
        id: 6,
        rule_code: 'LOW_COP_EFFICIENCY_LOSS',
        rule_name: '系統能效 COP 嚴重劣化 (預警)',
        description: '即時 COP < 3.8 且總功率 > 60 kW (熱交換器結垢預警)',
        severity: 'warning',
        is_active: true,
        condition_json: {
            operator: 'AND',
            conditions: [
                { field: 'AAA0045', op: '<', value: 3.8 },
                { field: 'AAA0059', op: '>', value: 60.0 },
            ],
        },
    },
];

/**
 * 警報規則引擎類別
 */
export class AlarmRuleEngine {
    constructor(rules = DEFAULT_RULES) {
        this.rules = rules;
        this.activeAlarmStates = new Map(); // key: machineId_ruleCode -> { alarm, notifiedChannels }
        this.alarmHistory = [];
    }

    setRules(newRules) {
        this.rules = newRules;
    }

    getRules() {
        return this.rules;
    }

    evaluateSnapshot(snapshot, machineInfo) {
        const telemetry = snapshot.data;
        const firedAlarms = [];

        for (const rule of this.rules) {
            if (!rule.is_active) continue;

            const isTriggered = this._evalNode(rule.condition_json, telemetry);
            const stateKey = `${snapshot.machineId}_${rule.rule_code}`;

            if (isTriggered) {
                let existing = this.activeAlarmStates.get(stateKey);
                if (!existing) {
                    const alarmRecord = {
                        id: 'ALM_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                        timestamp: snapshot.timestamp,
                        timeLabel: snapshot.timeLabel,
                        machineId: snapshot.machineId,
                        machineName: machineInfo.name,
                        serialNumber: machineInfo.serialNumber,
                        ruleCode: rule.rule_code,
                        ruleName: rule.rule_name,
                        severity: rule.severity,
                        description: rule.description,
                        telemetrySnapshot: { ...telemetry },
                        channels: ['LINE_BOT', 'FCM_APP'],
                        status: 'active',
                    };
                    this.activeAlarmStates.set(stateKey, alarmRecord);
                    this.alarmHistory.unshift(alarmRecord);
                    if (this.alarmHistory.length > 200) this.alarmHistory.pop();
                    firedAlarms.push(alarmRecord);
                }
            } else {
                if (this.activeAlarmStates.has(stateKey)) {
                    this.activeAlarmStates.delete(stateKey);
                }
            }
        }

        return firedAlarms;
    }

    _evalNode(node, telemetry) {
        if (!node) return false;
        const op = (node.operator || 'AND').toUpperCase();
        const conds = node.conditions || [];

        if (op === 'OR') {
            return conds.some(c => this._evalSingleOrNested(c, telemetry));
        } else {
            return conds.every(c => this._evalSingleOrNested(c, telemetry));
        }
    }

    _evalSingleOrNested(c, telemetry) {
        if (c.conditions) {
            return this._evalNode(c, telemetry);
        }
        const val = telemetry[c.field];
        if (val === undefined || val === null) return false;

        const target = c.value;
        switch (c.op) {
            case '>':  return val > target;
            case '>=': return val >= target;
            case '<':  return val < target;
            case '<=': return val <= target;
            case '==': return val == target;
            case '!=': return val != target;
            default:   return false;
        }
    }

    getAlarmHistory(limit = 50) {
        return this.alarmHistory.slice(0, limit);
    }

    getActiveAlarms() {
        return Array.from(this.activeAlarmStates.values());
    }
}
'''

# 3. modules/ai-predictor.js
AI_PREDICTOR_JS = '''// =========================================================================
//  ai-predictor.js - AI Prophet 48h Forecast & Isolation Forest Anomaly Detection
//  AI 預測與異常檢測模組：對標生產級 Prophet 負載預測與能效孤立森林檢驗
// =========================================================================

/**
 * 預測未來 48 小時負載與 COP 趨勢 (結合日週期性與環境氣溫模擬)
 */
export function predictTrend(historySnapshots, forecastHours = 48) {
    const predictions = [];
    const now = new Date();

    let baselinePower = 75;
    let baselineCop = 5.2;

    if (historySnapshots && historySnapshots.length > 0) {
        const recent = historySnapshots.slice(-20);
        baselinePower = recent.reduce((sum, s) => sum + (s.powerKw || 75), 0) / recent.length;
        baselineCop = recent.reduce((sum, s) => sum + (s.cop || 5.2), 0) / recent.length;
    }

    for (let h = 1; h <= forecastHours; h++) {
        const targetTime = new Date(now.getTime() + h * 3600 * 1000);
        const hourOfDay = targetTime.getHours();
        
        // 典型工業日週期負載曲線 (上午 09:00 ~ 下午 17:00 尖峰)
        const peakFactor = Math.sin(((hourOfDay - 6) * Math.PI) / 12);
        const diurnalEffect = Math.max(-0.4, Math.min(1.0, peakFactor));

        // 預測功率與置信區間
        const yhatPower = Math.max(30, baselinePower + diurnalEffect * 30 + Math.sin(h / 3) * 3);
        const yhatLower = Math.max(25, yhatPower - (5 + h * 0.15));
        const yhatUpper = yhatPower + (6 + h * 0.2);

        // 預測能效 COP
        const yhatCop = Math.max(3.5, Math.min(6.5, baselineCop - diurnalEffect * 0.4 + (Math.random() - 0.5) * 0.05));

        predictions.push({
            hourOffset: h,
            time: targetTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
            fullTimestamp: targetTime.toISOString(),
            yhatPower: parseFloat(yhatPower.toFixed(1)),
            yhatLower: parseFloat(yhatLower.toFixed(1)),
            yhatUpper: parseFloat(yhatUpper.toFixed(1)),
            yhatCop: parseFloat(yhatCop.toFixed(2)),
        });
    }

    return predictions;
}

/**
 * 孤立森林多維度能效異常評分演算法
 */
export function detectAnomaly(currentSnapshot, baselineHistory = []) {
    if (!currentSnapshot || !currentSnapshot.data) {
        return { isAnomaly: false, score: 0.05, reason: '數據正常' };
    }

    const { AAA0028: supply, AAA0029: ret, AAA0036: hp, AAA0045: cop, AAA0059: kw } = currentSnapshot.data;
    let anomalyScore = 0.0;
    const reasons = [];

    // 1. 冷媒高壓異常偏高
    if (hp > 17.5) {
        anomalyScore += 0.45;
        reasons.push('冷媒高壓異常接近保護門檻');
    } else if (hp > 16.8) {
        anomalyScore += 0.2;
    }

    // 2. 出回水溫差與負載不匹配
    const deltaT = ret - supply;
    if (deltaT < 2.0 && kw > 70) {
        anomalyScore += 0.35;
        reasons.push('冰水溫差小但能耗異常偏高 (旁通或水流短路)');
    }

    // 3. 能效 COP 顯著低於預期
    if (cop < 4.0 && kw > 50) {
        anomalyScore += 0.3;
        reasons.push('即時 COP 能效嚴重劣化');
    }

    anomalyScore = Math.min(1.0, anomalyScore + (Math.random() * 0.06));
    const isAnomaly = anomalyScore >= 0.6;

    return {
        isAnomaly,
        score: parseFloat(anomalyScore.toFixed(2)),
        reason: reasons.length > 0 ? reasons.join('; ') : '各項指標處於正常置信區間內',
    };
}
'''

# 4. style.css
STYLE_CSS = '''/* ==========================================================================
   style.css - Wayne IoT Server Gen 2 Dark Industrial Glassmorphism Theme
   ST8925 LAB 專用工業深色毛玻璃設計系統
   ========================================================================== */

:root {
    --bg-base: #04070e;
    --bg-surface: rgba(11, 20, 36, 0.75);
    --bg-surface-hover: rgba(18, 30, 52, 0.85);
    --bg-card: rgba(14, 25, 45, 0.65);
    --border-subtle: rgba(255, 255, 255, 0.07);
    --border-bright: rgba(255, 255, 255, 0.16);

    --text-main: #e8eef7;
    --text-muted: #8a9bb5;
    --text-dim: #54657e;

    --accent: #ffa94d;       /* Overridden dynamically by ST8925 LAB rainbow hue */
    --accent-glow: rgba(255, 169, 77, 0.35);

    --green: #51cf66;
    --yellow: #fcc419;
    --red: #ff6b6b;
    --cyan: #38d9a9;
    --blue: #4dabf7;

    --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    --bar-h: 64px;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    background-color: var(--bg-base);
    background-image: 
        radial-gradient(circle at 15% 15%, rgba(255, 169, 77, 0.04) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(77, 171, 247, 0.04) 0%, transparent 40%);
    color: var(--text-main);
    font-family: var(--font-sans);
    min-height: 100vh;
    overflow-x: hidden;
}

/* ============ Topbar ============ */
#st8925-topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--bar-h);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 clamp(1rem, 3vw, 2.25rem);
    background: rgba(4, 7, 14, 0.75);
    backdrop-filter: blur(16px) saturate(130%);
    -webkit-backdrop-filter: blur(16px) saturate(130%);
    border-bottom: 1px solid var(--border-subtle);
    transition: border-bottom-color 0.3s ease;
}

.topbar-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.page-title {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--accent);
    text-transform: uppercase;
}

.back-link {
    color: var(--text-muted);
    text-decoration: none;
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.06em;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid var(--border-subtle);
    background: rgba(255, 255, 255, 0.03);
    transition: all 0.2s;
}

.back-link:hover {
    color: var(--text-main);
    border-color: var(--accent);
    background: rgba(255, 169, 77, 0.1);
}

/* ============ App Container ============ */
#app {
    margin-top: var(--bar-h);
    padding: 24px clamp(16px, 3vw, 36px);
    max-width: 1680px;
    margin-left: auto;
    margin-right: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* ============ Device Switcher Bar ============ */
.device-switcher-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 14px 20px;
    gap: 16px;
    backdrop-filter: blur(10px);
}

.device-selector-group {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 300px;
}

.device-selector-group label {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-muted);
}

.device-dropdown {
    background: rgba(5, 10, 20, 0.85);
    color: var(--text-main);
    border: 1px solid var(--border-bright);
    border-radius: 6px;
    padding: 8px 14px;
    font-family: var(--font-mono);
    font-size: 14px;
    outline: none;
    cursor: pointer;
    flex: 1;
    max-width: 480px;
    transition: border-color 0.2s;
}

.device-dropdown:focus {
    border-color: var(--accent);
    box-shadow: 0 0 10px var(--accent-glow);
}

.device-meta-pills {
    display: flex;
    align-items: center;
    gap: 10px;
}

.pill-tag {
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 5px 12px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-subtle);
    color: var(--text-main);
}

/* ============ Status Row ============ */
.status-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
}

.status-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    backdrop-filter: blur(10px);
    transition: transform 0.2s, border-color 0.2s;
}

.status-card:hover {
    transform: translateY(-2px);
    border-color: var(--border-bright);
}

.status-card .label {
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    display: flex;
    align-items: center;
    gap: 6px;
}

.status-card .value {
    font-size: 22px;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text-main);
}

.status-card .sub {
    font-size: 11px;
    color: var(--text-dim);
}

.status-card.active-crit {
    border-color: var(--red);
    box-shadow: 0 0 16px rgba(255, 107, 107, 0.2);
}

/* ============ Fault Control Toolbar ============ */
.fault-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 12px 18px;
    gap: 10px;
    backdrop-filter: blur(10px);
}

.fault-title {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    margin-right: 4px;
}

.btn {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-main);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    padding: 7px 13px;
    font-family: var(--font-mono);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--border-bright);
}

.btn.danger {
    color: #ff9999;
    border-color: rgba(255, 107, 107, 0.25);
    background: rgba(255, 107, 107, 0.06);
}

.btn.danger:hover {
    background: rgba(255, 107, 107, 0.18);
    border-color: var(--red);
    box-shadow: 0 0 10px rgba(255, 107, 107, 0.3);
}

.btn.active {
    background: var(--accent);
    color: #04070e;
    font-weight: 600;
    border-color: var(--accent);
}

.divider {
    width: 1px;
    height: 22px;
    background: var(--border-subtle);
    margin: 0 4px;
}

.sim-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}

.sim-controls label {
    font-size: 12px;
    font-family: var(--font-mono);
    color: var(--text-dim);
}

.sim-controls select {
    background: rgba(5, 10, 20, 0.8);
    color: var(--text-main);
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    font-family: var(--font-mono);
    outline: none;
}

/* ============ Main Grid Layout ============ */
.main-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

@media (max-width: 1100px) {
    .main-grid {
        grid-template-columns: 1fr;
    }
}

.panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    backdrop-filter: blur(12px);
}

.panel.full-width {
    grid-column: 1 / -1;
}

.panel-header {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.02);
}

.panel-header h2 {
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    gap: 8px;
}

.panel-body {
    padding: 16px 20px;
    flex: 1;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}

.dot.live {
    background: var(--green);
    box-shadow: 0 0 8px var(--green);
    animation: livePulse 2s infinite ease-in-out;
}

@keyframes livePulse {
    0%, 100% { opacity: 0.9; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
}

.badge {
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
}

.badge.normal {
    color: var(--green);
    background: rgba(81, 207, 102, 0.12);
}

.badge.critical {
    color: var(--red);
    background: rgba(255, 107, 107, 0.15);
    border: 1px solid rgba(255, 107, 107, 0.3);
}

/* ============ Charts ============ */
.chart-container {
    position: relative;
    height: 270px;
    width: 100%;
}

.chart-metric-selector {
    display: flex;
    gap: 6px;
}

.pill-btn {
    background: transparent;
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: 14px;
    font-size: 11px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: all 0.2s;
}

.pill-btn:hover {
    color: var(--text-main);
    border-color: var(--border-bright);
}

.pill-btn.active {
    background: var(--accent);
    color: #04070e;
    font-weight: 600;
    border-color: var(--accent);
}

/* ============ Modbus Grid ============ */
.modbus-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 10px;
    padding: 16px 20px;
    max-height: 380px;
    overflow-y: auto;
}

.modbus-cell {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: border-color 0.2s;
}

.modbus-cell:hover {
    border-color: var(--border-bright);
}

.modbus-cell .m-head {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
}

.modbus-cell .m-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
}

.modbus-cell .m-val {
    font-size: 17px;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text-main);
    display: flex;
    align-items: baseline;
    gap: 4px;
}

.modbus-cell .m-val .m-unit {
    font-size: 11px;
    font-weight: normal;
    color: var(--text-dim);
}

.modbus-cell.warn {
    border-color: rgba(252, 196, 25, 0.4);
    background: rgba(252, 196, 25, 0.05);
}

.modbus-cell.crit {
    border-color: rgba(255, 107, 107, 0.5);
    background: rgba(255, 107, 107, 0.08);
}

/* ============ Fleet Table ============ */
.fleet-table-wrapper {
    max-height: 290px;
    overflow-y: auto;
}

.fleet-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    text-align: left;
    font-family: var(--font-mono);
}

.fleet-table th {
    position: sticky;
    top: 0;
    background: #091220;
    color: var(--text-muted);
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-subtle);
    font-weight: 600;
}

.fleet-table td {
    padding: 9px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    color: var(--text-main);
}

.fleet-table tr:hover td {
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
}

.fleet-table tr.active-row td {
    background: rgba(255, 169, 77, 0.08);
    border-left: 2px solid var(--accent);
}

.status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
}

.status-dot.normal { background: var(--green); }
.status-dot.warning { background: var(--yellow); }
.status-dot.critical { background: var(--red); box-shadow: 0 0 6px var(--red); }

/* ============ Alarm List ============ */
.alarm-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 270px;
    overflow-y: auto;
}

.alarm-item {
    background: var(--bg-card);
    border-left: 3px solid var(--border-subtle);
    border-radius: 0 6px 6px 0;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
}

.alarm-item:hover {
    background: var(--bg-surface-hover);
}

.alarm-item.critical {
    border-left-color: var(--red);
    background: rgba(255, 107, 107, 0.06);
}

.alarm-item.warning {
    border-left-color: var(--yellow);
    background: rgba(252, 196, 25, 0.05);
}

.alarm-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.alarm-name {
    font-weight: 600;
    color: var(--text-main);
}

.alarm-sub {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
}

.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-dim);
    font-size: 13px;
    font-family: var(--font-mono);
}

/* ============ Dynamic Rule Display ============ */
.rule-intro {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 12px;
    line-height: 1.5;
}

.rule-intro code {
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
    color: var(--accent);
}

.rule-json {
    background: rgba(2, 5, 12, 0.9);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 16px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: #a5d8ff;
    max-height: 240px;
    overflow-y: auto;
    white-space: pre;
}

/* ============ Modal ============ */
.modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.modal-card {
    background: #0d1829;
    border: 1px solid var(--border-bright);
    border-radius: 12px;
    width: 100%;
    max-width: 540px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    overflow: hidden;
}

.modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.modal-header h3 {
    font-size: 15px;
    font-weight: 600;
    font-family: var(--font-mono);
    color: var(--text-main);
}

.modal-close {
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 18px;
    cursor: pointer;
}

.modal-close:hover {
    color: var(--text-main);
}

.modal-body {
    padding: 20px;
}

.preview-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}

.tab-btn {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
    padding: 8px 12px;
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 12px;
    cursor: pointer;
}

.tab-btn.active {
    background: var(--accent);
    color: #04070e;
    font-weight: 600;
    border-color: var(--accent);
}

.preview-content {
    background: #060b14;
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 16px;
    font-family: var(--font-mono);
    font-size: 12px;
}

/* ============ Footer ============ */
.footer {
    text-align: center;
    padding: 24px 0 12px;
    color: var(--text-dim);
    font-size: 12px;
    font-family: var(--font-mono);
}

/* Custom Scrollbars */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
}
::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}
'''

# 5. app.js
APP_JS = '''// =========================================================================
//  app.js - Wayne IoT Gen 2 Simulator & Monitor - Main Application
//  前端核心主模組：驅動 21 台機組遙測、Modbus 矩陣更新、圖表繪製與 AI 預測
// =========================================================================

import { ProductionFleetManager, PRODUCTION_FLEET, WEST_LAKE_REGISTERS } from './modules/fleet-simulator.js';
import { AlarmRuleEngine, DEFAULT_RULES } from './modules/rule-engine.js';
import { predictTrend, detectAnomaly } from './modules/ai-predictor.js';

// ── State ──
let fleet = null;
let ruleEngine = null;
let simInterval = null;
let isRunning = false;
let tickCounter = 0;
let currentChartMode = 'temp'; // 'temp' | 'pressure' | 'power'
let selectedModalAlarm = null;

// ── DOM Helpers ──
const $ = id => document.getElementById(id);

// ── Chart Instances ──
let chartRealtime = null;
let chartPrediction = null;

// ── Initialize ──
function init() {
    fleet = new ProductionFleetManager();
    ruleEngine = new AlarmRuleEngine(JSON.parse(JSON.stringify(DEFAULT_RULES)));
    tickCounter = 0;

    // Populate Device Dropdown with 21 Real Devices
    populateDeviceDropdown();

    // Display Rules in Sandbox
    $('ruleDisplay').textContent = JSON.stringify(DEFAULT_RULES, null, 2);

    // Init Charts
    initCharts();

    // Bind Event Listeners
    bindEvents();

    // Initial render of Modbus matrix
    updateModbusGrid();

    // Start Simulation automatically
    startSimulation();
}

function populateDeviceDropdown() {
    const select = $('deviceSelect');
    select.innerHTML = '';
    for (const dev of PRODUCTION_FLEET) {
        const opt = document.createElement('option');
        opt.value = dev.id;
        opt.textContent = `${dev.id}. ${dev.name} (${dev.sn})`;
        if (dev.id === 15) opt.selected = true; // Default West Lake Station #1
        select.appendChild(opt);
    }
}

function bindEvents() {
    // Device switch
    $('deviceSelect').addEventListener('change', e => {
        fleet.setActiveMachine(e.target.value);
        updateActiveDeviceLabels();
        updateModbusGrid();
        refreshCharts();
    });

    // Sim pause / resume
    $('btnPause').addEventListener('click', () => {
        if (isRunning) {
            pauseSimulation();
            $('btnPause').textContent = '▶ 繼續 (RESUME)';
            $('btnPause').classList.add('active');
        } else {
            startSimulation();
            $('btnPause').textContent = '⏸ 暫停 (PAUSE)';
            $('btnPause').classList.remove('active');
        }
    });

    // Fault injection buttons
    document.querySelectorAll('[data-fault]').forEach(btn => {
        btn.addEventListener('click', () => {
            const faultType = btn.dataset.fault;
            fleet.injectFault(faultType);
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 2000);
        });
    });

    // Clear faults
    $('btnClearFaults').addEventListener('click', () => {
        fleet.clearAllFaults();
    });

    // Sim speed selector
    $('simSpeed').addEventListener('change', e => {
        const speed = parseInt(e.target.value);
        if (isRunning) {
            pauseSimulation();
            startSimulation(speed);
        }
    });

    // Chart metric tabs
    document.querySelectorAll('[data-chart]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-chart]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartMode = btn.dataset.chart;
            updateRealtimeChartLabels();
            refreshCharts();
        });
    });

    // Modal close
    $('btnCloseModal').addEventListener('click', () => {
        $('notificationModal').style.display = 'none';
    });

    // Modal Tabs
    $('tabLine').addEventListener('click', () => {
        $('tabLine').classList.add('active');
        $('tabFcm').classList.remove('active');
        renderModalContent('line');
    });
    $('tabFcm').addEventListener('click', () => {
        $('tabFcm').classList.add('active');
        $('tabLine').classList.remove('active');
        renderModalContent('fcm');
    });
}

function startSimulation(intervalMs = 1000) {
    if (simInterval) clearInterval(simInterval);
    isRunning = true;
    simInterval = setInterval(tick, intervalMs);
}

function pauseSimulation() {
    isRunning = false;
    if (simInterval) clearInterval(simInterval);
    simInterval = null;
}

// ── Simulation Tick ──
function tick() {
    tickCounter++;
    const snapshots = fleet.tickAll();

    // Evaluate rules for all snapshots
    for (const snap of snapshots) {
        const devInfo = PRODUCTION_FLEET.find(d => d.id === snap.machineId) || {};
        ruleEngine.evaluateSnapshot(snap, devInfo);
    }

    // Update UI elements
    updateStatusSummary();
    updateActiveDeviceLabels();
    updateModbusGrid();
    updateFleetTable();
    updateAlarmList();
    updateCharts(snapshots);
}

function updateStatusSummary() {
    const summary = fleet.getStatusSummary();
    $('statNormal').textContent = summary.normal;
    $('statWarning').textContent = summary.warning;
    $('statCritical').textContent = summary.critical;

    const lat = fleet.getLatencyPercentiles();
    $('statP99').textContent = lat.p99;

    const dev = fleet.getActiveMachine();
    $('metaSn').textContent = dev.serialNumber;
    $('metaType').textContent = `${dev.type.toUpperCase()} (${dev.model})`;
    $('metaStatus').textContent = dev.status === 'critical' ? '🔴 緊急警報' : (dev.status === 'warning' ? '🟡 異常預警' : '🟢 運轉正常');
    $('metaStatus').style.color = dev.status === 'critical' ? 'var(--red)' : (dev.status === 'warning' ? 'var(--yellow)' : 'var(--green)');
}

function updateActiveDeviceLabels() {
    const dev = fleet.getActiveMachine();
    $('chartTargetLabel').textContent = `${dev.name} (${dev.serialNumber})`;
    $('tableTargetLabel').textContent = `${dev.serialNumber}`;
}

function updateModbusGrid() {
    const dev = fleet.getActiveMachine();
    const hist = fleet.getHistory(dev.machineId);
    const latest = hist.length > 0 ? hist[hist.length - 1] : null;
    const grid = $('modbusRegisterGrid');

    grid.innerHTML = '';
    const telemetry = latest ? latest.data : {};

    for (const [code, meta] of Object.entries(WEST_LAKE_REGISTERS)) {
        const val = telemetry[code] !== undefined ? telemetry[code] : meta.base;
        const cell = document.createElement('div');
        cell.className = 'modbus-cell';

        let valDisplay = val;
        let isWarn = false, isCrit = false;

        if (meta.type === 'digital') {
            valDisplay = val === 1 ? 'ACTIVE (1)' : 'OFF (0)';
            if (code === 'AAA0013' && val === 1) isCrit = true;
            if (code === 'AAA0018' && val === 1) isCrit = true;
            if (code === 'AAA0003' && val === 1) isWarn = true;
        } else {
            valDisplay = typeof val === 'number' ? val.toFixed(2) : val;
            if (code === 'AAA0036' && val > 18.0) isCrit = true;
            else if (code === 'AAA0036' && val > 17.0) isWarn = true;
            if (code === 'AAA0028' && val < 5.0) isCrit = true;
            if (code === 'AAA0037' && val < 2.2) isCrit = true;
            if (code === 'AAA0045' && val < 3.8) isWarn = true;
        }

        if (isCrit) cell.classList.add('crit');
        else if (isWarn) cell.classList.add('warn');

        cell.innerHTML = `
            <div class="m-head">
                <span>${code}</span>
                <span>${meta.type.toUpperCase()}</span>
            </div>
            <div class="m-name">${meta.name}</div>
            <div class="m-val">
                ${valDisplay} <span class="m-unit">${meta.unit || ''}</span>
            </div>
        `;
        grid.appendChild(cell);
    }
}

function updateFleetTable() {
    const tbody = $('fleetTableBody');
    tbody.innerHTML = '';
    const activeId = fleet.activeMachineId;

    for (const dev of PRODUCTION_FLEET) {
        const hist = fleet.getHistory(dev.id);
        const latest = hist.length > 0 ? hist[hist.length - 1] : null;
        const status = latest ? latest.status : 'normal';

        const tr = document.createElement('tr');
        if (dev.id === activeId) tr.classList.add('active-row');

        const cop = latest ? latest.cop.toFixed(2) : '-';
        const pwr = latest ? latest.powerKw.toFixed(1) + ' kW' : '-';
        const sup = latest ? latest.chilledSupply.toFixed(1) + ' °C' : '-';
        const hp = latest ? latest.highPressure.toFixed(1) + ' kg' : '-';

        tr.innerHTML = `
            <td>${dev.id}</td>
            <td><b>${dev.name}</b> <span style="color:var(--text-dim)">(${dev.sn})</span></td>
            <td>${dev.type}</td>
            <td><span class="status-dot ${status}"></span> ${status.toUpperCase()}</td>
            <td>${sup}</td>
            <td>${hp}</td>
            <td><b>${cop}</b></td>
            <td>${latest && latest.status !== 'normal' ? '⚠️ 異常中' : '穩健 (0.05)'}</td>
        `;

        tr.addEventListener('click', () => {
            fleet.setActiveMachine(dev.id);
            $('deviceSelect').value = dev.id;
            updateActiveDeviceLabels();
            updateModbusGrid();
            refreshCharts();
        });

        tbody.appendChild(tr);
    }
}

function updateAlarmList() {
    const list = $('alarmList');
    const alarms = ruleEngine.getAlarmHistory(15);
    const countBadge = $('alarmCount');

    if (alarms.length === 0) {
        list.innerHTML = '<div class="empty-state">目前無活躍警報 — 系統運轉指標正常</div>';
        countBadge.style.display = 'none';
        return;
    }

    countBadge.style.display = 'inline-block';
    countBadge.textContent = alarms.length;

    list.innerHTML = '';
    for (const alm of alarms) {
        const item = document.createElement('div');
        item.className = `alarm-item ${alm.severity}`;
        item.innerHTML = `
            <div class="alarm-info">
                <div class="alarm-name">${alm.severity === 'critical' ? '🔴' : '🟡'} ${alm.ruleName}</div>
                <div class="alarm-sub">${alm.machineName} (${alm.serialNumber}) • ${alm.timeLabel}</div>
            </div>
            <button class="pill-btn" style="border-color:var(--border-bright);">預覽推播 ↗</button>
        `;
        item.addEventListener('click', () => openNotificationModal(alm));
        list.appendChild(item);
    }
}

function openNotificationModal(alarm) {
    selectedModalAlarm = alarm;
    $('notificationModal').style.display = 'flex';
    renderModalContent('line');
}

function renderModalContent(channel) {
    if (!selectedModalAlarm) return;
    const alm = selectedModalAlarm;
    const container = $('previewContent');

    if (channel === 'line') {
        container.innerHTML = `
            <div style="background:#06c755; color:#fff; padding:6px 12px; border-radius:4px 4px 0 0; font-weight:bold;">
                LINE Notify / Flex Message
            </div>
            <div style="padding:12px; background:#1e293b; color:#fff; border-radius:0 0 4px 4px; line-height:1.6;">
                <div style="color:${alm.severity === 'critical' ? '#ff6b6b' : '#fcc419'}; font-weight:bold; font-size:14px;">
                    【機房警報通知】${alm.ruleName}
                </div>
                <hr style="border:none; border-top:1px solid #334155; margin:8px 0;" />
                <div><b>設備名稱：</b>${alm.machineName}</div>
                <div><b>設備序號：</b>${alm.serialNumber}</div>
                <div><b>告警時間：</b>${alm.timestamp}</div>
                <div><b>警報層級：</b>${alm.severity.toUpperCase()}</div>
                <div><b>詳細說明：</b>${alm.description}</div>
                <hr style="border:none; border-top:1px solid #334155; margin:8px 0;" />
                <div style="color:#94a3b8; font-size:11px;">Wayne IoT Server Gen 2 自動派發系統</div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="background:#f59e0b; color:#000; padding:6px 12px; border-radius:4px 4px 0 0; font-weight:bold;">
                Flutter App - Firebase Cloud Messaging (FCM)
            </div>
            <div style="padding:12px; background:#1e293b; color:#fff; border-radius:0 0 4px 4px; line-height:1.6;">
                <div style="color:#60a5fa; font-weight:bold;">notification.title: 【IoT 警報】${alm.machineName}</div>
                <div>notification.body: ${alm.ruleName} (${alm.description})</div>
                <pre style="margin-top:8px; background:#0f172a; padding:8px; border-radius:4px; font-size:11px; color:#38d9a9;">
data: {
  "alarm_id": "${alm.id}",
  "machine_id": "${alm.machineId}",
  "rule_code": "${alm.ruleCode}",
  "severity": "${alm.severity}",
  "click_action": "FLUTTER_NOTIFICATION_CLICK"
}</pre>
            </div>
        `;
    }
}

// ── Chart.js Setup ──
function initCharts() {
    // 1. Realtime Telemetry Chart
    const ctxRealtime = $('chartRealtime').getContext('2d');
    chartRealtime = new Chart(ctxRealtime, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '冰水出水溫 (°C)',
                    data: [],
                    borderColor: '#38d9a9',
                    backgroundColor: 'rgba(56, 217, 169, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                },
                {
                    label: '冰水回水溫 (°C)',
                    data: [],
                    borderColor: '#4dabf7',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    tension: 0.3,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8a9bb5', font: { family: 'monospace', size: 10 } },
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8a9bb5', font: { family: 'monospace', size: 10 } },
                },
            },
            plugins: {
                legend: { labels: { color: '#e8eef7', font: { family: 'monospace', size: 11 } } },
            },
        },
    });

    // 2. AI Prediction Chart
    const ctxPred = $('chartPrediction').getContext('2d');
    chartPrediction = new Chart(ctxPred, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Prophet 預測負載 (kW)',
                    data: [],
                    borderColor: '#ffa94d',
                    backgroundColor: 'rgba(255, 169, 77, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: '+1',
                },
                {
                    label: '預測上限 Upper (kW)',
                    data: [],
                    borderColor: 'rgba(255, 169, 77, 0.3)',
                    borderWidth: 1,
                    borderDash: [2, 2],
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: '預測下限 Lower (kW)',
                    data: [],
                    borderColor: 'rgba(255, 169, 77, 0.3)',
                    borderWidth: 1,
                    borderDash: [2, 2],
                    pointRadius: 0,
                    fill: '-1',
                    backgroundColor: 'rgba(255, 169, 77, 0.05)',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8a9bb5', font: { family: 'monospace', size: 10 } },
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8a9bb5', font: { family: 'monospace', size: 10 } },
                },
            },
            plugins: {
                legend: { labels: { color: '#e8eef7', font: { family: 'monospace', size: 11 } } },
            },
        },
    });
}

function updateRealtimeChartLabels() {
    if (!chartRealtime) return;
    if (currentChartMode === 'temp') {
        chartRealtime.data.datasets[0].label = '冰水出水溫 (°C)';
        chartRealtime.data.datasets[0].borderColor = '#38d9a9';
        chartRealtime.data.datasets[1].label = '冰水回水溫 (°C)';
        chartRealtime.data.datasets[1].borderColor = '#4dabf7';
    } else if (currentChartMode === 'pressure') {
        chartRealtime.data.datasets[0].label = '冷媒高壓 (kg/cm²)';
        chartRealtime.data.datasets[0].borderColor = '#ff6b6b';
        chartRealtime.data.datasets[1].label = '冷媒低壓 (kg/cm²)';
        chartRealtime.data.datasets[1].borderColor = '#fcc419';
    } else {
        chartRealtime.data.datasets[0].label = '實體總功率 (kW)';
        chartRealtime.data.datasets[0].borderColor = '#ffa94d';
        chartRealtime.data.datasets[1].label = '即時 COP 能效';
        chartRealtime.data.datasets[1].borderColor = '#69db7c';
    }
}

function refreshCharts() {
    const dev = fleet.getActiveMachine();
    const hist = fleet.getHistory(dev.machineId);
    if (!chartRealtime) return;

    chartRealtime.data.labels = hist.map(s => s.timeLabel);
    if (currentChartMode === 'temp') {
        chartRealtime.data.datasets[0].data = hist.map(s => s.data.AAA0028);
        chartRealtime.data.datasets[1].data = hist.map(s => s.data.AAA0029);
    } else if (currentChartMode === 'pressure') {
        chartRealtime.data.datasets[0].data = hist.map(s => s.data.AAA0036);
        chartRealtime.data.datasets[1].data = hist.map(s => s.data.AAA0037);
    } else {
        chartRealtime.data.datasets[0].data = hist.map(s => s.data.AAA0059);
        chartRealtime.data.datasets[1].data = hist.map(s => s.data.AAA0045);
    }
    chartRealtime.update();

    // AI Prediction
    const preds = predictTrend(hist, 24);
    chartPrediction.data.labels = preds.map(p => p.time);
    chartPrediction.data.datasets[0].data = preds.map(p => p.yhatPower);
    chartPrediction.data.datasets[1].data = preds.map(p => p.yhatUpper);
    chartPrediction.data.datasets[2].data = preds.map(p => p.yhatLower);
    chartPrediction.update();
}

function updateCharts(snapshots) {
    if (tickCounter % 2 === 0) {
        refreshCharts();
    }
}

// ── Startup ──
window.addEventListener('DOMContentLoaded', init);
'''

# 6. index.html
INDEX_HTML = '''<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ST8925 LAB — IoT Gen 2 Simulator & Monitor</title>
    <meta name="description" content="Wayne IoT Server Gen 2 - 生產級冰水主機模擬監控系統，支援 21 台實體機組遙測、Modbus 矩陣與動態警報規則。">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="../shared/wordmark.css">
</head>
<body>

<!-- ============ TOP BAR ============ -->
<header id="st8925-topbar">
    <a id="wordmark" href="../index.html" aria-label="ST8925 LAB"></a>
    <div class="topbar-right">
        <span class="page-title">IOT GEN2 SIMULATOR & MONITOR</span>
        <a class="back-link" href="../index.html">&larr; BACK TO ORBIT</a>
    </div>
</header>

<!-- ============ APP ROOT ============ -->
<div id="app">

    <!-- ── Device Selector & Global Switcher ── -->
    <div class="device-switcher-bar">
        <div class="device-selector-group">
            <label for="deviceSelect">🔍 目標監控機組 / Active Monitored Device:</label>
            <select id="deviceSelect" class="device-dropdown">
                <!-- Populated dynamically with 21 real production machines -->
            </select>
        </div>
        <div class="device-meta-pills" id="deviceMetaPills">
            <span class="pill-tag"><b id="metaSn">ECO-CH-01</b></span>
            <span class="pill-tag" id="metaType">Chiller (100RT)</span>
            <span class="pill-tag" id="metaStatus">🟢 運轉正常</span>
        </div>
    </div>

    <!-- ── Status Summary Row ── -->
    <section class="status-row" id="statusRow">
        <div class="status-card">
            <span class="label">🟢 正常 Normal</span>
            <span class="value" id="statNormal">21</span>
            <span class="sub">生產在線運轉中</span>
        </div>
        <div class="status-card">
            <span class="label">🟡 預警 Warning</span>
            <span class="value" id="statWarning">0</span>
            <span class="sub">能效劣化 / 趨近門檻</span>
        </div>
        <div class="status-card">
            <span class="label">🔴 緊急 Critical</span>
            <span class="value" id="statCritical">0</span>
            <span class="sub">停機保護 / 故障跳脫</span>
        </div>
        <div class="status-card">
            <span class="label">⚡ 吞吐延遲 Ingest p99</span>
            <span class="value"><span id="statP99">1.8</span> <small style="font-size:14px;">ms</small></span>
            <span class="sub">SLA Target &lt; 30ms</span>
        </div>
        <div class="status-card">
            <span class="label">📊 壓縮率 Compression</span>
            <span class="value">91.4<small style="font-size:14px;">%</small></span>
            <span class="sub">TimescaleDB Hypertable</span>
        </div>
    </section>

    <!-- ── Fault Injection & Simulation Toolbar ── -->
    <div class="fault-toolbar">
        <span class="fault-title">⚙️ 故障注入模擬器 / Fault Injector:</span>
        <button class="btn" id="btnPause">⏸ 暫停 (PAUSE)</button>
        <span class="divider"></span>
        <button class="btn danger" data-fault="high_pressure">🔥 冷媒高壓跳脫 (AAA0036)</button>
        <button class="btn danger" data-fault="freeze_alarm">❄️ 防凍保護警報 (AAA0013)</button>
        <button class="btn danger" data-fault="overcurrent">⚡ 壓縮機過載 (AAA0018)</button>
        <button class="btn danger" data-fault="low_pressure_trip">⚠️ 冷媒低壓過低 (AAA0037)</button>
        <button class="btn danger" data-fault="cooling_efficiency_loss">📉 散熱不良 (出水高溫)</button>
        <button class="btn" id="btnClearFaults">🧹 清除所有故障</button>
        <span style="flex:1;"></span>
        <div class="sim-controls">
            <label>模擬頻率:</label>
            <select id="simSpeed">
                <option value="2000">0.5x (2s/tick)</option>
                <option value="1000" selected>1x (1s/tick)</option>
                <option value="500">2x (0.5s/tick)</option>
            </select>
        </div>
    </div>

    <!-- ── Main Grid Layout ── -->
    <div class="main-grid">

        <!-- Panel 1: Real-Time Trends for Selected Device -->
        <div class="panel">
            <div class="panel-header">
                <h2><span class="dot live"></span> 即時遙測趨勢 / Real-Time Telemetry (<span id="chartTargetLabel">內湖生技-西側1號主機</span>)</h2>
                <div class="chart-metric-selector">
                    <button class="pill-btn active" data-chart="temp">溫差 (°C)</button>
                    <button class="pill-btn" data-chart="pressure">高低壓 (kg/cm²)</button>
                    <button class="pill-btn" data-chart="power">功率 & COP</button>
                </div>
            </div>
            <div class="panel-body">
                <div class="chart-container">
                    <canvas id="chartRealtime"></canvas>
                </div>
            </div>
        </div>

        <!-- Panel 2: AI 48h Predictive Forecast -->
        <div class="panel">
            <div class="panel-header">
                <h2><span class="dot live"></span> AI 負載 48h 趨勢預測 / Prophet Trend Forecast</h2>
                <span class="badge normal" id="aiAnomalyBadge">異常評分: 0.05 (穩健)</span>
            </div>
            <div class="panel-body">
                <div class="chart-container">
                    <canvas id="chartPrediction"></canvas>
                </div>
            </div>
        </div>

        <!-- Panel 3: Active Device Modbus Register Matrix -->
        <div class="panel full-width">
            <div class="panel-header">
                <h2>📋 當前設備 Modbus 暫存器即時遙測 / Live Modbus Register Telemetry (<span id="tableTargetLabel">ECO-CH-01</span>)</h2>
                <span class="badge" style="background:rgba(255,255,255,0.06); color:var(--cyan);">週期上報 1000ms</span>
            </div>
            <div class="panel-body" style="padding:0;">
                <div class="modbus-grid" id="modbusRegisterGrid">
                    <!-- Populated dynamically with AAA0001 ~ AAA0059 -->
                </div>
            </div>
        </div>

        <!-- Panel 4: Fleet Overview (21 Real Devices) -->
        <div class="panel">
            <div class="panel-header">
                <h2>🏢 跨廠區機隊 21 台設備矩陣 / Production Fleet Matrix</h2>
            </div>
            <div class="panel-body" style="padding:0;">
                <div class="fleet-table-wrapper scrollable">
                    <table class="fleet-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>機組 / 設備序號</th>
                                <th>類型</th>
                                <th>狀態</th>
                                <th>出水溫</th>
                                <th>高壓</th>
                                <th>COP</th>
                                <th>AI 異常評估</th>
                            </tr>
                        </thead>
                        <tbody id="fleetTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Panel 5: Alarm Log & Notification Preview -->
        <div class="panel" id="alarmPanel">
            <div class="panel-header">
                <h2>🚨 警報日誌與推播預覽 / Alarm Log & Push Preview</h2>
                <span class="badge critical" id="alarmCount" style="display:none;">0</span>
            </div>
            <div class="panel-body" style="padding:12px 16px;">
                <div class="alarm-list" id="alarmList">
                    <div class="empty-state">無活躍警報 — 系統各項運轉指標正常</div>
                </div>
            </div>
        </div>

        <!-- Panel 6: Dynamic Rule Engine Sandbox -->
        <div class="panel full-width">
            <div class="panel-header">
                <h2>⚙️ 動態規則引擎沙盒 / Dynamic Rule Engine Sandbox</h2>
                <span class="badge normal">TimescaleDB / Redis 條件樹求值</span>
            </div>
            <div class="panel-body">
                <p class="rule-intro">
                    本架構將傳統 <code>Alarmcondition.php</code> 的 3,151 行寫死 PHP 邏輯全面重構為結構化 JSON 條件樹。生產 VPS 於 Worker 啟動時預加載至 Redis，每次上報僅需 500μs 記憶體比對，徹底消除每次 HTTP Request 執行 3,151 次判定之瓶頸。
                </p>
                <div class="rule-json" id="ruleDisplay">載入規則中...</div>
            </div>
        </div>

    </div><!-- /.main-grid -->

    <!-- ── Notification Preview Modal ── -->
    <div id="notificationModal" class="modal-backdrop" style="display:none;">
        <div class="modal-card">
            <div class="modal-header">
                <h3>🔔 多通道警報推播預覽 (Multi-Channel Dispatcher)</h3>
                <button class="modal-close" id="btnCloseModal">✕</button>
            </div>
            <div class="modal-body">
                <div class="preview-tabs">
                    <button class="tab-btn active" id="tabLine">LINE Flex Message</button>
                    <button class="tab-btn" id="tabFcm">Flutter FCM Push</button>
                </div>
                <div class="preview-content" id="previewContent"></div>
            </div>
        </div>
    </div>

    <footer class="footer">
        Wayne IoT Server Gen 2 • Staging Simulation Console • Aligned with Production Architecture • 2026
    </footer>

</div><!-- /#app -->

<!-- ============ Dependencies ============ -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script src="../config.js"></script>
<script src="../shared/wordmark.js"></script>

<!-- ============ Main App Module ============ -->
<script type="module" src="app.js"></script>

<script>
const MY_ID = '02';
const idx  = PROJECTS.findIndex(p => p.id === MY_ID);
const proj = PROJECTS[idx];
const hue = new URLSearchParams(location.search).get('hue');
const col = RAINBOW.find(c => c.name === hue) || RAINBOW[idx % RAINBOW.length];
document.documentElement.style.setProperty('--accent', col.hex);
document.documentElement.style.setProperty('--c', col.hex);
document.getElementById('st8925-topbar').style.borderBottomColor = col.hex;
initWordmark('wordmark', SITE_NAME);
</script>
</body>
</html>
'''

# 7. README.md
README_MD = '''# ST8925 LAB — Project 02: Wayne IoT Server Gen 2 (Simulation & Production Console)

> **專案代碼**: `02`  
> **專案標籤**: `IOT GEN2 SIMULATOR & MONITOR`  
> **路由路徑**: `/project-02/index.html` (對應首頁第二軌道環)  
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

## 3. VPS 生產環境部署套件 (`project-02/vps/`)

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
'''

# 8. PROMPT.md
PROMPT_MD = '''# ST8925 LAB — Project 02: Rebuild & Maintenance Prompt

> **Project ID**: `02`  
> **Display Label**: `IOT GEN2 SIMULATOR & MONITOR`  
> **Folder / Slug**: `project-02`  
> **Last Updated**: 2026-08-17

---

## 1. Directory Structure

```
project-02/
├── index.html                  # 主頁面：整合 Topbar、圖表、Modbus 矩陣與警報列表
├── app.js                      # 前端控制器：整合機隊模擬、動態規則求值與 Chart.js
├── style.css                   # 深色科技毛玻璃設計系統
├── modules/
│   ├── fleet-simulator.js      # 21 台機組熱力學遙測循環與故障注入
│   ├── rule-engine.js          # 動態 JSON 條件樹警報規則引擎
│   └── ai-predictor.js         # Prophet 48h 趨勢預測與孤立森林異常檢測
├── vps/                        # VPS 生產環境部署完整套件
├── README.md                   # 專案架構與操作說明
└── PROMPT.md                   # 維護與重建規範
```

---

## 2. Invariants & Rules

1. **`MY_ID` 定義**: `index.html` 內必須宣告 `const MY_ID = '02';`。
2. **單一資料源**: 必須引入 `../config.js` 與 `../shared/wordmark.js`。
3. **驗證指令**: 修改後必須執行 `$env:PYTHONIOENCODING="utf-8"; python verify.py` 確認通過所有測試。
'''

# Write files
(PROJECT_DIR / "index.html").write_text(INDEX_HTML, encoding="utf-8")
(PROJECT_DIR / "style.css").write_text(STYLE_CSS, encoding="utf-8")
(PROJECT_DIR / "app.js").write_text(APP_JS, encoding="utf-8")
(MODULES_DIR / "fleet-simulator.js").write_text(FLEET_SIMULATOR_JS, encoding="utf-8")
(MODULES_DIR / "rule-engine.js").write_text(RULE_ENGINE_JS, encoding="utf-8")
(MODULES_DIR / "ai-predictor.js").write_text(AI_PREDICTOR_JS, encoding="utf-8")
(PROJECT_DIR / "README.md").write_text(README_MD, encoding="utf-8")
(PROJECT_DIR / "PROMPT.md").write_text(PROMPT_MD, encoding="utf-8")

# Copy VPS tree if source exists
if SOURCE_VPS.is_dir():
    for item in SOURCE_VPS.rglob("*"):
        rel_path = item.relative_to(SOURCE_VPS)
        dest_path = VPS_DIR / rel_path
        if item.is_dir():
            dest_path.mkdir(parents=True, exist_ok=True)
        else:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest_path)
    print("VPS tree copied successfully.")

print("All Project 02 files written successfully!")
