// =========================================================================
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
