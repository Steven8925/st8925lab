// =========================================================================
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
