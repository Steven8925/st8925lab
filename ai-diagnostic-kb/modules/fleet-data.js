// =========================================================================
//  fleet-data.js — Fleet Directory & 21 Machine Metadata & Baseline Meta
// =========================================================================

export const FLEET_MACHINES = [
    { id: 15, cid: 1, name: 'A區智慧園區-南區1號冰水主機', sn: 'ECO-CH-01', model: 'ECO-100RT', type: 'chiller', capacity: 100, status: 'warning', degradation: 'condenser_fouling' },
    { id: 16, cid: 1, name: 'A區智慧園區-南區1號冷卻水塔', sn: 'ECO-CT-01', model: 'CT-120', type: 'tower', capacity: 120, status: 'normal' },
    { id: 17, cid: 1, name: 'A區智慧園區-南區2號冰水主機', sn: 'ECO-CH-02', model: 'ECO-100RT', type: 'chiller', capacity: 100, status: 'normal' },
    { id: 18, cid: 1, name: 'A區智慧園區-南區2號冷卻水塔', sn: 'ECO-CT-02', model: 'CT-120', type: 'tower', capacity: 120, status: 'normal' },
    { id: 19, cid: 1, name: 'A區智慧園區-北區1號冰水主機', sn: 'ECO-CH-03', model: 'ECO-100RT', type: 'chiller', capacity: 100, status: 'normal' },
    { id: 20, cid: 1, name: 'A區智慧園區-北區1號冷卻水塔', sn: 'ECO-CT-03', model: 'CT-120', type: 'tower', capacity: 120, status: 'normal' },
    { id: 21, cid: 1, name: 'A區智慧園區-北區2號冰水主機', sn: 'ECO-CH-04', model: 'ECO-100RT', type: 'chiller', capacity: 100, status: 'normal' },
    { id: 22, cid: 1, name: 'A區智慧園區-北區2號冷卻水塔', sn: 'ECO-CT-04', model: 'CT-120', type: 'tower', capacity: 120, status: 'normal' },
    { id: 5,  cid: 2, name: 'B區醫療中心-急重症1號主機', sn: 'MED-CH-01', model: 'MED-200RT', type: 'chiller', capacity: 200, status: 'normal' },
    { id: 7,  cid: 3, name: 'C區金融總部-大樓1號主機', sn: 'FIN-CH-01', model: 'FIN-80RT', type: 'chiller', capacity: 80, status: 'normal' },
    { id: 8,  cid: 3, name: 'C區金融總部-大樓2號主機', sn: 'FIN-CH-02', model: 'FIN-80RT', type: 'chiller', capacity: 80, status: 'normal' },
    { id: 6,  cid: 4, name: 'D區科技園區-晶圓一廠8號機', sn: 'SEMI-CH-01', model: 'SEMI-150RT', type: 'chiller', capacity: 150, status: 'critical', degradation: 'refrigerant_leak' },
    { id: 12, cid: 4, name: 'D區科技園區-封裝二廠主機', sn: 'SEMI-CH-02', model: 'SEMI-150RT', type: 'chiller', capacity: 150, status: 'normal' },
    { id: 13, cid: 4, name: 'D區科技園區-研發總部主機', sn: 'SEMI-CH-03', model: 'SEMI-150RT', type: 'chiller', capacity: 150, status: 'normal' },
    { id: 11, cid: 5, name: 'E區研究醫院-研究棟2號主機', sn: 'HOSP-CH-01', model: 'HOSP-250RT', type: 'chiller', capacity: 250, status: 'normal' },
    { id: 14, cid: 5, name: 'E區研究醫院-門診棟3號主機', sn: 'HOSP-CH-02', model: 'HOSP-250RT', type: 'chiller', capacity: 250, status: 'normal' },
    { id: 23, cid: 6, name: 'F區生醫大樓-一號醫療主機', sn: 'BIOMED-CH-01', model: 'BIO-300RT', type: 'chiller', capacity: 300, status: 'warning', degradation: 'evaporator_fouling' },
    { id: 24, cid: 6, name: 'F區生醫大樓-二號醫療主機', sn: 'BIOMED-CH-02', model: 'BIO-300RT', type: 'chiller', capacity: 300, status: 'normal' },
    { id: 9,  cid: 7, name: 'G區精密製造-產線50RT主機', sn: 'MFG-CH-01', model: 'MFG-50RT', type: 'chiller', capacity: 50, status: 'normal' },
    { id: 10, cid: 7, name: 'G區精密製造-產線100RT主機', sn: 'MFG-CH-02', model: 'MFG-100RT', type: 'chiller', capacity: 100, status: 'normal' },
    { id: 4,  cid: 8, name: 'H區綠能廠辦-示範1號主機', sn: 'GRN-CH-01', model: 'GRN-60RT', type: 'chiller', capacity: 60, status: 'normal' }
];

export const REGISTER_DEFINITIONS = {
    'AAA0028': { code: 'AAA0028', name: '冰水出水溫度', en: 'Chilled Water Supply Temp', unit: '°C', base: 8.20, std: 0.35, min: 6.5, max: 10.5 },
    'AAA0029': { code: 'AAA0029', name: '冰水回水溫度', en: 'Chilled Water Return Temp', unit: '°C', base: 12.80, std: 0.45, min: 11.0, max: 15.0 },
    'AAA0030': { code: 'AAA0030', name: '冷卻水出水溫度', en: 'Condenser Leaving Water Temp', unit: '°C', base: 34.50, std: 0.65, min: 31.0, max: 37.0 },
    'AAA0031': { code: 'AAA0031', name: '冷卻水入水溫度', en: 'Condenser Entering Water Temp', unit: '°C', base: 29.50, std: 0.50, min: 27.0, max: 31.5 },
    'AAA0036': { code: 'AAA0036', name: '冷媒高壓壓力', en: 'Refrigerant High Pressure', unit: 'kg/cm²', base: 15.60, std: 0.45, min: 14.0, max: 18.5 },
    'AAA0037': { code: 'AAA0037', name: '冷媒低壓壓力', en: 'Refrigerant Low Pressure', unit: 'kg/cm²', base: 3.80, std: 0.18, min: 3.2, max: 4.8 },
    'AAA0045': { code: 'AAA0045', name: '即時能效 COP', en: 'Coefficient of Performance', unit: '', base: 5.20, std: 0.30, min: 4.0, max: 6.2 },
    'AAA0059': { code: 'AAA0059', name: '實體總功率', en: 'Total Electrical Power', unit: 'kW', base: 78.50, std: 6.50, min: 35.0, max: 160.0 },
};

export function generateMachineTelemetryHistory(machineId, days = 30) {
    const history = [];
    const now = new Date();
    const startTime = new Date(now.getTime() - days * 24 * 3600 * 1000);
    const totalPoints = days * 24; // Hourly

    for (let i = 0; i < totalPoints; i++) {
        const time = new Date(startTime.getTime() + i * 3600 * 1000);
        const hour = time.getHours();
        const dayOffset = i / 24.0;
        const diurnal = Math.sin((hour - 8) * Math.PI / 12);

        let supply = 8.2 + (Math.random() - 0.5) * 0.12 + diurnal * 0.15;
        let condOut = 34.5 + (Math.random() - 0.5) * 0.2 + diurnal * 0.6;
        let hp = 15.6 + (condOut - 34.5) * 0.4 + (Math.random() - 0.5) * 0.1;
        let lp = 3.8 + (supply - 8.2) * 0.2 + (Math.random() - 0.5) * 0.05;
        let power = 75.0 + diurnal * 25.0 + (Math.random() - 0.5) * 2.0;

        // Injected Degradation
        if (machineId === 15 && dayOffset > (days - 14)) {
            const degrade = (dayOffset - (days - 14)) * 0.09;
            condOut += degrade;
            hp += degrade * 0.38;
            power += degrade * 1.1;
        } else if (machineId === 6 && dayOffset > (days - 10)) {
            const degrade = (dayOffset - (days - 10)) * 0.12;
            lp = Math.max(2.2, lp - degrade);
            supply += degrade * 0.08;
        } else if (machineId === 23 && dayOffset > (days - 18)) {
            const degrade = (dayOffset - (days - 18)) * 0.04;
            supply += degrade;
            power += degrade * 1.3;
        }

        const delta = Math.max(1.0, 4.4 + diurnal * 0.3);
        const cop = Math.max(3.2, Math.min(6.5, (delta * 85.0) / Math.max(10, power)));

        history.push({
            time: time.toISOString(),
            timeLabel: `${time.getMonth() + 1}/${time.getDate()} ${String(time.getHours()).padStart(2, '0')}:00`,
            data: {
                AAA0028: parseFloat(supply.toFixed(2)),
                AAA0029: parseFloat((supply + delta).toFixed(2)),
                AAA0030: parseFloat(condOut.toFixed(2)),
                AAA0031: parseFloat((condOut - 4.8).toFixed(2)),
                AAA0036: parseFloat(hp.toFixed(2)),
                AAA0037: parseFloat(lp.toFixed(2)),
                AAA0042: 12000 + i,
                AAA0045: parseFloat(cop.toFixed(2)),
                AAA0059: parseFloat(power.toFixed(2))
            }
        });
    }

    return history;
}
