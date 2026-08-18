# =========================================================================
#  seed_data.py — Industrial Chiller & Cooling Tower Knowledge Base Seed Data
#  工業冰水機與冷卻水塔故障診斷樹 (15條)、維修工單 (20筆)、FAQ (30條)、零件壽命 (12項)
# =========================================================================

TROUBLESHOOTING_SEEDS = [
    {
        "symptom_code": "HIGH_COND_LEAVING_TEMP",
        "symptom_desc": "冷卻水出水溫度偏高 (High Condenser Leaving Water Temp, >36.0°C 或偏離基線 >2σ)",
        "category": "thermal",
        "severity": "high",
        "applicable_models": ["ECO-100RT", "CT-120", "MED-200RT", "SEMI-150RT", "HOSP-250RT", "BIO-300RT", "MFG-100RT", "GRN-60RT"],
        "related_alarm_codes": ["HIGH_PRESSURE_WARNING", "HIGH_PRESSURE_CRITICAL"],
        "tags": ["冷卻水塔", "冷凝器", "散熱不良", "結垢", "水溫偏高"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "冷卻水塔散熱片結垢或生物膜堵塞 (Cooling Tower Fill Fouling / Biofilm)",
                "probability": "高 (60%)",
                "evidence_fields": ["AAA0030", "AAA0031"],
                "evidence_pattern": "冷卻水出入水溫差 (AAA0030 - AAA0031) 縮小至 <3.0°C，且出水溫度持續漸進上升。"
            },
            {
                "rank": 2,
                "cause": "冷卻水循環水流量不足 (Insufficient Cooling Water Flow)",
                "probability": "中 (25%)",
                "evidence_fields": ["AAA0030", "AAA0031", "AAA0059"],
                "evidence_pattern": "出入水溫差正常或偏大，但冷凝器端壓差異常，水泵運轉電流偏低或過濾網壓差大。"
            },
            {
                "rank": 3,
                "cause": "冷卻塔風扇皮帶鬆脫或馬達故障 (Cooling Tower Fan Belt Loose / Motor Fault)",
                "probability": "中 (10%)",
                "evidence_fields": ["AAA0030"],
                "evidence_pattern": "冷卻塔出水溫度突然升高，伴隨環境濕球溫度正常但水溫無法被冷卻。"
            },
            {
                "rank": 4,
                "cause": "冷卻水加藥水質失衡導致冷凝器銅管結垢 (Condenser Tube Scaling due to Poor Water Treatment)",
                "probability": "低 (5%)",
                "evidence_fields": ["AAA0036", "AAA0030", "AAA0045"],
                "evidence_pattern": "冷媒高壓升高，逼近度 (Approach Temp = AAA0030 - 飽和冷凝溫度) > 2.5°C，COP 明顯劣化。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "目視檢查冷卻水塔散熱材 (Fill) 表面是否有水垢、青苔或泥沙堵塞，確認布水噴嘴是否均勻噴灑。",
                "tools_needed": "手電筒、目視檢驗",
                "estimated_time": "20 分鐘",
                "difficulty": "低"
            },
            {
                "step": 2,
                "action": "檢查冷卻水泵入出口 Y 型過濾網 (Strainer) 壓差，若壓差大於 0.5 kg/cm² 應立即停機拆洗濾網。",
                "tools_needed": "扳手、清潔水槍",
                "estimated_time": "45 分鐘",
                "difficulty": "中"
            },
            {
                "step": 3,
                "action": "檢驗冷卻水塔風扇皮帶張力與馬達運轉電流，排除傳動機構打滑或失速。",
                "tools_needed": "皮帶張力計、鉤錶",
                "estimated_time": "30 分鐘",
                "difficulty": "中"
            },
            {
                "step": 4,
                "action": "安排非尖峰時段執行冷凝器水側通管清洗 (Condenser Tube Brushing) 或化學酸洗除垢循環。",
                "tools_needed": "通管機、化學除垢劑、中和劑",
                "estimated_time": "4~8 小時",
                "difficulty": "高"
            }
        ]
    },
    {
        "symptom_code": "LOW_COP_DEGRADATION",
        "symptom_desc": "主機即時能效 COP 漸進劣化 (Gradual COP Degradation, COP < 4.0 且功率 > 60 kW)",
        "category": "thermal",
        "severity": "high",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "HOSP-250RT", "BIO-300RT", "MFG-100RT"],
        "related_alarm_codes": ["COP_EFFICIENCY_DEGRADATION", "LOW_COP_EFFICIENCY_LOSS"],
        "tags": ["COP", "能耗", "能效劣化", "熱交換效率", "耗電偏高"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "蒸發器或冷凝器熱交換管結垢 (Evaporator / Condenser Tube Scaling)",
                "probability": "高 (50%)",
                "evidence_fields": ["AAA0045", "AAA0059", "AAA0036", "AAA0037"],
                "evidence_pattern": "產冷量 (AAA0029-AAA0028) 與耗電量 (AAA0059) 比值持續滑落，高壓偏高且低壓偏低。"
            },
            {
                "rank": 2,
                "cause": "冷媒充填量微量洩漏不足 (Undercharged Refrigerant / Slow Leak)",
                "probability": "中 (30%)",
                "evidence_fields": ["AAA0037", "AAA0045"],
                "evidence_pattern": "冷媒低壓壓力 (AAA0037) 逐漸低於正常基線 (如 <3.2 kg/cm²)，過熱度過高。"
            },
            {
                "rank": 3,
                "cause": "壓縮機內部閥片磨損或容積效率衰退 (Compressor Internal Valve Wear)",
                "probability": "低 (15%)",
                "evidence_fields": ["AAA0059", "AAA0045"],
                "evidence_pattern": "壓縮機全載運轉但冷凍能力無法達成，耗電維持高檔。"
            },
            {
                "rank": 4,
                "cause": "膨脹閥感溫包感應不良或開度失調 (Expansion Valve Malfunction)",
                "probability": "低 (5%)",
                "evidence_fields": ["AAA0028", "AAA0037"],
                "evidence_pattern": "出水溫度波動幅度增大，低壓在極低值徘徊。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "比對過去 30 天與 90 天能效曲線，計算熱交換端逼近溫差 (Approach Temperature)。",
                "tools_needed": "AI 趨勢分析軟體",
                "estimated_time": "15 分鐘",
                "difficulty": "低"
            },
            {
                "step": 2,
                "action": "使用電子檢漏儀 (Refrigerant Sniffer) 針對壓縮機法蘭、閥件及冷凝器管束封頭檢測有無微漏。",
                "tools_needed": "冷媒探漏儀、肥皂水",
                "estimated_time": "60 分鐘",
                "difficulty": "中"
            },
            {
                "step": 3,
                "action": "安排主機預防性保養：冷水側/冷卻水側管束清洗，並進行冷媒過冷度與過熱度校正。",
                "tools_needed": "通管設備、壓力表組、溫度計",
                "estimated_time": "6 小時",
                "difficulty": "高"
            }
        ]
    },
    {
        "symptom_code": "HIGH_PRESSURE_TRENDING",
        "symptom_desc": "冷媒高壓壓力漸進升高 (Refrigerant High Pressure Trending Up, >16.8 kg/cm²)",
        "category": "pressure",
        "severity": "critical",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "HOSP-250RT", "BIO-300RT"],
        "related_alarm_codes": ["HIGH_PRESSURE_WARNING", "HIGH_PRESSURE_CRITICAL"],
        "tags": ["冷媒高壓", "高壓跳脫", "冷凝器", "不凝結氣體"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "冷凝器水側散熱不良或結垢 (Condenser Tube Scaling / Fouling)",
                "probability": "高 (55%)",
                "evidence_fields": ["AAA0036", "AAA0030"],
                "evidence_pattern": "冷卻水出水溫與冷媒高壓呈正相關同步走高。"
            },
            {
                "rank": 2,
                "cause": "冷媒充填過量 (Overcharged Refrigerant)",
                "probability": "中 (20%)",
                "evidence_fields": ["AAA0036", "AAA0037"],
                "evidence_pattern": "高壓異常偏高，過冷度大於 8°C，低壓正常或稍高。"
            },
            {
                "rank": 3,
                "cause": "系統內混入不凝結氣體如空氣 (Non-Condensable Gases / Air in System)",
                "probability": "中 (15%)",
                "evidence_fields": ["AAA0036", "AAA0030"],
                "evidence_pattern": "冷凝溫度遠高於冷卻水出水溫度，高壓指針微幅抖動。"
            },
            {
                "rank": 4,
                "cause": "冷凝器進水溫度過高 (High Ambient / High Entering Water Temp)",
                "probability": "低 (10%)",
                "evidence_fields": ["AAA0031", "AAA0036"],
                "evidence_pattern": "冷卻水入水溫度 AAA0031 > 32°C，受夏季極端氣候影響。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "檢查冷凝器出入水溫差，確認冷卻水泵運轉頻率及水流量是否達額定值。",
                "tools_needed": "水流量計、差壓表",
                "estimated_time": "20 分鐘",
                "difficulty": "低"
            },
            {
                "step": 2,
                "action": "停機靜置 2 小時後測量飽和冷凝壓力，確認是否高於當前環境水溫對應之飽和壓力，以判斷是否有空氣混入。",
                "tools_needed": "精準壓力表、R134a/R410A 飽和對照表",
                "estimated_time": "2.5 小時",
                "difficulty": "中"
            },
            {
                "step": 3,
                "action": "若有空氣混入，透過冷凝器頂部放氣閥進行抽空排氣作業或冷媒純化回收再充填。",
                "tools_needed": "真空泵、冷媒回收機",
                "estimated_time": "3 小時",
                "difficulty": "高"
            }
        ]
    },
    {
        "symptom_code": "LOW_PRESSURE_TRENDING",
        "symptom_desc": "冷媒低壓壓力漸進降低 (Refrigerant Low Pressure Trending Down, <3.0 kg/cm²)",
        "category": "refrigerant",
        "severity": "critical",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "HOSP-250RT", "BIO-300RT", "MFG-50RT"],
        "related_alarm_codes": ["LOW_PRESSURE_TRIP"],
        "tags": ["低壓跳脫", "冷媒洩漏", "膨脹閥堵塞", "結冰"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "系統冷媒管路發生慢速洩漏 (Slow Refrigerant Leak)",
                "probability": "高 (60%)",
                "evidence_fields": ["AAA0037", "AAA0036", "AAA0028"],
                "evidence_pattern": "低壓與高壓持續同步緩慢下滑，吸氣過熱度持續上升。"
            },
            {
                "rank": 2,
                "cause": "膨脹閥過濾網堵塞或感溫元件故障 (Expansion Valve Filter Clogged / Power Head Loss)",
                "probability": "中 (25%)",
                "evidence_fields": ["AAA0037", "AAA0028"],
                "evidence_pattern": "低壓驟降，膨脹閥出口結霜，高壓維持正常。"
            },
            {
                "rank": 3,
                "cause": "蒸發器水流量不足或冰水過濾器堵塞 (Evaporator Low Water Flow)",
                "probability": "中 (15%)",
                "evidence_fields": ["AAA0028", "AAA0029", "AAA0037"],
                "evidence_pattern": "出入水溫差拉大 (AAA0029 - AAA0028 > 6.0°C)，低壓偏低。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "檢查冷媒視窗 (Sight Glass)，觀察是否有大量連續氣泡產生（代表冷媒充填不足或乾燥過濾器阻塞）。",
                "tools_needed": "目視檢驗",
                "estimated_time": "10 分鐘",
                "difficulty": "低"
            },
            {
                "step": 2,
                "action": "使用螢光劑或電子探漏儀全機巡檢焊道、油封、壓力開關接口。",
                "tools_needed": "UV 燈、螢光檢漏劑",
                "estimated_time": "1.5 小時",
                "difficulty": "中"
            },
            {
                "step": 3,
                "action": "修補漏點、更換乾燥過濾心 (Filter Drier Core)、抽真空至 500 microns 並依銘牌定量回充冷媒。",
                "tools_needed": "氧乙炔焊具、真空計、電子磅秤",
                "estimated_time": "4 小時",
                "difficulty": "高"
            }
        ]
    },
    {
        "symptom_code": "CHILLED_SUPPLY_RISING",
        "symptom_desc": "冰水出水溫度漸進偏高無法達標 (Chilled Water Supply Temp Rising, >9.5°C)",
        "category": "thermal",
        "severity": "high",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "HOSP-250RT", "BIO-300RT"],
        "related_alarm_codes": ["FREEZE_ALARM_CRITICAL"],
        "tags": ["冰水出水", "冷房不足", "蒸發器", "負載超載"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "廠區末端空調負載超出主機額定能力 (Actual Load Exceeds Chiller Capacity)",
                "probability": "中 (40%)",
                "evidence_fields": ["AAA0059", "AAA0029", "AAA0028"],
                "evidence_pattern": "主機 100% 全載運轉 (AAA0059 達上限)，回水溫度 AAA0029 > 15°C。"
            },
            {
                "rank": 2,
                "cause": "蒸發器銅管內部結垢或油膜附著 (Evaporator Tube Scaling / Oil Log)",
                "probability": "中 (35%)",
                "evidence_fields": ["AAA0028", "AAA0037", "AAA0045"],
                "evidence_pattern": "蒸發逼近溫差增大，吸氣飽和溫度與出水溫差大於 3.0°C。"
            },
            {
                "rank": 3,
                "cause": "容量調節閥 (IGV 或滑閥 Slide Valve) 卡滯於部分開度",
                "probability": "低 (25%)",
                "evidence_fields": ["AAA0059"],
                "evidence_pattern": "出水溫升高但壓縮機電流並未提升至全載。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "檢查冰水出水溫度設定值 (Set Point) 及溫控器 PID 參數是否遭到異動。",
                "tools_needed": "人機介面 (HMI) 操作",
                "estimated_time": "15 分鐘",
                "difficulty": "低"
            },
            {
                "step": 2,
                "action": "檢驗壓縮機油位與回油系統 (Oil Return Eductor)，排除蒸發器沉積冷凍油降低熱傳導。",
                "tools_needed": "油位視窗目視",
                "estimated_time": "30 分鐘",
                "difficulty": "中"
            },
            {
                "step": 3,
                "action": "啟動第二台備用冰水機組進行聯控群控分流 (Lead-Lag Staging)。",
                "tools_needed": "中央監控 SCADA / 手動啟動",
                "estimated_time": "10 分鐘",
                "difficulty": "低"
            }
        ]
    },
    {
        "symptom_code": "CHILLED_DELTA_SHRINK",
        "symptom_desc": "冰水出回水溫差異常偏小 (Low Delta-T Syndrome, AAA0029 - AAA0028 < 2.0°C)",
        "category": "water_flow",
        "severity": "medium",
        "applicable_models": ["ECO-100RT", "MED-200RT", "FIN-80RT", "HOSP-250RT"],
        "related_alarm_codes": ["COMPOUND_LEGACY_3151"],
        "tags": ["低溫差症候群", "旁通", "三通閥", "水流量過大"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "末端 AHU/FCU 三通閥常開或旁通閥 (Bypass Valve) 洩漏 (Bypass Valve Leakage)",
                "probability": "高 (55%)",
                "evidence_fields": ["AAA0028", "AAA0029", "AAA0059"],
                "evidence_pattern": "溫差極小 (<1.8°C)，但主機耗電維持中等以上，大量低溫水未經熱交換即回流。"
            },
            {
                "rank": 2,
                "cause": "二次水泵變頻器未跟隨負載降頻造成過度揚水 (Excessive Water Flow Rate)",
                "probability": "中 (30%)",
                "evidence_fields": ["AAA0059"],
                "evidence_pattern": "水流量遠高於設計流量 (GPM)，水流過快熱交換時間不足。"
            },
            {
                "rank": 3,
                "cause": "末端熱交換盤管結垢或濾網嚴重阻塞 (Coil Air Filter Blocked)",
                "probability": "低 (15%)",
                "evidence_fields": ["AAA0029"],
                "evidence_pattern": "末端風機送風溫度降不下來，但冰水回水依然低溫。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "檢查中央壓差旁通閥開度指示與控制器回授訊號，確認是否卡滯於開啟位置。",
                "tools_needed": "手動關閉或測試訊號",
                "estimated_time": "30 分鐘",
                "difficulty": "中"
            },
            {
                "step": 2,
                "action": "調整二次冰水泵變頻控制策略，將定流量控制改為末端最不利點差壓恆定控制。",
                "tools_needed": "BAS 程式微調",
                "estimated_time": "1 小時",
                "difficulty": "中"
            },
            {
                "step": 3,
                "action": "巡檢各樓層 AHU 二通/三通控制閥是否內漏。",
                "tools_needed": "紅外線熱影像儀",
                "estimated_time": "2 小時",
                "difficulty": "中"
            }
        ]
    },
    {
        "symptom_code": "POWER_INCREASING",
        "symptom_desc": "在相同冷房負載下主機運轉功率持續偏高 (Power Consumption Trending Up, >110% Baseline)",
        "category": "electrical",
        "severity": "medium",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "related_alarm_codes": ["OVERCURRENT_CRITICAL", "COMPRESSOR_OVERCURRENT"],
        "tags": ["功耗上升", "過載預警", "馬達效率", "能耗偏高"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "冷凝壓力過高致壓縮機壓比增大，功耗隨之激增 (High Compression Ratio)",
                "probability": "高 (50%)",
                "evidence_fields": ["AAA0059", "AAA0036"],
                "evidence_pattern": "功率 AAA0059 與高壓 AAA0036 高度線性正相關。"
            },
            {
                "rank": 2,
                "cause": "壓縮機軸承或內部機械轉子磨損 (Mechanical Friction / Bearing Wear)",
                "probability": "中 (30%)",
                "evidence_fields": ["AAA0059", "AAA0042"],
                "evidence_pattern": "伴隨輕微高頻震動與運轉噪音，空載或部分負載電流偏高。"
            },
            {
                "rank": 3,
                "cause": "供電三相電壓不平衡率 > 2% (Three-Phase Voltage Imbalance)",
                "probability": "低 (20%)",
                "evidence_fields": ["AAA0059", "AAA0018"],
                "evidence_pattern": "馬達溫升異常，單相電流顯著偏高。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "優先解決冷凝散熱問題，降低冷媒高壓，可立即降低 10~25% 功耗。",
                "tools_needed": "冷卻塔清洗",
                "estimated_time": "2 小時",
                "difficulty": "中"
            },
            {
                "step": 2,
                "action": "量測主機配電盤 R-S-T 三相線電壓與運轉電流不平衡率。",
                "tools_needed": "電表、電力品質分析儀",
                "estimated_time": "30 分鐘",
                "difficulty": "低"
            },
            {
                "step": 3,
                "action": "使用振動頻譜分析儀量測壓縮機前後軸承震動值 (ISO 10816 規範)。",
                "tools_needed": "振動計 (Vibration Meter)",
                "estimated_time": "45 分鐘",
                "difficulty": "中"
            }
        ]
    },
    {
        "symptom_code": "VIBRATION_ABNORMAL",
        "symptom_desc": "主機壓縮機或泵浦異常振動與異音 (Abnormal Vibration & Acoustic Noise)",
        "category": "mechanical",
        "severity": "high",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "related_alarm_codes": ["OVERCURRENT_CRITICAL"],
        "tags": ["異常振動", "軸承損壞", "對心不良", "機械故障"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "壓縮機或水泵馬達聯軸器對心不良 (Misalignment) 或避震器破損",
                "probability": "高 (45%)",
                "evidence_fields": ["AAA0059"],
                "evidence_pattern": "振動主要呈 2X 轉速頻率，底座螺栓鬆動。"
            },
            {
                "rank": 2,
                "cause": "旋轉軸承磨損點蝕 (Bearing Raceway Pitting / Spalling)",
                "probability": "中 (35%)",
                "evidence_fields": ["AAA0042"],
                "evidence_pattern": "運轉時數 > 30000 小時，伴隨金屬摩擦高頻尖叫聲。"
            },
            {
                "rank": 3,
                "cause": "冷媒液壓縮 (Liquid Slugging / Liquid Carryover)",
                "probability": "低 (20%)",
                "evidence_fields": ["AAA0037", "AAA0028"],
                "evidence_pattern": "吸氣過熱度接近 0°C，壓縮機內部發出沈重液擊敲擊聲。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "若懷疑液壓縮，立即調小膨脹閥開度並檢查曲軸箱加熱器 (Crankcase Heater) 是否通電正常。",
                "tools_needed": "手動開度調整、電表",
                "estimated_time": "20 分鐘",
                "difficulty": "中"
            },
            {
                "step": 2,
                "action": "使用雷射對心儀重新校正馬達與水泵/壓縮機軸心，更換老化的橡膠避震軟墊。",
                "tools_needed": "雷射對心儀、扭力扳手",
                "estimated_time": "3 小時",
                "difficulty": "高"
            }
        ]
    },
    {
        "symptom_code": "OIL_PRESSURE_LOW",
        "symptom_desc": "壓縮機潤滑油壓差偏低 (Low Oil Differential Pressure)",
        "category": "mechanical",
        "severity": "critical",
        "applicable_models": ["MED-200RT", "BIO-300RT", "HOSP-250RT"],
        "related_alarm_codes": ["COMPRESSOR_OVERCURRENT"],
        "tags": ["油壓低", "潤滑油", "油過濾器", "油溫"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "油過濾器 (Oil Filter) 內部金屬屑或碳化物堵塞",
                "probability": "高 (50%)",
                "evidence_fields": ["AAA0042"],
                "evidence_pattern": "油壓差 (油泵出口壓 - 吸氣壓) 降至保護下限 (如 <1.2 kg/cm²)。"
            },
            {
                "rank": 2,
                "cause": "冷凍機油被冷媒大量稀釋 (Refrigerant Dilution in Oil)",
                "probability": "中 (30%)",
                "evidence_fields": ["AAA0037"],
                "evidence_pattern": "油溫過低或停機期間油加熱器未運作，油位視窗充滿氣泡泡沫。"
            },
            {
                "rank": 3,
                "cause": "潤滑油量不足或外漏 (Insufficient Oil Charge)",
                "probability": "低 (20%)",
                "evidence_fields": [],
                "evidence_pattern": "油位視窗看不見油位。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "確認油加熱器運作狀態，加熱潤滑油將冷媒驅出。",
                "tools_needed": "電表檢驗加熱器阻值",
                "estimated_time": "20 分鐘",
                "difficulty": "低"
            },
            {
                "step": 2,
                "action": "停機更換冷凍機油及油過濾器濾芯，取油樣檢測酸價 (Acid Number) 及金屬顆粒。",
                "tools_needed": "專用注油槍、新油、新濾芯、油酸檢測試劑",
                "estimated_time": "2.5 小時",
                "difficulty": "高"
            }
        ]
    },
    {
        "symptom_code": "FREEZE_PROTECTION",
        "symptom_desc": "防凍保護跳脫或出水溫度過低 (Freeze Alarm / Chilled Supply < 5.0°C)",
        "category": "thermal",
        "severity": "critical",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "HOSP-250RT", "BIO-300RT", "GRN-60RT"],
        "related_alarm_codes": ["FREEZE_ALARM_CRITICAL"],
        "tags": ["結冰", "防凍跳脫", "水流停滯", "水溫過低"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "冰水循環水流突然中斷或冰水泵跳電停機 (Loss of Chilled Water Flow)",
                "probability": "高 (60%)",
                "evidence_fields": ["AAA0028", "AAA0013"],
                "evidence_pattern": "出水溫急劇下滑至 4°C 以下，AAA0013 防凍開關立即動作。"
            },
            {
                "rank": 2,
                "cause": "冰水出水溫度感測器 (PT100/NTC) 阻值漂移或故障",
                "probability": "中 (25%)",
                "evidence_fields": ["AAA0028", "AAA0029"],
                "evidence_pattern": "回水溫度正常 (12°C)，但出水顯示值暴跌至 0°C 或負值。"
            },
            {
                "rank": 3,
                "cause": "溫控器 PID 運算異常或容量調節機構卡在 100% 開度",
                "probability": "低 (15%)",
                "evidence_fields": ["AAA0059", "AAA0028"],
                "evidence_pattern": "低負載時壓縮機持續滿載未卸載。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "立即確認冰水水泵運轉狀態及水流開關 (Water Flow Switch) 接點閉合狀態。",
                "tools_needed": "目視泵浦運轉燈、三用電表",
                "estimated_time": "10 分鐘",
                "difficulty": "低"
            },
            {
                "step": 2,
                "action": "使用標準精密溫度計比對校正 AAA0028 感溫棒讀值。",
                "tools_needed": "校正級接觸式溫度計",
                "estimated_time": "20 分鐘",
                "difficulty": "低"
            }
        ]
    },
    {
        "symptom_code": "OVERCURRENT_TRIP",
        "symptom_desc": "壓縮機過電流過載保護跳脫 (Compressor Motor Overcurrent Trip, AAA0018=1)",
        "category": "electrical",
        "severity": "critical",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "related_alarm_codes": ["OVERCURRENT_CRITICAL", "COMPRESSOR_OVERCURRENT"],
        "tags": ["過載跳脫", "電磁開關", "馬達燒毀", "過電流"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "超高壓運轉導致馬達負載大幅超過銘牌額定滿載電流 (Overloaded due to Extreme High Pressure)",
                "probability": "高 (50%)",
                "evidence_fields": ["AAA0036", "AAA0059", "AAA0018"],
                "evidence_pattern": "跳脫前 AAA0036 突破 18.0 kg/cm²，功率超過 140 kW。"
            },
            {
                "rank": 2,
                "cause": "電源電壓驟降 (Voltage Sag) 或欠相 (Phase Loss)",
                "probability": "中 (25%)",
                "evidence_fields": ["AAA0018"],
                "evidence_pattern": "配電盤電壓異常，積熱電驛 (Thermal Relay) 動作。"
            },
            {
                "rank": 3,
                "cause": "馬達定子線圈絕緣劣化或匝間短路 (Motor Winding Insulation Breakdown)",
                "probability": "低 (15%)",
                "evidence_fields": ["AAA0018"],
                "evidence_pattern": "三相電阻不平衡或對地絕緣電阻 < 5 MΩ。"
            },
            {
                "rank": 4,
                "cause": "壓縮機機械卡死 / 抱軸 (Mechanical Lockup / Seizure)",
                "probability": "低 (10%)",
                "evidence_fields": ["AAA0018", "AAA0059"],
                "evidence_pattern": "啟動瞬間瞬時電流達到堵轉電流 (LRA) 並直接跳脫。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "量測馬達線圈對地絕緣電阻 (Megger Test, 1000V DC) 與三相繞組直流電阻值。",
                "tools_needed": "高阻計 (Megger)、微歐姆表",
                "estimated_time": "30 分鐘",
                "difficulty": "中"
            },
            {
                "step": 2,
                "action": "檢查電磁接觸器 (Magnetic Contactor) 接點是否有積碳、熔焊或電壓線圈燒損。",
                "tools_needed": "目視檢驗、電表",
                "estimated_time": "20 分鐘",
                "difficulty": "低"
            }
        ]
    },
    {
        "symptom_code": "HIGH_PRESSURE_TRIP",
        "symptom_desc": "冷媒高壓保護開關跳脫 (High Pressure Safety Switch Tripped, >18.0 kg/cm²)",
        "category": "pressure",
        "severity": "critical",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "related_alarm_codes": ["HIGH_PRESSURE_CRITICAL"],
        "tags": ["高壓跳脫", "散熱中斷", "安全連鎖"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "冷卻水泵突然跳脫或冷卻水塔風扇全停 (Cooling Water Flow Suddenly Ceased)",
                "probability": "高 (65%)",
                "evidence_fields": ["AAA0036", "AAA0030"],
                "evidence_pattern": "高壓在 60 秒內由 15 kg/cm² 飆升至 19 kg/cm²。"
            },
            {
                "rank": 2,
                "cause": "冷凝器水路蝶閥被誤關閉 (Water Valve Inadvertently Closed)",
                "probability": "中 (20%)",
                "evidence_fields": ["AAA0036"],
                "evidence_pattern": "無冷卻水流循環。"
            },
            {
                "rank": 3,
                "cause": "高壓壓力開關本體微動開關故障 (Defective HP Switch)",
                "probability": "低 (15%)",
                "evidence_fields": ["AAA0036"],
                "evidence_pattern": "實測壓力僅 15 kg/cm² 但高壓接點已開路。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "手動手動復歸高壓開關前，必須徹底查明冷卻水循環是否恢復正常。",
                "tools_needed": "手動按鈕復歸",
                "estimated_time": "15 分鐘",
                "difficulty": "低"
            }
        ]
    },
    {
        "symptom_code": "LOW_PRESSURE_TRIP",
        "symptom_desc": "冷媒低壓保護開關跳脫 (Low Pressure Safety Switch Tripped, <2.2 kg/cm²)",
        "category": "refrigerant",
        "severity": "critical",
        "applicable_models": ["ECO-100RT", "MED-200RT", "FIN-80RT", "MFG-50RT"],
        "related_alarm_codes": ["LOW_PRESSURE_TRIP"],
        "tags": ["低壓跳脫", "大量洩漏", "膨脹閥卡死"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "冷媒管路破裂造成冷媒大量外洩 (Severe Refrigerant Loss)",
                "probability": "高 (60%)",
                "evidence_fields": ["AAA0037", "AAA0036"],
                "evidence_pattern": "低壓歸零或接近大氣壓。"
            },
            {
                "rank": 2,
                "cause": "電磁閥 (Solenoid Valve) 線圈燒毀無法開啟冷媒迴路",
                "probability": "中 (25%)",
                "evidence_fields": ["AAA0037"],
                "evidence_pattern": "電磁閥前溫熱、後端冰冷結霜。"
            },
            {
                "rank": 3,
                "cause": "低溫環境下啟動低壓延遲繼電器 (Bypass Timer) 設定時間過短",
                "probability": "低 (15%)",
                "evidence_fields": ["AAA0037"],
                "evidence_pattern": "僅在冬季低水溫剛啟動時跳脫。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "檢查冷媒壓力錶指針，判定是真實失壓還是電磁閥不作動。",
                "tools_needed": "複合壓力表",
                "estimated_time": "15 分鐘",
                "difficulty": "低"
            }
        ]
    },
    {
        "symptom_code": "WATER_FLOW_LOSS",
        "symptom_desc": "水流開關斷路跳脫保護 (Water Flow Switch Interrupted, AAA0003=1)",
        "category": "water_flow",
        "severity": "critical",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "HOSP-250RT", "BIO-300RT"],
        "related_alarm_codes": ["COMPOUND_LEGACY_3151"],
        "tags": ["水流開關", "斷水保護", "水泵跳電", "管路氣塞"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "水泵跳脫或過載 (Pump Trip / Power Outage)",
                "probability": "高 (50%)",
                "evidence_fields": ["AAA0003"],
                "evidence_pattern": "水流開關靶片未受推力復歸斷路。"
            },
            {
                "rank": 2,
                "cause": "管路系統發生氣塞 (Air Lock in Piping)",
                "probability": "中 (30%)",
                "evidence_fields": ["AAA0003"],
                "evidence_pattern": "水泵運轉但無實際出水流量，排氣閥噴出大量空氣。"
            },
            {
                "rank": 3,
                "cause": "靶式水流開關葉片斷裂或微動開關接點氧化 (Paddle Broken / Switch Oxidized)",
                "probability": "低 (20%)",
                "evidence_fields": ["AAA0003"],
                "evidence_pattern": "管路有水流但訊號未導通。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "手動開啟管路高點自動排氣閥排除氣塞。",
                "tools_needed": "排氣工具",
                "estimated_time": "20 分鐘",
                "difficulty": "低"
            },
            {
                "step": 2,
                "action": "檢查更換水流開關不鏽鋼靶片。",
                "tools_needed": "管鉗、新靶片",
                "estimated_time": "1 小時",
                "difficulty": "中"
            }
        ]
    },
    {
        "symptom_code": "HIGH_COND_DELTA_SHRINK",
        "symptom_desc": "冷卻水出入水溫差縮小且熱排斥不良 (Condenser Delta-T Shrinking, < 2.5°C)",
        "category": "water_flow",
        "severity": "medium",
        "applicable_models": ["ECO-100RT", "CT-120", "MED-200RT", "SEMI-150RT"],
        "related_alarm_codes": ["COMPOUND_LEGACY_3151"],
        "tags": ["冷卻水溫差", "水流量過快", "散熱不良"],
        "possible_causes": [
            {
                "rank": 1,
                "cause": "冷卻水流量超額旁通或水泵過載運轉",
                "probability": "高 (50%)",
                "evidence_fields": ["AAA0030", "AAA0031"],
                "evidence_pattern": "溫差極小但主機高壓高。"
            },
            {
                "rank": 2,
                "cause": "冷凝器管束分水隔板 (Baffle Plate) 腐蝕穿孔短路",
                "probability": "中 (30%)",
                "evidence_fields": ["AAA0030", "AAA0031"],
                "evidence_pattern": "水流直接由入水口沖至出水口未流經管束。"
            },
            {
                "rank": 3,
                "cause": "冷卻塔布水槽溢流未均勻流經散熱片",
                "probability": "低 (20%)",
                "evidence_fields": ["AAA0030"],
                "evidence_pattern": "散熱片局部乾燥無水流覆蓋。"
            }
        ],
        "recommended_actions": [
            {
                "step": 1,
                "action": "檢查冷卻水塔上水盆噴嘴是否堵塞或水槽溢流。",
                "tools_needed": "目視與清潔",
                "estimated_time": "30 分鐘",
                "difficulty": "低"
            }
        ]
    }
]

WORK_ORDER_SEEDS = [
    {
        "work_order_no": "WO-2026-0801",
        "machine_id": 15,
        "fault_phenomenon": "A區智慧園區1號機冷卻水出水溫度連續一週由 34.5°C 逐漸爬升至 37.2°C，能效 COP 由 5.2 降至 4.1，觸發 HIGH_PRESSURE_WARNING。",
        "root_cause": "冷卻水塔散熱片（Fill Packing）沈積大量碳酸鈣水垢與藻類生物膜，嚴重阻礙熱交換氣流。",
        "repair_actions": "使用高壓水槍搭配專用生化除藻劑全面沖洗冷卻水塔散熱片；更換水塔加藥機之阻垢劑桶並重新校正自動排污電導度設定 (2200 μS/cm)。",
        "parts_replaced": [{"part_name": "冷卻塔阻垢藥劑", "part_no": "CHEM-SCALE-20L", "qty": 2, "cost": 4800}, {"part_name": "布水噴嘴", "part_no": "NOZZLE-CT120", "qty": 4, "cost": 1600}],
        "labor_hours": 4.5,
        "downtime_hours": 2.0,
        "technician_name": "陳建宏 (技師長)",
        "repair_date": "2026-08-01",
        "alarm_codes": ["HIGH_PRESSURE_WARNING", "LOW_COP_EFFICIENCY_LOSS"],
        "symptom_codes": ["HIGH_COND_LEAVING_TEMP", "LOW_COP_DEGRADATION"],
        "effectiveness": "resolved",
        "notes": "清洗後出水溫度降回 34.2°C，COP 恢復至 5.15。建議每季定期實施散熱片化學軟化清洗。"
    },
    {
        "work_order_no": "WO-2026-0722",
        "machine_id": 6,
        "fault_phenomenon": "D區晶圓一廠無塵8號機冷媒低壓在兩週內由 3.8 kg/cm² 緩慢下滑至 2.4 kg/cm²，即將觸發 LOW_PRESSURE_TRIP。",
        "root_cause": "蒸發器出水側法蘭感溫棒盲套螺紋處微量滲漏 R134a 冷媒，伴隨微量冷凍機油漬。",
        "repair_actions": "使用電子探漏儀定位漏點；回收系統殘存冷媒，更換耐油 O-Ring 密封墊圈並重新上厭氧螺膠鎖固；充氮氣 15 kg/cm² 測漏保壓 24 小時合格；抽真空至 350 microns 後回充 R134a 冷媒 45 kg。",
        "parts_replaced": [{"part_name": "R134a 冷媒", "part_no": "REF-R134A-C13", "qty": 45, "cost": 18000}, {"part_name": "耐冷媒高溫 O-Ring", "part_no": "ORING-HNBR-G40", "qty": 2, "cost": 500}, {"part_name": "乾燥過濾心", "part_no": "FLT-DRY-48", "qty": 1, "cost": 2200}],
        "labor_hours": 8.0,
        "downtime_hours": 6.0,
        "technician_name": "林志明 (資深冷凍技師)",
        "repair_date": "2026-07-22",
        "alarm_codes": ["LOW_PRESSURE_TRIP"],
        "symptom_codes": ["LOW_PRESSURE_TRENDING"],
        "effectiveness": "resolved",
        "notes": "修復後低壓穩定維持 3.85 kg/cm²，探漏儀複檢無任何殘留洩漏訊號。"
    },
    {
        "work_order_no": "WO-2026-0715",
        "machine_id": 23,
        "fault_phenomenon": "F區生醫1號機即時 COP 能效由 5.4 逐日退化至 4.3，耗電量異常增加 15 kW，冰水出水溫度反應遲緩。",
        "root_cause": "蒸發器水側銅管內壁沈積生物軟泥，熱傳導效率大幅衰退。",
        "repair_actions": "拆卸蒸發器前後水室端蓋，使用全自動通管機搭配尼龍刷毛徹底通刷 240 根熱傳銅管；以清水高壓逆洗後復原端蓋並更換耐壓墊片。",
        "parts_replaced": [{"part_name": "端蓋密封墊片", "part_no": "GSK-EVAP-300", "qty": 2, "cost": 3200}],
        "labor_hours": 6.0,
        "downtime_hours": 5.0,
        "technician_name": "黃國華 (機電工程師)",
        "repair_date": "2026-07-15",
        "alarm_codes": ["COP_EFFICIENCY_DEGRADATION"],
        "symptom_codes": ["LOW_COP_DEGRADATION", "CHILLED_SUPPLY_RISING"],
        "effectiveness": "resolved",
        "notes": "通管後蒸發逼近溫差由 3.6°C 降低至 1.1°C，COP 顯著回升至 5.35。"
    },
    {
        "work_order_no": "WO-2026-0703",
        "machine_id": 11,
        "fault_phenomenon": "E區研究棟2號機壓縮機滿載運轉時高頻噪聲達到 88 dBA，伴隨水平振動 4.2 mm/s (超過 ISO 容許值)。",
        "root_cause": "壓縮機馬達聯軸器橡膠緩衝塊 (Spider Insert) 疲勞硬化碎裂，導致驅動軸與螺旋轉子微幅偏心。",
        "repair_actions": "停機拆解聯軸器護罩，更換原廠高彈性聚氨酯緩衝塊；使用雙雷射對心儀重新校正徑向與軸向對心誤差至 0.03 mm 以內；緊固地腳螺栓並補強防振橡膠墊。",
        "parts_replaced": [{"part_name": "聯軸器聚氨酯緩衝塊", "part_no": "CPL-RUBBER-H250", "qty": 1, "cost": 6500}],
        "labor_hours": 5.0,
        "downtime_hours": 4.0,
        "technician_name": "王俊傑 (設備維護組長)",
        "repair_date": "2026-07-03",
        "alarm_codes": [],
        "symptom_codes": ["VIBRATION_ABNORMAL", "POWER_INCREASING"],
        "effectiveness": "resolved",
        "notes": "修復後振動值降至 1.3 mm/s (優良等級)，噪音降回 74 dBA。"
    },
    {
        "work_order_no": "WO-2026-0628",
        "machine_id": 5,
        "fault_phenomenon": "B區急重症1號機在夏季中午高溫時段頻繁觸發 HIGH_PRESSURE_WARNING (冷媒高壓達 17.6 kg/cm²)。",
        "root_cause": "冷卻水泵入出口 Y 型過濾網被大量鐵鏽泥渣堵塞達 70%，循環水流量僅剩額定 55%。",
        "repair_actions": "關閉水泵隔離閥，拆開 Y 型過濾器清潔不鏽鋼濾網筒，清除沉積泥沙；重新注水排氣後啟動水泵測試，水流差壓恢復正常。",
        "parts_replaced": [{"part_name": "Y型過濾網不鏽鋼網芯", "part_no": "STR-MESH-SS-8IN", "qty": 1, "cost": 3800}],
        "labor_hours": 2.5,
        "downtime_hours": 1.0,
        "technician_name": "陳建宏 (技師長)",
        "repair_date": "2026-06-28",
        "alarm_codes": ["HIGH_PRESSURE_WARNING"],
        "symptom_codes": ["HIGH_COND_LEAVING_TEMP", "HIGH_PRESSURE_TRENDING"],
        "effectiveness": "resolved",
        "notes": "建議納入每月定期巡檢清洗排程，並檢視冰水管路防蝕加藥效果。"
    },
    {
        "work_order_no": "WO-2026-0615",
        "machine_id": 7,
        "fault_phenomenon": "C區金融大樓1號機出水溫度 8.0°C、回水溫度 9.6°C，溫差僅 1.6°C，主機長時間處於低溫差低載運轉。",
        "root_cause": "大樓 12F 與 18F 兩處大型 AHU 冰水二通調節閥執行器卡死在 100% 全開位置，冰水直接短路回流。",
        "repair_actions": "更換卡死之電動二通閥伺服馬達驅動器 (Actuator)；校正 0~10V 控制訊號回授線性度；調整中央監控 DDC 閥位控制演算法。",
        "parts_replaced": [{"part_name": "電動調節閥執行器", "part_no": "ACTUATOR-0-10V-24V", "qty": 2, "cost": 15000}],
        "labor_hours": 4.0,
        "downtime_hours": 0.0,
        "technician_name": "黃國華 (機電工程師)",
        "repair_date": "2026-06-15",
        "alarm_codes": ["COMPOUND_LEGACY_3151"],
        "symptom_codes": ["CHILLED_DELTA_SHRINK"],
        "effectiveness": "resolved",
        "notes": "更換後主系統出回水溫差立即由 1.6°C 擴大至 4.8°C，主機 COP 提升 18%。"
    },
    {
        "work_order_no": "WO-2026-0602",
        "machine_id": 10,
        "fault_phenomenon": "G區沖壓100RT機運轉中無預警觸發 COMPRESSOR_OVERCURRENT 警報跳脫停機。",
        "root_cause": "主配電盤內電磁接觸器 (MC) 主接點長時間開閉弧光造成銀合金接點嚴重燒蝕熔損，導致單相接觸不良產生欠相過載。",
        "repair_actions": "更換全新富士 (Fuji) 額定 180A 交流電磁接觸器一組；緊固所有主電路螺絲並做紅外線熱影像測溫確認無過熱點。",
        "parts_replaced": [{"part_name": "電磁接觸器 180A", "part_no": "MC-FUJI-SC-N8", "qty": 1, "cost": 9800}, {"part_name": "熱過載電驛", "part_no": "TOR-FUJI-TR-ON", "qty": 1, "cost": 3200}],
        "labor_hours": 3.0,
        "downtime_hours": 3.0,
        "technician_name": "林志明 (資深冷凍技師)",
        "repair_date": "2026-06-02",
        "alarm_codes": ["COMPRESSOR_OVERCURRENT", "OVERCURRENT_CRITICAL"],
        "symptom_codes": ["OVERCURRENT_TRIP", "POWER_INCREASING"],
        "effectiveness": "resolved",
        "notes": "全載運轉測試 1 小時，三相電流分別為 112A, 114A, 113A，平衡度良好。"
    },
    {
        "work_order_no": "WO-2026-0520",
        "machine_id": 15,
        "fault_phenomenon": "A區1號水塔風扇皮帶斷裂，導致冷卻水塔風扇停擺，水溫迅速爬升至 38.0°C 觸發警告。",
        "root_cause": "冷卻塔傳動皮帶達到 8500 運轉小時未定期更換，橡膠老化龜裂斷裂。",
        "repair_actions": "更換全新進口抗靜電耐油 V 型皮帶一組 (B-85 × 4條)；使用皮帶張力計調整張力至 45 kgf；校正馬達與風扇皮帶輪平行度。",
        "parts_replaced": [{"part_name": "高張力V型傳動皮帶", "part_no": "BELT-V-B85", "qty": 4, "cost": 2400}],
        "labor_hours": 2.0,
        "downtime_hours": 1.5,
        "technician_name": "王俊傑 (設備維護組長)",
        "repair_date": "2026-05-20",
        "alarm_codes": ["HIGH_PRESSURE_WARNING"],
        "symptom_codes": ["HIGH_COND_LEAVING_TEMP"],
        "effectiveness": "resolved",
        "notes": "風扇重啟後冷卻出水溫於 15 分鐘內由 38°C 降回 32.5°C。已更新零件壽命紀錄。"
    },
    {
        "work_order_no": "WO-2026-0505",
        "machine_id": 9,
        "fault_phenomenon": "G區車削50RT機壓縮機潤滑油壓差降至 0.9 kg/cm² (正常為 1.8~2.5 kg/cm²)，即將連鎖跳脫。",
        "root_cause": "冷凍機油運轉時數達 9200 小時，油品酸化並使油過濾器濾芯積碳堵塞。",
        "repair_actions": "抽乾舊潤滑油，使用氮氣吹洗油迴路；更換內置式精密油過濾器濾芯；注入全新出光 (Idemitsu) Daphne FVC68D 合成冷凍機油 18 公升；測試油壓差回升至 2.2 kg/cm²。",
        "parts_replaced": [{"part_name": "合成冷凍機油 18L", "part_no": "OIL-POE-68-18L", "qty": 1, "cost": 7200}, {"part_name": "油過濾器濾芯", "part_no": "FLT-OIL-50RT", "qty": 1, "cost": 3500}],
        "labor_hours": 3.5,
        "downtime_hours": 3.0,
        "technician_name": "陳建宏 (技師長)",
        "repair_date": "2026-05-05",
        "alarm_codes": [],
        "symptom_codes": ["OIL_PRESSURE_LOW"],
        "effectiveness": "resolved",
        "notes": "取油樣測試酸價由原本 0.18 mgKOH/g 降至 <0.02 mgKOH/g。"
    },
    {
        "work_order_no": "WO-2026-0418",
        "machine_id": 14,
        "fault_phenomenon": "E區病房3號機在清晨低溫低負載時誤觸發 FREEZE_ALARM_CRITICAL 停機。",
        "root_cause": "冰水出水溫度感測器 (AAA0028) PT100 白金電阻接線端子受潮氧化產生 1.8 歐姆接觸電阻，導致顯示溫度比實際水溫低 4.5°C。",
        "repair_actions": "更換全新防水型 PT100 溫度感測棒一組；重做訊號線壓接與熱縮套管密封；以標準校驗器比對 0°C 與 10°C 雙點誤差在 ±0.1°C 以內。",
        "parts_replaced": [{"part_name": "PT100 溫度感測器 (防水型)", "part_no": "SEN-PT100-IP67", "qty": 1, "cost": 1800}],
        "labor_hours": 2.0,
        "downtime_hours": 1.0,
        "technician_name": "黃國華 (機電工程師)",
        "repair_date": "2026-04-18",
        "alarm_codes": ["FREEZE_ALARM_CRITICAL"],
        "symptom_codes": ["FREEZE_PROTECTION"],
        "effectiveness": "resolved",
        "notes": "排除假性防凍跳脫，系統恢復自動排程正常啟閉。"
    }
]

FAQ_SEEDS = [
    {
        "question": "什麼是工業冰水機的『逼近溫差』(Approach Temperature)？如何利用它判斷熱交換器結垢？",
        "answer": "逼近溫差是指冷媒飽和溫度與水側出水溫度之間的差值：\n1. 冷凝器逼近度 = 飽和冷凝溫度 - 冷卻水出水溫度 (正常值 0.5 ~ 1.5°C)\n2. 蒸發器逼近度 = 冰水出水溫度 - 飽和蒸發溫度 (正常值 0.5 ~ 2.0°C)\n當冷凝器或蒸發器銅管結垢時，傳熱阻力增加，逼近度會逐漸擴大 (> 2.5°C)。每增加 1°C 的逼近度，主機耗電量約增加 2.5~3.5%。因此透過 IoT 連續監測逼近溫差趨勢，是預測性通管保養的最佳指標。",
        "category": "chiller_operation",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "HOSP-250RT", "BIO-300RT"],
        "source": "ASHRAE_handbook",
        "tags": ["逼近度", "熱交換", "結垢", "能耗分析"]
    },
    {
        "question": "為什麼冷卻水出水溫度升高會直接導致冷媒高壓 (AAA0036) 飆高與主機耗電劇增？",
        "answer": "冷凝器的任務是將壓縮機排出的高溫高壓氣態冷媒冷卻液化。冷媒的冷凝溫度必須高於冷卻水出水溫度才能放熱。當冷卻水出水溫度每上升 1°C，冷媒冷凝壓力約增加 0.4~0.6 kg/cm²。高壓升高代表壓縮機必須做更多的功才能將冷媒排出，直接導致總功率 (AAA0059) 增加 2~4%，COP 能效明顯下滑。若不及時處置，高壓將突破 18.0 kg/cm² 觸發保護跳脫。",
        "category": "chiller_operation",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "source": "industry_standard",
        "tags": ["冷媒高壓", "冷卻水溫", "熱力學原理"]
    },
    {
        "question": "冷卻水塔散熱片最佳清洗頻率為何？水質控制有哪些核心指標？",
        "answer": "建議保養標準：\n1. 清洗頻率：開放式冷卻水塔散熱片建議每季 (3個月) 目視檢查，每半年至一年實施高壓化學清洗除垢。\n2. 水質核心控制指標 (依據 CTI / ASHRAE 規範)：\n   - 電導度 (Conductivity): 建議維持在 1500 ~ 2200 μS/cm (藉由自動排污控制濃縮倍數 3~4 倍)\n   - pH 值: 7.5 ~ 8.8 (避免酸蝕與過度結垢)\n   - 總硬度 (Total Hardness as CaCO3): < 400 ppm\n   - 濁度 (Turbidity): < 15 NTU\n   - 菌落總數: 定期投放殺菌滅藻劑抑制退伍軍人菌及生物膜黏泥生長。",
        "category": "cooling_tower",
        "applicable_models": ["CT-120", "ECO-CT-01", "ECO-CT-02"],
        "source": "field_experience",
        "tags": ["水塔保養", "水質控制", "濃縮倍數", "退伍軍人菌"]
    },
    {
        "question": "空調水系統出現『低溫差症候群』(Low Delta-T Syndrome) 代表什麼問題？有何危害？",
        "answer": "低溫差症候群是指冰水出水與回水溫差遠小於設計值 (例如設計溫差 5.0°C，實測僅 1.5~2.5°C)。\n主要成因包括：\n1. 末端二通/三通閥損壞洩漏或壓差旁通閥設定錯誤，造成大量低溫冰水未經熱交換即短路流回主機。\n2. 二次水泵水流量過大，水流速度過快導致熱交換不足。\n危害：冰水主機即使在極低負載下，也必須持續啟動大流量水泵與主機運轉，造成大量電力浪費 (水泵功耗與主機低能效比)，且佔用備用機組容量。",
        "category": "pump_system",
        "applicable_models": ["ECO-100RT", "MED-200RT", "FIN-80RT", "HOSP-250RT"],
        "source": "ASHRAE_handbook",
        "tags": ["低溫差", "旁通洩漏", "水泵能耗", "系統調校"]
    },
    {
        "question": "如何透過 Modbus 暫存器數據即時計算冰水主機的即時 COP 與冷凍噸數？",
        "answer": "計算公式如下：\n1. 即時冷凍能力 (USRT, 噸數)：\n   RT = [ 水流量(LPM) × 1.0(比熱) × (AAA0029冰水回水 - AAA0028冰水出水) × 60 ] / 3024\n   (在定流量系統中，若以 100RT 額定 800 LPM 估算：RT ≈ 溫差 × 15.87)\n2. 性能係數 COP (Coefficient of Performance)：\n   COP = [ 即時冷凍能力 (kW) ] / [ 實體總功率 AAA0059 (kW) ]\n   COP = (RT × 3.517) / AAA0059\n優良冰水主機全載 COP 通常在 5.0 ~ 6.5 之間；若 COP < 4.0 且持續運轉，即視為能效嚴重劣化。",
        "category": "chiller_operation",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "source": "industry_standard",
        "tags": ["COP計算", "冷凍噸", "Modbus公式", "熱工計算"]
    },
    {
        "question": "壓縮機潤滑油 (Refrigerant Oil) 出現酸化或變色該如何處置？更換時有何注意事項？",
        "answer": "處置步驟：\n1. 取樣檢測：使用專用油酸試劑檢測，若總酸價 TAN > 0.10 mgKOH/g 或顏色由淡黃變為深褐色/綠色，代表內部發生化學裂解或馬達輕微匝間絕緣放電，必須立即換油。\n2. 更換要點：\n   - 必須使用與原廠完全相同等級的合成油 (如 POE 多元醇酯油 FVC68D 或 PAG 油)，嚴禁不同品牌或礦物油混用。\n   - 換油時必須同步更換乾燥過濾芯 (Filter Drier) 與內置式油濾芯。\n   - POE 油極易吸收空氣中水分，開封後必須於 15 分鐘內注入，並迅速抽真空以防油品水解生成酸性物質。",
        "category": "refrigerant",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "source": "field_experience",
        "tags": ["冷凍機油", "油酸價", "POE油", "保養規範"]
    },
    {
        "question": "冷媒低壓 (AAA0037) 過低與防凍警報 (AAA0013) 有何關聯性？",
        "answer": "兩者具有高度熱力學連鎖關係：\n當冷媒低壓壓力過低 (如 R134a 低壓 < 2.0 kg/cm² 對應飽和蒸發溫度 < 0°C)，蒸發器銅管管壁溫度將低於水的冰點 (0°C)。此時若水流稍微不足或水溫低，蒸發器水側銅管內的水極易迅速結冰膨脹，導致銅管破裂造成冷媒與水互相混合的毀滅性損壞。因此當低壓偏低時，系統會提前觸發防凍開關 AAA0013 或出水低溫 AAA0028 < 5.0°C 緊急停機保護。",
        "category": "chiller_operation",
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "HOSP-250RT", "BIO-300RT"],
        "source": "industry_standard",
        "tags": ["低壓保護", "防凍連鎖", "銅管破裂", "安全機制"]
    },
    {
        "question": "水泵機械軸封 (Mechanical Seal) 出現微量滲水是否需要立即更換？",
        "answer": "判定準則：\n1. 正常微潤滑：機械軸封在運轉中每分鐘有 1~3 滴極微量水滴滲出屬於正常現象（用於潤滑碳化矽/陶瓷動靜環端面）。\n2. 異常洩漏：若每分鐘滴水超過 10 滴，或停機狀態下持續滴水、形成連續水流，代表密封端面磨損、O-Ring 硬化或彈簧疲勞失壓，應安排於 1 週內更換機械軸封，避免水噴濺至馬達軸承或線圈導致馬達燒毀。",
        "category": "pump_system",
        "applicable_models": ["ECO-100RT", "CT-120", "MED-200RT"],
        "source": "field_experience",
        "tags": ["機械軸封", "水泵維護", "洩漏判定"]
    }
]

PARTS_LIFECYCLE_SEEDS = [
    {
        "part_name": "合成冷凍機潤滑油 (POE Oil)",
        "part_category": "oil",
        "expected_life_hours": 8000,
        "warning_threshold_hours": 7200,
        "expected_life_years": 1.0,
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "pm_interval_desc": "每運轉 8,000 小時或每年定檢換新，每半年抽樣檢驗酸價。",
        "replacement_procedure": "停機隔離冷媒系統，排出舊油並充氮吹洗，更換油濾芯後抽真空注新油。",
        "estimated_cost_range": "NT$ 6,000 ~ 12,000",
        "failure_symptoms": ["油壓差偏低", "油品酸價超標", "壓縮機運轉噪音增大", "油位視窗混濁"]
    },
    {
        "part_name": "乾燥過濾芯 (Liquid Line Filter Drier)",
        "part_category": "filter",
        "expected_life_hours": 8000,
        "warning_threshold_hours": 7000,
        "expected_life_years": 1.0,
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "pm_interval_desc": "每次冷凍機換油、大修或系統探漏充填冷媒時同步更換。",
        "replacement_procedure": "關閉液管前後手閥，回收濾桶冷媒，拆開端蓋更換乾燥濾心顆粒並抽真空。",
        "estimated_cost_range": "NT$ 2,000 ~ 4,500",
        "failure_symptoms": ["過濾器前後產生溫差結霜", "冷媒視窗變色指示含水量過高", "低壓偏低"]
    },
    {
        "part_name": "冷卻水塔傳動 V 型皮帶",
        "part_category": "belt",
        "expected_life_hours": 8000,
        "warning_threshold_hours": 6500,
        "expected_life_years": 1.0,
        "applicable_models": ["CT-120", "ECO-CT-01", "ECO-CT-02", "ECO-CT-03", "ECO-CT-04"],
        "pm_interval_desc": "每季檢查皮帶張力與龜裂狀況，每年定期整組更換。",
        "replacement_procedure": "鬆開馬達固定螺栓與張力螺桿，卸除舊皮帶，安裝新皮帶並以張力計測量校正。",
        "estimated_cost_range": "NT$ 1,500 ~ 3,500",
        "failure_symptoms": ["風扇轉速失速", "皮帶打滑尖叫聲", "冷卻水出水溫度上升", "皮帶斷裂"]
    },
    {
        "part_name": "冷卻水泵 Y 型過濾網",
        "part_category": "filter",
        "expected_life_hours": 2000,
        "warning_threshold_hours": 1800,
        "expected_life_years": 0.5,
        "applicable_models": ["ECO-100RT", "CT-120", "MED-200RT", "SEMI-150RT"],
        "pm_interval_desc": "每季定期拆卸清洗濾網不鏽鋼網筒。",
        "replacement_procedure": "關閉水泵隔離閥，卸下法蘭底蓋，取出濾網以高壓水清洗泥渣後復原。",
        "estimated_cost_range": "NT$ 2,500 ~ 6,000",
        "failure_symptoms": ["過濾器前後壓差 > 0.5 kg/cm²", "水泵出水量不足", "冷媒高壓升高"]
    },
    {
        "part_name": "壓縮機主交流電磁接觸器 (MC)",
        "part_category": "motor",
        "expected_life_hours": 25000,
        "warning_threshold_hours": 20000,
        "expected_life_years": 3.0,
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "pm_interval_desc": "每半年檢查接點燒蝕積碳狀況，每 3 年或 50,000 次啟閉預防性換新。",
        "replacement_procedure": "斷開主電源並驗電，拆卸控制線與主電路配線，更換接觸器並確認接線扭力。",
        "estimated_cost_range": "NT$ 6,500 ~ 15,000",
        "failure_symptoms": ["接點熔焊不放", "啟動火花過大", "三相電壓不平衡", "過電流跳脫"]
    },
    {
        "part_name": "水泵耐磨機械軸封 (Mechanical Seal)",
        "part_category": "gasket",
        "expected_life_hours": 15000,
        "warning_threshold_hours": 12000,
        "expected_life_years": 2.0,
        "applicable_models": ["ECO-100RT", "MED-200RT", "CT-120"],
        "pm_interval_desc": "每 2 年更換一組，平時巡檢滴水狀況。",
        "replacement_procedure": "解開馬達與泵體螺栓，抽出轉子葉輪，拆除舊動靜環並清潔軸心安裝新軸封。",
        "estimated_cost_range": "NT$ 4,500 ~ 10,000",
        "failure_symptoms": ["泵體連續滴水/漏水", "軸端鏽蝕", "水泵運轉異音"]
    },
    {
        "part_name": "PT100 冰水出水溫度感測棒",
        "part_category": "sensor",
        "expected_life_hours": 25000,
        "warning_threshold_hours": 20000,
        "expected_life_years": 3.0,
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "pm_interval_desc": "每年以標準溫度源進行 0°C 與 10°C 精度校驗，每 3 年更換。",
        "replacement_procedure": "由感溫盲套 (Thermowell) 旋出舊棒，塗抹導熱膏插入新棒並重新接線校正。",
        "estimated_cost_range": "NT$ 1,500 ~ 3,000",
        "failure_symptoms": ["溫度數值異常跳動", "數值固定不動", "溫度飄移引發誤報防凍"]
    },
    {
        "part_name": "冷媒高壓壓力傳送器 (4-20mA)",
        "part_category": "sensor",
        "expected_life_hours": 25000,
        "warning_threshold_hours": 20000,
        "expected_life_years": 3.0,
        "applicable_models": ["ECO-100RT", "MED-200RT", "SEMI-150RT", "BIO-300RT"],
        "pm_interval_desc": "每 2 年以標準壓力校驗儀校準 4-20mA 輸出對應壓力值。",
        "replacement_procedure": "關閉針閥，洩壓後拆卸舊傳送器，纏止洩帶鎖入新傳送器並以電表校零點與滿刻度。",
        "estimated_cost_range": "NT$ 4,000 ~ 8,000",
        "failure_symptoms": ["壓力訊號與機械錶不符", "訊號歸零斷線", "高壓讀數失真"]
    }
]
