// =========================================================================
//  kb-store.js — Client-Side Knowledge Base Store & RAG Semantic Matcher
// =========================================================================

export const KB_TROUBLESHOOTING = [
    {
        id: 1,
        code: 'HIGH_COND_LEAVING_TEMP',
        title: '冷卻水出水溫度偏高 (High Condenser Water Temp, >36.0°C)',
        category: 'thermal',
        severity: 'high',
        symptom: '冷卻水出水溫度 (AAA0030) 持續偏高或出入水溫差縮小，伴隨冷媒高壓 (AAA0036) 上升。',
        causes: [
            { rank: 1, cause: '冷卻水塔散熱片結垢或生物膜堵塞 (Tower Fill Fouling)', prob: '60%', reason: '散熱片附著水垢阻礙風道，冷凝出入水溫差由 5°C 縮小至 < 3°C。' },
            { rank: 2, cause: '冷卻水循環水泵過濾網堵塞 (Strainer Clogged)', prob: '25%', reason: '進出口壓差大於 0.5 kg/cm²，循環水量不足。' },
            { rank: 3, cause: '冷凝器銅管水側結垢 (Condenser Tube Scale)', prob: '15%', reason: '逼近溫差 Approach Temp > 2.5°C，熱阻顯著上升。' }
        ],
        actions: [
            { step: 1, action: '高壓清洗冷卻水塔散熱片表面青苔與水垢，檢驗布水噴嘴噴灑均勻度。', time: '30 分鐘', tools: '高壓清洗機' },
            { step: 2, action: '拆洗冷卻水泵 Y 型過濾網不鏽鋼網筒。', time: '45 分鐘', tools: '管鉗、清潔水槍' },
            { step: 3, action: '安排非生產時段進行冷凝器水側通管清洗或化學除垢。', time: '4 小時', tools: '自動通管機、除垢劑' }
        ],
        tags: ['冷卻水塔', '冷凝器', '結垢', '散熱不良', '水溫高']
    },
    {
        id: 2,
        code: 'LOW_COP_DEGRADATION',
        title: '主機即時能效 COP 漸進劣化 (COP < 4.0)',
        category: 'thermal',
        severity: 'high',
        symptom: '產冷量與耗電量比值持續滑落，在相同冰水負載下耗電量異常增加 15~25%。',
        causes: [
            { rank: 1, cause: '冷凝器/蒸發器換熱管束表面結垢 (Heat Exchanger Scaling)', prob: '55%', reason: '熱傳效率衰退，壓縮機需耗費更多功率維持冷凍能力。' },
            { rank: 2, cause: '冷媒充填量微量洩漏不足 (Slow Refrigerant Leak)', prob: '30%', reason: '吸氣過熱度偏高，蒸發壓力低。' },
            { rank: 3, cause: '壓縮機容積效率磨損 (Compressor Wear)', prob: '15%', reason: '長期滿載運轉造成內部轉子間隙變大。' }
        ],
        actions: [
            { step: 1, action: '計算熱交換端逼近度與過去 30 天基線對比。', time: '15 分鐘', tools: 'AI 趨勢分析' },
            { step: 2, action: '使用電子探漏儀巡檢冷媒迴路焊道與閥門。', time: '60 分鐘', tools: '冷媒探漏儀' },
            { step: 3, action: '實施蒸發器與冷凝器銅管機械通管。', time: '6 小時', tools: '通管機組' }
        ],
        tags: ['能效', 'COP', '結垢', '耗電', '冷媒洩漏']
    },
    {
        id: 3,
        code: 'HIGH_PRESSURE_TRENDING',
        title: '冷媒高壓壓力漸進升高 (High Pressure >16.8 kg/cm²)',
        category: 'pressure',
        severity: 'critical',
        symptom: '冷媒高壓指針或 AAA0036 逐漸逼近 18.0 kg/cm² 跳脫門檻。',
        causes: [
            { rank: 1, cause: '冷凝器散熱不良 (Condenser Heat Rejection Loss)', prob: '60%', reason: '冷卻水出水溫度高或冷卻水量不足。' },
            { rank: 2, cause: '冷媒系統內混入不凝結空氣 (Non-condensables in System)', prob: '25%', reason: '停機飽和壓力高於環境水溫對應壓力。' },
            { rank: 3, cause: '冷媒充填過量 (Overcharged Refrigerant)', prob: '15%', reason: '過冷度大於 8°C。' }
        ],
        actions: [
            { step: 1, action: '確認冷卻水塔風扇與水泵運轉頻率。', time: '15 分鐘', tools: '變頻器面板' },
            { step: 2, action: '冷凝器頂部放氣閥實施抽空排氣作業。', time: '2 小時', tools: '真空泵、冷媒回收機' }
        ],
        tags: ['高壓跳脫', '冷媒壓力', '不凝結氣體', '冷凝器']
    },
    {
        id: 4,
        code: 'LOW_PRESSURE_TRENDING',
        title: '冷媒低壓壓力漸進降低 (Low Pressure <3.0 kg/cm²)',
        category: 'refrigerant',
        severity: 'critical',
        symptom: '冷媒低壓 AAA0037 持續下滑，蒸發溫度降低，有結冰風險。',
        causes: [
            { rank: 1, cause: '管路微量慢速漏冷媒 (Refrigerant Leakage)', prob: '65%', reason: '高低壓同步走低，視窗出現連續氣泡。' },
            { rank: 2, cause: '膨脹閥過濾網堵塞或感溫元件失靈 (TXV Clogged)', prob: '25%', reason: '膨脹閥出口結霜，低壓極低。' }
        ],
        actions: [
            { step: 1, action: '全機螢光或電子探漏，查明漏點後焊補。', time: '3 小時', tools: '探漏儀、焊具' },
            { step: 2, action: '更換乾燥過濾芯，抽真空並定量回充冷媒。', time: '3.5 小時', tools: '真空計、電子秤' }
        ],
        tags: ['低壓跳脫', '冷媒洩漏', '膨脹閥', '結冰']
    },
    {
        id: 5,
        code: 'CHILLED_DELTA_SHRINK',
        title: '冰水出回水溫差異常縮小 (Low Delta-T < 2.0°C)',
        category: 'water_flow',
        severity: 'medium',
        symptom: '冰水溫差極小但主機依然中載運轉，冷水未經熱交換即短路回流。',
        causes: [
            { rank: 1, cause: '末端 AHU/FCU 電動二通閥故障或三通旁通洩漏 (Bypass Leak)', prob: '60%', reason: '閥門卡在全開位置，大量冰水短路。' },
            { rank: 2, cause: '二次水泵過度供水 (Excessive Water Flow)', prob: '40%', reason: '水流過快熱交換不充分。' }
        ],
        actions: [
            { step: 1, action: '以紅外線測溫巡檢各樓層 AHU 閥門開度與內漏。', time: '1.5 小時', tools: '紅外線熱像儀' },
            { step: 2, action: '調整二次泵變頻器為末端最不利點差壓恆定控制。', time: '45 分鐘', tools: 'BAS 參數' }
        ],
        tags: ['低溫差', '旁通短路', '二通閥', '水流量']
    }
];

export const KB_WORK_ORDERS = [
    {
        id: 1,
        no: 'WO-2026-0801',
        machineId: 15,
        date: '2026-08-01',
        title: 'A區南區1號機冷卻塔散熱片結垢清洗與加藥調校',
        phenomenon: '冷卻水出水溫度一週內由 34.5°C 攀升至 37.2°C，能效 COP 滑落至 4.1。',
        cause: '冷卻水塔散熱材沈積大量水垢與生物藻類，阻礙熱交換氣流。',
        action: '使用高壓水柱搭配生化除藻劑全面沖洗散熱片；更換加藥機阻垢劑並校正自動排污電導度 (2200 μS/cm)。',
        parts: '冷卻塔阻垢劑 2桶 (NT$ 4,800), 布水噴嘴 4組 (NT$ 1,600)',
        tech: '陳建宏 (技師長)',
        hours: '4.5 hrs',
        downtime: '2.0 hrs',
        status: '完全修復 (出水溫恢復 34.2°C, COP 回升 5.15)'
    },
    {
        id: 2,
        no: 'WO-2026-0722',
        machineId: 6,
        date: '2026-07-22',
        title: 'D區晶圓一廠無塵8號機蒸發器感溫盲套微量冷媒洩漏焊補',
        phenomenon: '冷媒低壓兩週內由 3.8 kg/cm² 滑落至 2.4 kg/cm²，觸發預警。',
        cause: '感溫棒盲套螺紋處耐油 O-Ring 硬化滲漏 R134a 冷媒。',
        action: '電子探漏定位；回收冷媒更換耐高溫 O-Ring；氮氣 15kg 保壓24小時；抽真空至 350 microns 並回充 45kg 冷媒。',
        parts: 'R134a 冷媒 45kg (NT$ 18,000), 耐油 O-Ring 2組 (NT$ 500), 乾燥濾芯 (NT$ 2,200)',
        tech: '林志明 (資深冷凍技師)',
        hours: '8.0 hrs',
        downtime: '6.0 hrs',
        status: '完全修復 (低壓穩定維持 3.85 kg/cm²)'
    },
    {
        id: 3,
        no: 'WO-2026-0715',
        machineId: 23,
        date: '2026-07-15',
        title: 'F區生醫1號機蒸發器管束通管清洗與逼近度校正',
        phenomenon: 'COP 能效逐日滑落至 4.3，耗電異常增加 15 kW。',
        cause: '蒸發器水側銅管內壁沈積生物軟泥，熱阻增加。',
        action: '拆卸端蓋，使用全自動通管機通刷 240 根熱傳銅管並更換端蓋密封墊片。',
        parts: '端蓋密封墊片 2組 (NT$ 3,200)',
        tech: '黃國華 (機電工程師)',
        hours: '6.0 hrs',
        downtime: '5.0 hrs',
        status: '完全修復 (蒸發逼近度降至 1.1°C, COP 回升 5.35)'
    },
    {
        id: 4,
        no: 'WO-2026-0628',
        machineId: 5,
        date: '2026-06-28',
        title: 'B區急重症1號機冷卻水泵 Y 型過濾網泥沙清理',
        phenomenon: '夏季高溫時段頻繁觸發冷媒高壓偏高預警 (17.6 kg/cm²)。',
        cause: 'Y 型過濾網被鐵鏽泥沙堵塞 70%，循環流量不足。',
        action: '隔離水閥，拆洗過濾網筒泥沙並更換不鏽鋼網芯。',
        parts: 'Y型過濾網不鏽鋼網芯 1組 (NT$ 3,800)',
        tech: '陳建宏 (技師長)',
        hours: '2.5 hrs',
        downtime: '1.0 hrs',
        status: '完全修復 (水流差壓恢復，高壓降至 15.4 kg/cm²)'
    },
    {
        id: 5,
        no: 'WO-2026-0520',
        machineId: 15,
        date: '2026-05-20',
        title: 'A區1號水塔傳動 V 型皮帶預防性整組換新',
        phenomenon: '冷卻塔風扇皮帶達到 8500 運轉小時，產生打滑尖叫聲。',
        cause: '皮帶橡膠硬化龜裂且張力鬆弛。',
        action: '更換全新抗靜電耐油 V 型皮帶 4 條並以張力計校正至 45 kgf。',
        parts: 'V型皮帶 B85 4條 (NT$ 2,400)',
        tech: '王俊傑 (維護組長)',
        hours: '2.0 hrs',
        downtime: '1.5 hrs',
        status: '完全修復 (風扇轉速達額定值)'
    }
];

export const KB_FAQS = [
    {
        id: 1,
        q: '什麼是冰水主機的『逼近溫差』(Approach Temp)？如何利用它預測通管時機？',
        a: '冷凝器逼近度 = 飽和冷凝溫度 - 冷卻水出水溫度 (正常 0.5~1.5°C)。當換熱銅管結垢時逼近度會漸漸擴大 (>2.5°C)。每增加 1°C 逼近度，耗電增加約 3%。因此連續監控逼近度趨勢是最佳的預測性保養時機判斷指標。',
        cat: 'chiller_operation'
    },
    {
        id: 2,
        q: '冷卻水塔最佳清洗頻率為何？水質控制有哪些核心指標？',
        a: '散熱片建議每季目視巡檢，每半年至一年高壓清洗。水質電導度建議維持在 1500~2200 μS/cm (濃縮倍數 3~4 倍)，pH 值 7.5~8.8，定期投放殺菌滅藻劑抑制生物膜。',
        cat: 'cooling_tower'
    },
    {
        id: 3,
        q: '空調系統出現『低溫差症候群』(Low Delta-T) 代表什麼？如何改善？',
        a: '代表冰水出回水溫差遠小於設計值 (例如僅 1.5~2.0°C)。主因多為末端電動閥內漏短路或二次泵水流量過大。改善方式為檢修末端二通閥並將二次泵控制策略改為最不利點差壓恆定控制。',
        cat: 'pump_system'
    },
    {
        id: 4,
        q: '冷凍機油 (POE Oil) 何時需要更換？',
        a: '每運轉 8,000 小時或每年定檢換新。若油酸價 TAN > 0.10 mgKOH/g 或顏色變深綠/深褐即需立即換油並同步更換乾燥濾心。',
        cat: 'refrigerant'
    }
];

export const KB_PARTS = [
    { name: '合成冷凍機潤滑油 (POE-68)', cat: 'oil', life: 8000, warn: 7200, interval: '每 8,000 小時或每年', cost: 'NT$ 6,000~12,000' },
    { name: '乾燥過濾芯 (Filter Drier)', cat: 'filter', life: 8000, warn: 7000, interval: '換油或充冷媒時同步更換', cost: 'NT$ 2,000~4,500' },
    { name: '冷卻水塔傳動 V 型皮帶', cat: 'belt', life: 8000, warn: 6500, interval: '每季巡檢，每年整組換新', cost: 'NT$ 1,500~3,500' },
    { name: '冷卻水泵 Y 型過濾網網芯', cat: 'filter', life: 2000, warn: 1800, interval: '每季拆卸清洗', cost: 'NT$ 2,500~6,000' },
    { name: '壓縮機交流電磁接觸器 (MC)', cat: 'motor', life: 25000, warn: 20000, interval: '每 3 年或 5 萬次啟閉', cost: 'NT$ 6,500~15,000' },
    { name: '水泵耐磨機械軸封 (Seal)', cat: 'gasket', life: 15000, warn: 12000, interval: '每 2 年更換一組', cost: 'NT$ 4,500~10,000' },
    { name: 'PT100 冰水溫度感測棒', cat: 'sensor', life: 25000, warn: 20000, interval: '每年雙點校驗，每3年更換', cost: 'NT$ 1,500~3,000' },
    { name: '冷媒高壓壓力傳送器', cat: 'sensor', life: 25000, warn: 20000, interval: '每 2 年校準輸出訊號', cost: 'NT$ 4,000~8,000' }
];

export function searchKnowledgeBase(query) {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    const hits = [];

    // Search Troubleshooting
    for (const t of KB_TROUBLESHOOTING) {
        let score = 0;
        if (t.code.toLowerCase().includes(q)) score += 0.4;
        if (t.title.toLowerCase().includes(q)) score += 0.35;
        if (t.symptom.toLowerCase().includes(q)) score += 0.25;
        for (const c of t.causes) {
            if (c.cause.toLowerCase().includes(q) || c.reason.toLowerCase().includes(q)) score += 0.2;
        }
        for (const tag of t.tags) {
            if (tag.toLowerCase().includes(q)) score += 0.2;
        }
        if (score > 0) {
            hits.push({
                table: '故障診斷決策樹 (Troubleshooting)',
                code: t.code,
                title: t.title,
                summary: t.symptom,
                score: Math.min(0.99, parseFloat((score + 0.5).toFixed(2))),
                data: t
            });
        }
    }

    // Search Work Orders
    for (const w of KB_WORK_ORDERS) {
        let score = 0;
        if (w.no.toLowerCase().includes(q)) score += 0.4;
        if (w.title.toLowerCase().includes(q)) score += 0.35;
        if (w.phenomenon.toLowerCase().includes(q)) score += 0.25;
        if (w.cause.toLowerCase().includes(q)) score += 0.3;
        if (w.action.toLowerCase().includes(q)) score += 0.2;
        if (score > 0) {
            hits.push({
                table: '歷史維修工單 (Work Order)',
                code: w.no,
                title: w.title,
                summary: w.phenomenon,
                score: Math.min(0.99, parseFloat((score + 0.45).toFixed(2))),
                data: w
            });
        }
    }

    // Search FAQs
    for (const f of KB_FAQS) {
        let score = 0;
        if (f.q.toLowerCase().includes(q)) score += 0.4;
        if (f.a.toLowerCase().includes(q)) score += 0.3;
        if (score > 0) {
            hits.push({
                table: '維運與規範 FAQ',
                code: `FAQ #${f.id}`,
                title: f.q,
                summary: f.a,
                score: Math.min(0.99, parseFloat((score + 0.4).toFixed(2))),
                data: f
            });
        }
    }

    hits.sort((a, b) => b.score - a.score);
    return hits;
}
