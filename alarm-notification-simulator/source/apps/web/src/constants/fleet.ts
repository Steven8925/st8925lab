export interface FleetMachine {
  id: number;
  name: string;
  sn: string;
  cid: number;
  type: "chiller" | "tower";
  model: string;
  capacity: number;
}

export const PRODUCTION_FLEET: FleetMachine[] = [
  // 客戶 1: 內湖生技園區 (CID 1)
  { id: 15, name: "內湖生技-西側1號主機", sn: "ECO-CH-01", cid: 1, type: "chiller", model: "ECO-100RT", capacity: 100 },
  { id: 16, name: "內湖生技-西側1號水塔", sn: "ECO-CT-01", cid: 1, type: "tower", model: "CT-120", capacity: 120 },
  { id: 17, name: "內湖生技-西側2號主機", sn: "ECO-CH-02", cid: 1, type: "chiller", model: "ECO-100RT", capacity: 100 },
  { id: 18, name: "內湖生技-西側2號水塔", sn: "ECO-CT-02", cid: 1, type: "tower", model: "CT-120", capacity: 120 },
  { id: 19, name: "內湖生技-東側1號主機", sn: "ECO-CH-03", cid: 1, type: "chiller", model: "ECO-100RT", capacity: 100 },
  { id: 20, name: "內湖生技-東側1號水塔", sn: "ECO-CT-03", cid: 1, type: "tower", model: "CT-120", capacity: 120 },
  { id: 21, name: "內湖生技-東側2號主機", sn: "ECO-CH-04", cid: 1, type: "chiller", model: "ECO-100RT", capacity: 100 },
  { id: 22, name: "內湖生技-東側2號水塔", sn: "ECO-CT-04", cid: 1, type: "tower", model: "CT-120", capacity: 120 },

  // 客戶 2: 台中榮總醫療中心 (CID 2)
  { id: 5,  name: "中榮分院-急診1號機", sn: "MED-CH-01", cid: 2, type: "chiller", model: "MED-200RT", capacity: 200 },

  // 客戶 3: 信義金融大樓 (CID 3)
  { id: 7,  name: "信義總部-高樓1號機", sn: "FIN-CH-01", cid: 3, type: "chiller", model: "FIN-80RT", capacity: 80 },
  { id: 8,  name: "信義總部-高樓2號機", sn: "FIN-CH-02", cid: 3, type: "chiller", model: "FIN-80RT", capacity: 80 },

  // 客戶 4: 竹科晶圓製造廠 (CID 4)
  { id: 6,  name: "竹科六廠-無塵8號機", sn: "SEMI-CH-01", cid: 4, type: "chiller", model: "SEMI-150RT", capacity: 150 },
  { id: 12, name: "竹科六廠-測試製程機", sn: "SEMI-CH-02", cid: 4, type: "chiller", model: "SEMI-150RT", capacity: 150 },
  { id: 13, name: "竹科六廠-特氣冷卻機", sn: "SEMI-CH-03", cid: 4, type: "chiller", model: "SEMI-150RT", capacity: 150 },

  // 客戶 5: 高雄榮總醫學中心 (CID 5)
  { id: 11, name: "高榮醫中-長照2號機", sn: "HOSP-CH-01", cid: 5, type: "chiller", model: "HOSP-250RT", capacity: 250 },
  { id: 14, name: "高榮醫中-病房3號機", sn: "HOSP-CH-02", cid: 5, type: "chiller", model: "HOSP-250RT", capacity: 250 },

  // 客戶 6: 南港生技研發處 (CID 6)
  { id: 23, name: "南港生技-無菌研發機", sn: "BIOMED-CH-01", cid: 6, type: "chiller", model: "BIO-300RT", capacity: 300 },
  { id: 24, name: "南港生技-試劑冷房機", sn: "BIOMED-CH-02", cid: 6, type: "chiller", model: "BIO-300RT", capacity: 300 },

  // 客戶 7: 桃園重工加工廠 (CID 7)
  { id: 9,  name: "桃園精密-車削50RT機", sn: "MFG-CH-01", cid: 7, type: "chiller", model: "MFG-50RT", capacity: 50 },
  { id: 10, name: "桃園精密-沖壓100RT機", sn: "MFG-CH-02", cid: 7, type: "chiller", model: "MFG-100RT", capacity: 100 },

  // 客戶 8: 綠能循環示範廠 (CID 8)
  { id: 4,  name: "綠能園區-展示1號機", sn: "GRN-CH-01", cid: 8, type: "chiller", model: "GRN-60RT", capacity: 60 },
];
