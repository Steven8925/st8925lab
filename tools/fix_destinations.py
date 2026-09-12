#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix Travel-Assistance destination catalog in static fallback mode.
Ensures all 13 destinations in destSelect (especially Hokkaido CTS, Bangkok, Chiang Mai,
Singapore, Seoul, Paris, Iceland, Zermatt, Melbourne) are fully mapped with authentic
flights, hotels, activities, and daily itineraries, plus origin adaptations for SIN, HKG,
KHH, RMQ, and TPE. Never defaults to Vietnam Da Nang when another destination is picked.
"""

import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

NEW_CODE = '''      // Complete Destination Catalog for All 13 Preset Destinations + Custom Handling
      const destCodeMap = {
        'vietnam_danang': {
          name: '越南 · 峴港 / 會安 (Da Nang & Hoi An)', code: 'DAD', days: 4, cost: 24800, hours: 2.5,
          weather: { range: '24°C ~ 30°C', cond: '晴時多雲 · 舒適海風', pack: '透氣排汗夏裝、防曬乳、遮陽帽、泳裝與薄外套' },
          airline: '星宇航空 (STARLUX Airlines)', flightNo: 'JX701 / JX702', priceLow: 11000, priceHigh: 15500,
          outbound: { flight_no: 'JX701', dep: '08:00', arr: '09:40' },
          inbound: { flight_no: 'JX702', dep: '10:40', arr: '14:20' },
          hotels: [
            { name: '美溪沙灘五星海景渡假村 (TMS Hotel Da Nang Beach)', stars: 5, price: 3200, tag: '海景第一排 · 頂樓無邊際泳池', rating: 9.2, reviews: 2180 },
            { name: '會安古鎮精品河畔酒店 (Little Riverside Hoi An)', stars: 4, price: 2100, tag: '臨近秋盆河 · 水燈遊船便利', rating: 9.4, reviews: 1540 }
          ],
          activities: [
            { name: '巴拿山一日遊 (太陽世界纜車 + 黃金佛手橋門票)', price: 1150, rating: 4.8, reviews: 14200, provider: 'Klook' },
            { name: '美山聖地遺址探索半日遊 (占婆古文明世界遺產)', price: 680, rating: 4.7, reviews: 4300, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達峴港 · 美溪海灘漫步與海鮮晚宴', desc: `從${curOrigin.name}出發抵達峴港，下榻海景飯店後於美溪沙灘漫步，晚間享用在地海鮮生猛大餐。` },
            { day: 2, theme: '雲端仙境 · 巴拿山佛手金橋與法國村', desc: `搭乘世界最長單纜纜車直上巴拿山，漫步壯麗佛手黃金橋，穿梭中世紀法國村與空中花園。` },
            { day: 3, theme: '漫遊會安千年古鎮 · 水燈祈願與老街咖啡', desc: `探訪聯合國教科文組織世界文化遺產「會安古鎮」，參觀日本橋與福建會館，黃昏體驗放水燈。` },
            { day: 4, theme: `手信採買 · 龍橋打卡與${curOrigin.safeReturn}`, desc: `晨間選購腰果、滴漏咖啡與手工竹編包，搭乘專車前往機場，${curOrigin.safeReturn}。` }
          ]
        },
        'japan_hokkaido': {
          name: '日本 · 北海道 (Sapporo & Otaru - 溫泉海鮮、小樽運河、富良野)', code: 'CTS', days: 5, cost: 43500, hours: 3.8,
          weather: { range: '12°C ~ 20°C', cond: '秋高氣爽 · 早晚偏涼', pack: '保暖毛衣、防風風衣、健走鞋、輕暖外套與圍巾' },
          airline: '長榮航空 (EVA Air)', flightNo: 'BR116 / BR115', priceLow: 16800, priceHigh: 22500,
          outbound: { flight_no: 'BR116', dep: '09:30', arr: '14:05' },
          inbound: { flight_no: 'BR115', dep: '15:20', arr: '19:00' },
          hotels: [
            { name: '札幌美居酒店 (Mercure Hotel Sapporo)', stars: 4, price: 3800, tag: '薄野鬧區核心 · 地鐵步行3分鐘', rating: 9.0, reviews: 3200 },
            { name: '定山溪溫泉鶴雅渡假酒店 (Jozankei Tsuruga Resort Spa)', stars: 5, price: 6500, tag: '定山溪百大名湯 · 露天風呂與極致會席料理', rating: 9.4, reviews: 1980 }
          ],
          activities: [
            { name: '定山溪溫泉泡湯與小樽運河遊船套票', price: 1250, rating: 4.9, reviews: 16800, provider: 'Klook' },
            { name: '旭山動物園與美瑛青池一日遊 (四季彩之丘拼布花毯)', price: 1880, rating: 4.8, reviews: 12400, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達新千歲 · 札幌時計台與狸小路拉麵初巡禮', desc: `從${curOrigin.name}搭機直飛降落新千歲機場 [CTS]，搭乘 JR 快速特急直達札幌市區，漫步大通公園與電視塔，晚間於狸小路品味正宗濃厚味噌拉麵與札幌啤酒。` },
            { day: 2, theme: '浪漫運河風情 · 小樽音樂盒堂、北一硝子與海鮮壽司街', desc: `搭乘電車前往浪漫小樽，沿著小樽運河散步打卡，參觀百年音樂盒館與北一硝子玻璃工藝，午間於政壽司品味頂級現流海鮮握壽司。` },
            { day: 3, theme: '美瑛青池絕景 · 富良野四季彩之丘與哈密瓜甜品', desc: `探訪如夢似幻美瑛白金青池與白鬚瀑布，漫步四季彩之丘起伏的花毯拼布之路，於富田農場品嘗香濃薰衣草霜淇淋與夕張哈密瓜。` },
            { day: 4, theme: '定山溪百大名湯 · 溪谷紅葉溫泉與道地會席料理', desc: `前往札幌後花園定山溪溫泉，漫步二見吊橋欣賞溪谷秋色，入住日式溫泉旅宿，享受露天風呂深層放鬆與在地旬彩懷石晚餐。` },
            { day: 5, theme: `二條市場海鮮丼早餐 · 新千歲機場特產採買${curOrigin.safeReturn}`, desc: `清晨走訪二條市場品嘗爆量現剖海膽干貝丼，午後前往新千歲機場採買白色戀人、六花亭與生巧克力特產，搭機${curOrigin.safeReturn}。` }
          ]
        },
        'japan_kansai': {
          name: '日本 · 京阪神 (Kyoto & Osaka)', code: 'KIX', days: 5, cost: 38500, hours: 2.8,
          weather: { range: '18°C ~ 25°C', cond: '秋高氣爽 · 微風宜人', pack: '洋蔥式穿搭、好走的健走鞋、薄外套與保溫水瓶' },
          airline: '長榮航空 (EVA Air)', flightNo: 'BR132 / BR131', priceLow: 14000, priceHigh: 19800,
          outbound: { flight_no: 'BR132', dep: '08:30', arr: '11:00' },
          inbound: { flight_no: 'BR131', dep: '17:30', arr: '21:30' },
          hotels: [
            { name: '大阪難波十字飯店 (Cross Hotel Osaka)', stars: 4, price: 4200, tag: '道頓堀步行1分鐘 · 地點極佳', rating: 9.1, reviews: 3400 },
            { name: '京都三條皇家花園酒店 (The Royal Park Hotel)', stars: 4, price: 4800, tag: '鴨川與祇園步程內 · 古都韻味', rating: 9.3, reviews: 2100 }
          ],
          activities: [
            { name: '日本環球影城門票 (USJ 超級任天堂世界保證入園)', price: 2150, rating: 4.9, reviews: 38000, provider: 'Klook' },
            { name: '關西周遊券 Kansai Thru Pass (地鐵巴士無限搭乘)', price: 1200, rating: 4.8, reviews: 15400, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達關西 · 難波道頓堀美食初巡禮', desc: `搭乘直飛航班由${curOrigin.name}抵達關西 [KIX]，特急直達難波，打卡固力果跑跑人，品味正宗章魚燒。` },
            { day: 2, theme: '古都巡禮 · 清水寺清水舞台與祇園花見小路', desc: `晨間登清水寺俯瞰京都市容，漫步二三年坂石板路，午後探訪八坂神社與祇園。` },
            { day: 3, theme: '嵐山竹林野宮神社 · 嵯峨野觀光小火車', desc: `搭乘嵯峨野觀光小火車穿梭保津峽谷，漫步幽靜嵐山竹林之道與渡月橋。` },
            { day: 4, theme: '大阪熱血冒險 · 日本環球影城一日狂歡', desc: `暢玩超級任天堂世界馬力歐賽車、哈利波特禁忌之旅與飛天翼龍。` },
            { day: 5, theme: `黑門市場海鮮早餐 · 心齋橋伴手禮採買${curOrigin.safeReturn}`, desc: `走訪黑門市場品嘗黑毛和牛與現開海膽，下午於心齋橋免稅藥妝採買後前往關西機場，${curOrigin.safeReturn}。` }
          ]
        },
        'tokyo': {
          name: '日本 · 東京 (Tokyo)', code: 'NRT', days: 5, cost: 42000, hours: 3.3,
          weather: { range: '16°C ~ 23°C', cond: '涼爽舒適 · 晴朗', pack: '長袖襯衫、輕羽絨、防風外套、舒適運動休閒鞋' },
          airline: '中華航空 (China Airlines)', flightNo: 'CI100 / CI101', priceLow: 15500, priceHigh: 21000,
          outbound: { flight_no: 'CI100', dep: '08:55', arr: '13:15' },
          inbound: { flight_no: 'CI101', dep: '14:30', arr: '17:15' },
          hotels: [
            { name: '新宿格拉斯麗酒店 (Hotel Gracery Shinjuku 哥吉拉飯店)', stars: 4, price: 4600, tag: '歌舞伎町核心 · 交通樞紐', rating: 8.9, reviews: 4500 }
          ],
          activities: [
            { name: 'SHIBUYA SKY 展望台門票 (360度俯瞰澀谷十字路口)', price: 580, rating: 4.9, reviews: 29000, provider: 'Klook' }
          ],
          daily: [
            { day: 1, theme: '抵達東京 · 澀谷十字路口與 SHIBUYA SKY 夜景', desc: `由${curOrigin.name}起飛抵達成田 [NRT]，Skyliner 直達市區，登上 SHIBUYA SKY 俯瞰璀璨東京夜景。` },
            { day: 2, theme: '下町風情 · 淺草寺雷門、晴空塔與秋葉原', desc: `晨起參拜淺草寺求御守，漫步仲見世通，午後登晴空塔遠眺東京灣。` },
            { day: 3, theme: '潮流前線 · 明治神宮森呼吸、原宿竹下通與表參道', desc: `在明治神宮古木參天中沉澱心靈，隨後走訪表參道精品建築群與潮流選物店。` },
            { day: 4, theme: '東京近郊 · 鎌倉江之島一日電車巡禮', desc: `搭乘江之電打卡灌籃高手平交道，漫步江之島弁天橋，品味吻仔魚丼飯。` },
            { day: 5, theme: `銀座免稅百貨巡遊 · 特快前往機場${curOrigin.safeReturn}`, desc: `漫步銀座步行者天國，選購百年和果子與頂級伴手禮，前往成田機場，${curOrigin.safeReturn}。` }
          ]
        },
        'taiwan_tainan': {
          name: '台灣 · 台南府城 (Tainan)', code: 'TNN', days: 3, cost: 9800, hours: 1.5,
          weather: { range: '25°C ~ 31°C', cond: '晴空萬里 · 溫暖陽光', pack: '吸濕排汗短袖、遮陽帽、太陽眼鏡、健走鞋' },
          airline: '台灣高鐵 (Taiwan High Speed Rail)', flightNo: '南下特快車次', priceLow: 2700, priceHigh: 2700,
          outbound: { flight_no: 'THSR 115', dep: '08:30', arr: '10:05' },
          inbound: { flight_no: 'THSR 152', dep: '17:35', arr: '19:15' },
          hotels: [
            { name: '台南晶英酒店 (Silks Place Tainan)', stars: 5, price: 4500, tag: '府城文化五星 · 臨近新光三越', rating: 9.3, reviews: 3200 }
          ],
          activities: [
            { name: '奇美博物館常設展門票 (西洋藝術古典殿堂)', price: 200, rating: 4.9, reviews: 28000, provider: 'Klook' }
          ],
          daily: [
            { day: 1, theme: '抵達台南 · 國華街保安路小吃橫掃', desc: `抵達台南府城 [TNN]，直奔國華街品嘗溫體牛肉湯、小卷米粉、白糖粿與富盛號碗粿。` },
            { day: 2, theme: '古蹟與藝術重鎮 · 赤崁樓、安平古堡與奇美博物館', desc: `穿梭赤崁樓與安平老街巷弄，午後參觀奇美博物館宏偉阿波羅噴泉與館藏。` },
            { day: 3, theme: `四草綠色隧道生態 · 藍晒圖文創園區${curOrigin.safeReturn}`, desc: `搭乘竹筏穿梭「台灣袖珍版亞馬遜」四草紅樹林隧道，下午選購伴手禮，${curOrigin.safeReturn}。` }
          ]
        },
        'bangkok': {
          name: '泰國 · 曼谷 (Bangkok - 設計夜市、米其林、平價按摩)', code: 'BKK', days: 5, cost: 26800, hours: 3.8,
          weather: { range: '26°C ~ 33°C', cond: '熱帶風情 · 微風暖陽', pack: '透氣短袖、防曬乳、遮陽帽、涼鞋與薄長袖' },
          airline: '星宇航空 (STARLUX Airlines)', flightNo: 'JX741 / JX742', priceLow: 10500, priceHigh: 15500,
          outbound: { flight_no: 'JX741', dep: '09:10', arr: '12:00' },
          inbound: { flight_no: 'JX742', dep: '13:20', arr: '18:10' },
          hotels: [
            { name: '曼谷索菲特特色酒店 (SO/ Bangkok)', stars: 5, price: 3900, tag: '俯瞰倫披尼公園 · 頂樓無邊際景觀泳池', rating: 9.2, reviews: 2900 },
            { name: '察殿曼谷河畔酒店 (Chatrium Hotel Riverside Bangkok)', stars: 5, price: 3200, tag: '昭披耶河景第一排 · 免費接駁船', rating: 9.1, reviews: 2400 }
          ],
          activities: [
            { name: '昭披耶公主號豪華遊船自助晚宴 (Live 樂團演奏)', price: 950, rating: 4.8, reviews: 21000, provider: 'Klook' },
            { name: '美功鐵道市集與丹嫩莎朵水上市場經典一日遊', price: 1100, rating: 4.9, reviews: 31000, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達曼谷 · 昭披耶河畔景觀酒吧與夜市初探', desc: `從${curOrigin.name}起飛抵達曼谷蘇凡納布機場 [BKK]，入住河畔星級飯店，晚間登上高空景觀酒吧俯瞰璀璨昭披耶河。` },
            { day: 2, theme: '泰式文化殿堂 · 大皇宮玉佛寺與鄭王廟泰服體驗', desc: `穿梭大皇宮金碧輝煌建築群，搭乘水上渡輪前往鄭王廟換穿精美泰服拍照，傍晚享受道地泰式古法舒壓按摩。` },
            { day: 3, theme: '水陸經典市集 · 美功鐵道市場與丹嫩莎朵水上市場', desc: `目睹火車貼身穿過攤販的奇蹟景觀，隨後搭乘手搖木船漫遊水上市場品嘗椰子冰淇淋與現烤海鮮。` },
            { day: 4, theme: '現代曼谷潮流 · ICONSIAM 暹羅天地與米其林美饌', desc: `探訪室內水上市場與頂級精品百貨 ICONSIAM，午後享用精緻泰式下午茶，晚間搭乘昭披耶公主號遊船享用自助晚宴。` },
            { day: 5, theme: `四面佛祈福 · Big C 特產伴手禮採買${curOrigin.safeReturn}`, desc: `早晨前往市中心四面佛參拜祈福，於超市採購泰式奶茶、果乾與必買零食，專車前往機場${curOrigin.safeReturn}。` }
          ]
        },
        'thailand_chiangmai': {
          name: '泰國 · 清邁 (Chiang Mai - 文青古城、大象保護區、水燈節)', code: 'CNX', days: 5, cost: 25500, hours: 4.0,
          weather: { range: '22°C ~ 31°C', cond: '秋高氣爽 · 舒適微風', pack: '棉麻休閒服、防蚊液、好走健走鞋、遮陽帽' },
          airline: '長榮航空 (EVA Air)', flightNo: 'BR257 / BR258', priceLow: 11500, priceHigh: 16500,
          outbound: { flight_no: 'BR257', dep: '07:25', arr: '10:35' },
          inbound: { flight_no: 'BR258', dep: '11:45', arr: '16:30' },
          hotels: [
            { name: '清邁納尼蘭浪漫精品度假村 (Na Nirand Romantic Resort)', stars: 5, price: 3600, tag: '百年雨林大樹 · 濱河殖民復古美學', rating: 9.4, reviews: 1720 },
            { name: '清邁古城平塔拉精品酒店 (Pingviman Hotel)', stars: 4, price: 2300, tag: '古城核心內 · 傳統蘭納柚木庭園', rating: 9.3, reviews: 1480 }
          ],
          activities: [
            { name: '友善大象生態保護營體驗半日遊 (無騎乘親密餵食)', price: 1350, rating: 4.9, reviews: 18500, provider: 'Klook' },
            { name: '清萊白廟藍廟與黑屋博物館震撼一日遊', price: 1200, rating: 4.8, reviews: 26000, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達清邁 · 古城塔佩門與悠閒漫活散步', desc: `由${curOrigin.name}搭機直飛清邁 [CNX]，下榻蘭納風格渡假村，漫步古城塔佩門打卡，晚間於長康路夜市品嘗咖哩金麵。` },
            { day: 2, theme: '大象友善天堂 · 泥漿浴親密互動與雨林午餐', desc: `探訪無騎乘人道大象保護營，親手為大象調製草藥飯糰、在溪流中洗澡嬉戲，感受人與大自然的深度連結。` },
            { day: 3, theme: '清萊藝術奇蹟 · 白廟藍廟與黑屋建築饗宴', desc: `專車前往清萊探訪當代藝術家許龍才大師打造的純白佛寺，參觀神秘藍廟與黑屋博物館，驚嘆當代佛教藝術之美。` },
            { day: 4, theme: '素帖山雙龍寺 · 寧曼一號文創選品與高空咖啡', desc: `登頂素帖山雙龍寺俯瞰清邁全景，午後穿梭尼曼路 One Nimman 特色設計選物店與人氣精品咖啡館。` },
            { day: 5, theme: `古寺晨鐘祈福 · 瓦洛洛市場伴手禮採買${curOrigin.safeReturn}`, desc: `清晨於帕邢寺散步感受古剎寧靜，於瓦洛洛市場採買蜂蜜、芒果乾與泰北香料，專車前往機場${curOrigin.safeReturn}。` }
          ]
        },
        'singapore': {
          name: '新加坡 (Singapore - 濱海灣花園、金沙空中花園、聖淘沙)', code: 'SIN', days: 4, cost: 33500, hours: 4.5,
          weather: { range: '26°C ~ 32°C', cond: '熱帶花園 · 宜人海風', pack: '輕薄夏裝、遮陽傘、防曬乳、室內防冷氣薄外套' },
          airline: '新加坡航空 (Singapore Airlines)', flightNo: 'SQ877 / SQ876', priceLow: 12500, priceHigh: 17800,
          outbound: { flight_no: 'SQ877', dep: '14:10', arr: '18:50' },
          inbound: { flight_no: 'SQ876', dep: '08:10', arr: '12:55' },
          hotels: [
            { name: '新加坡皮克林賓樂雅臻選酒店 (PARKROYAL Pickering)', stars: 5, price: 6200, tag: '空中花園綠建築 · 牛車水地鐵步程', rating: 9.2, reviews: 3800 },
            { name: '新加坡卡爾登酒店 (Carlton Hotel Singapore)', stars: 4, price: 4500, tag: '政府大廈核心 · 交通極便利', rating: 9.0, reviews: 2900 }
          ],
          activities: [
            { name: '濱海灣花園雙冷室花穹與雲霧林門票 (含空中走廊)', price: 850, rating: 4.9, reviews: 42000, provider: 'Klook' },
            { name: '新加坡環球影城一日門票 (USS 全區保證入園)', price: 1850, rating: 4.8, reviews: 35000, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達花園城市 · 濱海灣超級樹燈光秀與金沙夜景', desc: `飛抵全球首屈一指的新加坡樟宜機場 [SIN]，入住綠意環繞飯店，晚間漫步濱海灣欣賞金沙水幕秀與超級樹璀璨燈光秀。` },
            { day: 2, theme: '未來植物王國 · 濱海灣花園雙冷室與魚尾獅公園', desc: `穿梭高聳室內瀑布「雲霧林」與奇花異草「花穹」，下午造訪標誌性魚尾獅公園，品嘗正宗松發肉骨茶與海南雞飯。` },
            { day: 3, theme: '歡樂熱血之島 · 聖淘沙名勝世界與斜坡滑車', desc: `搭乘跨海纜車直通聖淘沙島，體驗刺激 Skyline Luge 斜坡滑車，午後於巴拉望海灘放鬆漫步，傍晚品味辣椒螃蟹大餐。` },
            { day: 4, theme: `多元文化探訪 · 星耀樟宜室內雨漩渦瀑布${curOrigin.safeReturn}`, desc: `漫步牛車水與小印度彩色街屋，提前前往樟宜機場 Jewel 打卡 40 米室內大瀑布與採買斑蘭蛋糕，搭機${curOrigin.safeReturn}。` }
          ]
        },
        'korea_seoul': {
          name: '韓國 · 首爾 (Seoul - 弘大聖水洞、景福宮韓服、漢江咖啡)', code: 'ICN', days: 5, cost: 32500, hours: 2.6,
          weather: { range: '14°C ~ 22°C', cond: '秋高氣爽 · 晴空萬里', pack: '洋蔥式穿搭、防風外套、休閒鞋、護唇膏' },
          airline: '大韓航空 (Korean Air)', flightNo: 'KE186 / KE185', priceLow: 11000, priceHigh: 16500,
          outbound: { flight_no: 'KE186', dep: '12:25', arr: '16:00' },
          inbound: { flight_no: 'KE185', dep: '09:00', arr: '11:00' },
          hotels: [
            { name: '首爾明洞樂天酒店 (Lotte Hotel Seoul)', stars: 5, price: 4800, tag: '明洞商圈核心 · 乙支路入口地鐵直通', rating: 9.2, reviews: 4100 },
            { name: '弘大 RYSE 傲途格精選酒店 (RYSE Autograph Collection)', stars: 4, price: 4200, tag: '弘大潮流藝術地標 · 設計師空間', rating: 9.1, reviews: 2600 }
          ],
          activities: [
            { name: '景福宮精緻韓服租借體驗與北村韓屋街散策', price: 450, rating: 4.9, reviews: 31000, provider: 'Klook' },
            { name: '南山首爾塔展望台電子門票與夜景纜車券', price: 380, rating: 4.8, reviews: 22000, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達首爾 · 弘大潮流街區熱鬧初夜', desc: `從${curOrigin.name}搭機直飛首爾仁川 [ICN]，搭乘 AREX 直達弘大，走訪街頭音樂表演與風格選物店，晚間享用韓式烤五花肉配燒酒。` },
            { day: 2, theme: '王朝歷史穿越 · 景福宮韓服漫步與北村韓屋村', desc: `穿上傳統華麗韓服免費入景福宮參觀光化門守衛交接，漫步石牆路與北村韓屋古色古香聚落，午間品嘗土俗村蔘雞湯。` },
            { day: 3, theme: '首爾布魯克林 · 聖水洞工業風咖啡與首爾林', desc: `探索首爾最夯聖水洞廢棄工廠改建的特色咖啡館、快閃旗艦店與文創聚落，午後於首爾林綠意中散步放鬆。` },
            { day: 4, theme: '南山浪漫夜景 · 首爾塔俯瞰萬家燈火與漢江泡麵', desc: `登南山首爾塔掛情人鎖俯瞰繁華首爾天際線，傍晚前往汝矣島漢江公園租借野餐墊，體驗韓劇經典煮泡麵與外送炸雞。` },
            { day: 5, theme: `明洞美妝免稅採買 · 樂天超市手信${curOrigin.safeReturn}`, desc: `早晨於明洞品嘗神仙雪濃湯，最後衝刺採購韓國美妝、海苔與泡菜伴手禮，專車前往仁川機場${curOrigin.safeReturn}。` }
          ]
        },
        'europe_paris': {
          name: '法國 · 巴黎 (Paris - 羅浮宮、艾菲爾鐵塔、凡爾賽宮)', code: 'CDG', days: 8, cost: 76000, hours: 14.5,
          weather: { range: '11°C ~ 18°C', cond: '微涼秋意 · 詩意漫步', pack: '保暖大衣、舒適健走短靴、羊毛圍巾、防風風衣' },
          airline: '長榮航空 (EVA Air)', flightNo: 'BR87 / BR88', priceLow: 31000, priceHigh: 45000,
          outbound: { flight_no: 'BR87', dep: '23:30', arr: '07:35 (+1)' },
          inbound: { flight_no: 'BR88', dep: '11:20', arr: '06:30 (+1)' },
          hotels: [
            { name: '巴黎歌劇院英迪格酒店 (Hotel Indigo Paris Opera)', stars: 4, price: 8200, tag: '歌劇院旁精華地段 · 步行至羅浮宮', rating: 9.1, reviews: 1850 },
            { name: '鉑爾曼巴黎艾菲爾鐵塔酒店 (Pullman Tour Eiffel)', stars: 4, price: 8900, tag: '鐵塔腳下第一排 · 陽台直面鐵塔夜景', rating: 9.0, reviews: 2400 }
          ],
          activities: [
            { name: '羅浮宮博物館免排隊門票與持證中文語音導覽', price: 920, rating: 4.8, reviews: 52000, provider: 'Klook' },
            { name: '塞納河觀光遊船船票 (Bateaux Parisiens 免排隊)', price: 480, rating: 4.9, reviews: 39000, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達花都巴黎 · 塞納河漫步與艾菲爾鐵塔夜景', desc: `降落巴黎戴高樂機場 [CDG]，入住精緻巴黎飯店，傍晚漫步塞納河畔，在夏佑宮露台見證鐵塔整點閃爍的璀璨金光。` },
            { day: 2, theme: '西方藝術殿堂 · 羅浮宮三寶與杜樂麗花園', desc: `晨起造訪羅浮宮一睹蒙娜麗莎與勝利女神風采，午後漫步杜樂麗花園，在橘園美術館欣賞莫內巨幅睡蓮。` },
            { day: 3, theme: '皇家奢華極致 · 凡爾賽宮鏡廳與大運河花園', desc: `搭乘 RER 郊區特快前往凡爾賽宮，讚嘆巴洛克式鏡廳七百面鏡子的富麗堂皇，漫步凡爾賽幾何宏偉花園。` },
            { day: 4, theme: '波西米亞風情 · 蒙馬特高地、聖心堂與愛牆', desc: `漫步蒙馬特鵝卵石小徑，登聖心堂階梯俯瞰全巴黎市容，打卡浪漫愛牆並於小丘廣場品味法式咖啡。` },
            { day: 5, theme: '左岸人文哲思 · 聖母院、莎士比亞書店與花神咖啡', desc: `走訪西堤島巴黎聖母院，造訪海明威駐足的莎士比亞書店，午後於聖日耳曼大道花神咖啡館享用法式歐姆蛋與熱巧克力。` },
            { day: 6, theme: '印象派光影巡禮 · 奧賽博物館與香榭麗舍大道', desc: `走進由舊火車站改建的奧賽美術館，飽覽梵谷、雷諾瓦經典名作，傍晚登上凱旋門頂端遠眺十二條放射大道。` },
            { day: 7, theme: '巴黎購物美學 · 莎瑪麗丹百貨與瑪黑區獨立選品', desc: `造訪百年新藝術風莎瑪麗丹百貨與拉法葉頂樓露台，午後漫步瑪黑區復古小店，採購頂級甜點馬卡龍與法式香水。` },
            { day: 8, theme: `花都最後巡禮 · 戴高樂機場退稅${curOrigin.safeReturn}`, desc: `於街角法式小館享用羊角麵包與黑咖啡，專車前往戴高樂機場辦理退稅手續，滿載法式浪漫回憶${curOrigin.safeReturn}。` }
          ]
        },
        'europe_iceland': {
          name: '冰島 · 雷克雅維克 (Reykjavik - 藍湖地熱溫泉、黃金圈、極光)', code: 'KEF', days: 8, cost: 89000, hours: 17.0,
          weather: { range: '2°C ~ 8°C', cond: '極地冷冽 · 極光閃耀', pack: '防風防水厚羽絨、發熱衣褲、登山防水鞋、手套圍巾' },
          airline: '歐洲特選聯程 (芬蘭航空/冰島航空)', flightNo: 'AY100 / FI451', priceLow: 38000, priceHigh: 56000,
          outbound: { flight_no: 'AY100', dep: '09:05', arr: '19:40' },
          inbound: { flight_no: 'FI450', dep: '07:30', arr: '06:20 (+1)' },
          hotels: [
            { name: '藍湖溫泉矽藻酒店 (Silica Hotel at Blue Lagoon)', stars: 5, price: 12500, tag: '藍湖專屬私人地熱浴池 · 極致療癒', rating: 9.6, reviews: 1200 },
            { name: '雷克雅維克中心頂級大飯店 (Reykjavik Residence Hotel)', stars: 4, price: 6800, tag: '市中心主街彩虹街旁 · 廚房公寓', rating: 9.3, reviews: 2100 }
          ],
          activities: [
            { name: '藍湖地熱溫泉舒適套票 (含矽泥面膜、毛巾與特調飲品)', price: 3100, rating: 4.9, reviews: 28000, provider: 'Klook' },
            { name: '冰島黃金圈經典一日遊 (辛格韋德利、間歇泉、黃金瀑布)', price: 2300, rating: 4.9, reviews: 24000, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '降落冰與火之國 · 藍湖地熱溫泉夢幻初體驗', desc: `班機降落凱夫拉維克國際機場 [KEF]，直奔舉世聞名的藍湖地熱溫泉，在奶藍色礦物溫泉中敷天然白矽泥面膜徹底洗去飛行疲憊。` },
            { day: 2, theme: '冰島地理精華 · 經典黃金圈震撼自然奇觀', desc: `探訪美歐板塊裂谷辛格韋德利國家公園，見證 Strokkur 間歇泉每數分鐘噴發數十米沸水的壯觀，欣賞氣勢磅礡的黃金瀑布。` },
            { day: 3, theme: '南岸瀑布奇觀 · 塞里雅蘭水簾洞與彩虹瀑布', desc: `走進塞里雅蘭瀑布內側水簾洞步道，欣賞六十米直瀉而下的斯科加瀑布（彩虹瀑布），沿途飽覽遠方冰帽壯麗景致。` },
            { day: 4, theme: '異星末世黑沙灘 · 維克小鎮玄武岩石柱與狂浪', desc: `漫步維克黑沙灘，近距離觸摸風化幾何玄武岩石柱群，凝望大西洋洶湧拍岸浪濤與遠方海蝕巨岩。` },
            { day: 5, theme: '冰川壯麗徒步 · 瓦特納冰原晶瑩藍冰探秘', desc: `換上專業冰爪在持證嚮導帶領下攀登歐洲最大瓦特納冰原，走入深藍璀璨的天然冰洞，感受千萬年古老冰川的純淨震懾。` },
            { day: 6, theme: '傑古沙龍冰河湖 · 鑽石冰沙灘冰塊閃耀巡禮', desc: `搭乘水陸兩用船穿梭冰河湖中漂浮的巨型藍色冰山，漫步鑽石黑沙灘欣賞被海浪沖上岸晶瑩剔透如鑽石般的天然碎冰。` },
            { day: 7, theme: '雷克雅維克城市漫活 · 哈爾格林姆教堂與極光獵影', desc: `登上管風琴形狀的哈爾格林姆大教堂俯瞰彩色屋頂市容，漫步托寧湖，入夜搭乘極光專車深入郊區追逐夢幻綠色極光弧。` },
            { day: 8, theme: `極北手信採買 · 凱夫拉維克機場搭機${curOrigin.safeReturn}`, desc: `選購冰島傳統羊毛衣 Lopapeysa、火山鹽與深海魚油，前往 KEF 機場搭機，帶著極地魔幻記憶${curOrigin.safeReturn}。` }
          ]
        },
        '瑞士_策馬特': {
          name: '瑞士 · 策馬特 (Zermatt - 馬特洪峰、冰河列車景觀)', code: 'ZRH', days: 8, cost: 86000, hours: 13.5,
          weather: { range: '5°C ~ 15°C', cond: '阿爾卑斯純淨 · 峰頂積雪', pack: '輕量羽絨、抗 UV 墨鏡、防滑健行鞋、洋蔥式穿搭' },
          airline: '瑞士國際航空 (SWISS)', flightNo: 'LX139 / LX138', priceLow: 33000, priceHigh: 48000,
          outbound: { flight_no: 'LX139', dep: '23:15', arr: '06:10 (+1)' },
          inbound: { flight_no: 'LX138', dep: '13:30', arr: '07:55 (+1)' },
          hotels: [
            { name: '策馬特蒙特羅莎精品酒店 (Monte Rosa Hotel)', stars: 4, price: 7900, tag: '百年歷史傳奇 · 陽台眺望馬特洪峰', rating: 9.4, reviews: 1650 },
            { name: '策馬特馬特洪峰景觀公寓木屋 (Chalet Zermatt Peak)', stars: 5, price: 9500, tag: '無敵雪山全景 · 桑拿水療設施', rating: 9.5, reviews: 920 }
          ],
          activities: [
            { name: '高納葛拉特登山鐵道全景通票 (Gornergrat Bahn 倒影馬特洪峰)', price: 3400, rating: 4.9, reviews: 19500, provider: 'Klook' },
            { name: '瑞士旅行通票 Swiss Travel Pass (全境火車景觀列車無限搭乘)', price: 8800, rating: 4.9, reviews: 32000, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達蘇黎世 · 景觀齒軌列車直達策馬特無車山城', desc: `抵達蘇黎世機場 [ZRH]，持瑞士通票搭乘景觀火車穿越阿爾卑斯山脈前往策馬特無車環保小鎮，黃昏欣賞馬特洪峰金色晚霞。` },
            { day: 2, theme: '阿爾卑斯之王 · 高納葛拉特登山火車與利菲爾湖倒影', desc: `搭乘全歐最高露天齒軌火車登頂 3089 米高納葛拉特觀景台，漫步至利菲爾湖拍攝馬特洪峰完美鏡面湖面倒影。` },
            { day: 3, theme: '冰川天堂極致 · 馬特洪峰冰川天堂 3883 米冰宮', desc: `搭乘世界最高 3S 纜車登上馬特洪峰冰川天堂，走入地下 15 米天然冰宮，站在觀景台遠眺瑞士、義大利與法國阿爾卑斯群峰。` },
            { day: 4, theme: '策馬特五湖徒步 · 漫步高山草甸與傳統黑臉羊邂逅', desc: `走訪五湖健行步道（Stellisee / Grindjisee），在純淨高山空氣中徒步，遠離塵囂，午間於傳統木屋餐廳品嘗瑞士熱熔起司起司鍋。` },
            { day: 5, theme: '全景慢活傳奇 · 冰河列車穿越萊茵峽谷直抵琉森', desc: `搭乘舉世聞名的「冰河列車」全景大車窗車廂，穿越壯麗山谷與拱橋，午後抵達湖光山色的歷史名城琉森。` },
            { day: 6, theme: '琉森湖光倒影 · 卡貝爾木橋與垂死獅子石雕', desc: `漫步歐洲最古老卡貝爾木橋欣賞水塔倒影，造訪馬克吐溫譽為「世界上最悲傷感動的獅子石雕」，搭乘遊船暢遊琉森湖。` },
            { day: 7, theme: '蘇黎世都會魅力 · 班霍夫大道與老城區巡禮', desc: `搭車抵達蘇黎世，漫步全球最繁華班霍夫大道，探訪林登霍夫山丘俯瞰利馬特河老城美景，品嘗頂級瑞士手工巧克力。` },
            { day: 8, theme: `瑞士頂級手信 · 蘇黎世機場火車搭機${curOrigin.safeReturn}`, desc: `選購正宗瑞士軍刀、阿爾卑斯草本保養品與黑巧克力禮盒，搭乘機場快線前往 ZRH 機場辦理登機，平安賦歸${curOrigin.safeReturn}。` }
          ]
        },
        '澳洲_墨爾本': {
          name: '澳洲 · 墨爾本 (Melbourne - 大洋路、塗鴉巷、咖啡之都)', code: 'MEL', days: 7, cost: 58000, hours: 9.0,
          weather: { range: '14°C ~ 22°C', cond: '陽光和煦 · 舒適涼爽', pack: '休閒長袖、薄風衣外套、舒適健行平底鞋、防曬用品' },
          airline: '澳洲航空 / 中華航空', flightNo: 'CI057 / CI058', priceLow: 22000, priceHigh: 33000,
          outbound: { flight_no: 'CI057', dep: '23:30', arr: '11:45 (+1)' },
          inbound: { flight_no: 'CI058', dep: '22:10', arr: '05:55 (+1)' },
          hotels: [
            { name: '墨爾本朗廷酒店 (The Langham Melbourne)', stars: 5, price: 5800, tag: '雅拉河南岸第一排 · 經典英倫奢華', rating: 9.3, reviews: 2600 },
            { name: '墨爾本伊麗莎白街盛捷服務公寓 (Somerset on Elizabeth)', stars: 4, price: 3900, tag: '市中心免費電車區內 · 寬敞公寓', rating: 9.0, reviews: 2100 }
          ],
          activities: [
            { name: '大洋路與十二使徒岩壯麗海岸一日遊 (中文司導小團)', price: 2100, rating: 4.9, reviews: 38000, provider: 'Klook' },
            { name: '菲利普島神仙小企鵝歸巢巡禮一日遊', price: 1850, rating: 4.8, reviews: 29000, provider: 'KKday' }
          ],
          daily: [
            { day: 1, theme: '抵達南半球文化之都 · 雅拉河畔漫步與南岸夜景', desc: `飛抵墨爾本泰勒馬林機場 [MEL]，搭乘 SkyBus 直達市中心，傍晚漫步雅拉河南岸步道，欣賞摩登天際線與街頭藝術表演。` },
            { day: 2, theme: '世界咖啡之都 · 塗鴉巷、維多利亞州立圖書館與古老電車', desc: `穿梭霍西爾巷（Hosier Lane）欣賞世界級街頭塗鴉，搭乘免費 35 號復古環城電車，於百年圓頂閱讀室拍下絕美穹頂。` },
            { day: 3, theme: '世界絕美海岸線 · 大洋路十二使徒岩壯麗巡遊', desc: `專車駛上世界公認最美海岸公路大洋路，穿越溫帶雨林與洛克阿德大峽谷，在十二使徒岩前驚嘆大自然的鬼斧神工。` },
            { day: 4, theme: '野生動物萌友 · 丹頓農百年蒸汽火車與菲利普島企鵝歸巢', desc: `搭乘普芬比利蒸汽火車將雙腳伸出窗外穿過木棧橋，傍晚前往菲利普島坐在海灘看超萌神仙小企鵝搖搖晃晃歸巢入穴。` },
            { day: 5, theme: '酒香純淨谷地 · 亞拉河谷精品酒莊品酒與起司巡禮', desc: `造訪氣候宜人的亞拉河谷，於香檳名莊 Domaine Chandon 啜飲頂級氣泡酒，在陽光葡萄園下享用慢活西式田園午餐。` },
            { day: 6, theme: '生活美學市集 · 維多利亞女皇市場生蠔海鮮大餐', desc: `探索南半球最大露天市集「維多利亞女王市場」，現場大啖新鮮現開塔斯馬尼亞生蠔、熱吉拿棒與香醇 Flat White 澳白咖啡。` },
            { day: 7, theme: `澳式好物採購 · 墨爾本機場搭機${curOrigin.safeReturn}`, desc: `走訪布洛克拱廊百年老街，採購茱莉蔻天然精油、澳洲尤加利蜂蜜與綿羊油伴手禮，前往機場搭機${curOrigin.safeReturn}。` }
          ]
        }
      };

      // Intelligent Destination Preset Resolver (Zero-Mismatch Guarantee)
      function resolveDestination(destVal, destCustom) {
        let key = (destVal || '').trim();
        let custom = (destCustom || '').trim();

        // 1. Direct match in dictionary
        if (destCodeMap[key]) {
          return { key: key, preset: destCodeMap[key], customName: custom || destCodeMap[key].name };
        }

        // 2. Keyword alias matching against key and custom text
        const combined = (key + ' ' + custom).toLowerCase();
        const aliasList = [
          { match: ['hokkaido', 'japan_hokkaido', 'cts', '北海道', '札幌', '小樽', '富良野', '定山溪'], mapTo: 'japan_hokkaido' },
          { match: ['kansai', 'japan_kansai', 'kix', '京阪神', '大阪', '京都', '關西', '神戶', '奈良'], mapTo: 'japan_kansai' },
          { match: ['tokyo', 'nrt', 'hnd', '東京', '新宿', '澀谷', '成田', '羽田', '晴空塔'], mapTo: 'tokyo' },
          { match: ['danang', 'vietnam_danang', 'dad', '峴港', '越南', '會安', '美溪', '巴拿山'], mapTo: 'vietnam_danang' },
          { match: ['tainan', 'taiwan_tainan', 'tnn', '台南', '赤崁樓', '安平', '國華街', '奇美'], mapTo: 'taiwan_tainan' },
          { match: ['bangkok', 'bkk', '曼谷', '泰國', '芭達雅'], mapTo: 'bangkok' },
          { match: ['chiangmai', 'thailand_chiangmai', 'cnx', '清邁'], mapTo: 'thailand_chiangmai' },
          { match: ['singapore', 'sin', '新加坡', '樟宜', '聖淘沙'], mapTo: 'singapore' },
          { match: ['seoul', 'korea_seoul', 'icn', '首爾', '韓國', '弘大', '明洞'], mapTo: 'korea_seoul' },
          { match: ['paris', 'europe_paris', 'cdg', '巴黎', '法國', '羅浮宮', '艾菲爾'], mapTo: 'europe_paris' },
          { match: ['iceland', 'europe_iceland', 'reykjavik', 'kef', '冰島', '雷克雅維克', '藍湖', '極光'], mapTo: 'europe_iceland' },
          { match: ['zermatt', 'zurich', '瑞士_策馬特', 'zrh', '瑞士', '策馬特', '馬特洪峰'], mapTo: '瑞士_策馬特' },
          { match: ['melbourne', '澳洲_墨爾本', 'mel', '墨爾本', '澳洲', '大洋路'], mapTo: '澳洲_墨爾本' }
        ];

        for (const a of aliasList) {
          if (a.match.some(m => combined.includes(m.toLowerCase()))) {
            return { key: a.mapTo, preset: destCodeMap[a.mapTo], customName: custom || destCodeMap[a.mapTo].name };
          }
        }

        // 3. If user provided a custom location, create an authentic tailored custom preset!
        if (custom) {
          const dynName = custom;
          return {
            key: 'custom_dynamic',
            customName: dynName,
            preset: {
              name: dynName,
              code: 'INT',
              days: 5,
              cost: 38000,
              hours: 4.5,
              weather: { range: '18°C ~ 25°C', cond: '氣候宜人 · 適合探索', pack: '洋蔥式穿搭、好走的健行休閒鞋、遮陽保暖外套' },
              airline: `${curOrigin.shortName}出發特選優選航班`,
              flightNo: '特選國際航線直飛/聯運',
              priceLow: 13500, priceHigh: 19500,
              outbound: { flight_no: 'TRV101', dep: '08:30', arr: '12:30' },
              inbound: { flight_no: 'TRV102', dep: '14:30', arr: '18:30' },
              hotels: [
                { name: `${dynName} 市中心精緻設計酒店`, stars: 4, price: 3600, tag: '精華市中心 · 交通與美食生活圈', rating: 9.2, reviews: 1850 },
                { name: `${dynName} 景觀精品渡假旅店`, stars: 5, price: 4900, tag: '高評價服務 · 景觀客房含早餐', rating: 9.4, reviews: 1200 }
              ],
              activities: [
                { name: `${dynName} 經典地標景點通票與探索巡禮`, price: 1100, rating: 4.9, reviews: 15000, provider: 'Klook' },
                { name: `${dynName} 深度文化導覽與特色美食品味半日遊`, price: 850, rating: 4.8, reviews: 8900, provider: 'KKday' }
              ],
              daily: [
                { day: 1, theme: `抵達${dynName} · 市區初探與地道迎賓美饌`, desc: `搭機由${curOrigin.name}順利抵達${dynName}，下榻市中心精品酒店，漫步街區感受在地人文脈動，晚間享用道地風味料理。` },
                { day: 2, theme: `歷史與藝術精華 · ${dynName} 核心名勝探索`, desc: `走訪${dynName}最具代表性歷史古蹟與人文建築群，參觀經典美術館或地標景點，品味午後特色咖啡。` },
                { day: 3, theme: `在地慢活步調 · 傳統市集與城市自然綠意`, desc: `漫遊${dynName}人氣市集採購特色工藝品，午後於城市公園或運河湖濱漫步，享受放鬆無拘假期。` },
                { day: 4, theme: `特色體驗冒險 · 近郊私房美景探索一日遊`, desc: `參加精選近郊一日巡禮，走入壯麗自然山海風光，傍晚登上景觀制高點俯瞰璀璨城市天際線。` },
                { day: 5, theme: `伴手禮採買 · 帶著美好回憶${curOrigin.safeReturn}`, desc: `晨間選購當地特色手信與名產，整理行囊專車前往機場，搭乘班機${curOrigin.safeReturn}。` }
              ]
            }
          };
        }

        // 4. Fallback to Hokkaido if entirely unmatched
        return { key: 'japan_hokkaido', preset: destCodeMap['japan_hokkaido'], customName: destCodeMap['japan_hokkaido'].name };
      }

      const { key, preset, customName } = resolveDestination(payload.destination, payload.destination_custom);

      // Adapt flights and hours based on origin!
      let flightAirline = preset.airline;
      let flightNo = preset.flightNo;
      let flightHours = preset.hours;
      let priceLow = preset.priceLow;
      let priceHigh = preset.priceHigh;
      let outNo = preset.outbound.flight_no;
      let outDep = preset.outbound.dep;
      let outArr = preset.outbound.arr;
      let inNo = preset.inbound.flight_no;
      let inDep = preset.inbound.dep;
      let inArr = preset.inbound.arr;

      if (origCode === 'SIN') {
        if (preset.code === 'CTS') {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ660 / SQ661';
          flightHours = 7.0;
          priceLow = 21500; priceHigh = 31000;
          outNo = 'SQ660'; outDep = '23:00'; outArr = '07:10';
          inNo = 'SQ661'; inDep = '08:55'; inArr = '16:15';
        } else if (preset.code === 'KIX') {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ618 / SQ619';
          flightHours = 6.5;
          priceLow = 18500; priceHigh = 26000;
          outNo = 'SQ618'; outDep = '01:30'; outArr = '09:00';
          inNo = 'SQ619'; inDep = '11:00'; inArr = '17:00';
        } else if (preset.code === 'NRT') {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ638 / SQ637';
          flightHours = 7.0;
          priceLow = 19000; priceHigh = 27500;
          outNo = 'SQ638'; outDep = '00:05'; outArr = '08:00';
          inNo = 'SQ637'; inDep = '11:10'; inArr = '17:20';
        } else if (preset.code === 'DAD') {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ172 / SQ171';
          flightHours = 2.8;
          priceLow = 8500; priceHigh = 13000;
          outNo = 'SQ172'; outDep = '09:15'; outArr = '11:00';
          inNo = 'SQ171'; inDep = '11:55'; inArr = '15:50';
        } else if (preset.code === 'BKK') {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ706 / SQ707';
          flightHours = 2.4;
          priceLow = 6800; priceHigh = 11500;
          outNo = 'SQ706'; outDep = '07:15'; outArr = '08:45';
          inNo = 'SQ707'; inDep = '09:40'; inArr = '13:10';
        } else if (preset.code === 'CNX') {
          flightAirline = '酷航 (Scoot)';
          flightNo = 'TR674 / TR675';
          flightHours = 3.0;
          priceLow = 6200; priceHigh = 10200;
          outNo = 'TR674'; outDep = '08:30'; outArr = '10:30';
          inNo = 'TR675'; inDep = '11:15'; inArr = '15:15';
        } else if (preset.code === 'ICN') {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ600 / SQ601';
          flightHours = 6.3;
          priceLow = 17500; priceHigh = 25000;
          outNo = 'SQ600'; outDep = '08:05'; outArr = '15:35';
          inNo = 'SQ601'; inDep = '16:45'; inArr = '22:15';
        } else if (preset.code === 'CDG') {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ336 / SQ335';
          flightHours = 13.5;
          priceLow = 32000; priceHigh = 46000;
          outNo = 'SQ336'; outDep = '00:15'; outArr = '07:35';
          inNo = 'SQ335'; inDep = '12:00'; inArr = '06:50';
        } else if (preset.code === 'KEF') {
          flightAirline = '新加坡航空 + 冰島航空 (特選聯程)';
          flightNo = 'SQ308 / FI451';
          flightHours = 16.5;
          priceLow = 42000; priceHigh = 58000;
          outNo = 'SQ308'; outDep = '09:05'; outArr = '19:45';
          inNo = 'FI450'; inDep = '07:40'; inArr = '05:55';
        } else if (preset.code === 'ZRH') {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ346 / SQ345';
          flightHours = 12.8;
          priceLow = 33000; priceHigh = 48000;
          outNo = 'SQ346'; outDep = '01:30'; outArr = '08:15';
          inNo = 'SQ345'; inDep = '10:35'; inArr = '05:10';
        } else if (preset.code === 'MEL') {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ217 / SQ218';
          flightHours = 7.5;
          priceLow = 22000; priceHigh = 32000;
          outNo = 'SQ217'; outDep = '09:55'; outArr = '19:15';
          inNo = 'SQ218'; inDep = '01:05'; outArr = '06:00';
        } else if (preset.code === 'SIN') {
          flightAirline = '市區便捷接駁 / 地鐵 MRT';
          flightNo = '在地漫活免飛行';
          flightHours = 0.5;
          priceLow = 0; priceHigh = 0;
          outNo = 'MRT-EW'; outDep = '09:00'; outArr = '09:30';
          inNo = 'MRT-DT'; inDep = '18:00'; inArr = '18:30';
        } else {
          flightAirline = '新加坡航空 (Singapore Airlines)';
          flightNo = 'SQ 系列國際直飛/特選航班';
          flightHours = 5.5;
          priceLow = 17500; priceHigh = 25000;
          outNo = 'SQ802'; outDep = '08:30'; outArr = '14:30';
          inNo = 'SQ801'; inDep = '16:00'; inArr = '22:00';
        }
      } else if (origCode === 'HKG') {
        if (preset.code === 'CTS') {
          flightAirline = '國泰航空 (Cathay Pacific)';
          flightNo = 'CX580 / CX581';
          flightHours = 4.8;
          priceLow = 16500; priceHigh = 24500;
          outNo = 'CX580'; outDep = '09:15'; outArr = '15:10';
          inNo = 'CX581'; inDep = '16:20'; inArr = '21:00';
        } else if (preset.code === 'KIX') {
          flightAirline = '國泰航空 (Cathay Pacific)';
          flightNo = 'CX566 / CX567';
          flightHours = 3.5;
          priceLow = 12000; priceHigh = 18000;
          outNo = 'CX566'; outDep = '01:50'; outArr = '06:30';
          inNo = 'CX567'; inDep = '09:30'; inArr = '12:55';
        } else if (preset.code === 'NRT') {
          flightAirline = '國泰航空 (Cathay Pacific)';
          flightNo = 'CX504 / CX505';
          flightHours = 4.2;
          priceLow = 13500; priceHigh = 19500;
          outNo = 'CX504'; outDep = '09:05'; outArr = '14:30';
          inNo = 'CX505'; inDep = '18:00'; inArr = '22:15';
        } else if (preset.code === 'DAD') {
          flightAirline = '香港快運 (HK Express)';
          flightNo = 'UO558 / UO559';
          flightHours = 2.0;
          priceLow = 6500; priceHigh = 10500;
          outNo = 'UO558'; outDep = '16:25'; outArr = '17:25';
          inNo = 'UO559'; inDep = '18:10'; inArr = '21:05';
        } else if (preset.code === 'BKK') {
          flightAirline = '國泰航空 (Cathay Pacific)';
          flightNo = 'CX705 / CX704';
          flightHours = 2.8;
          priceLow = 7500; priceHigh = 12500;
          outNo = 'CX705'; outDep = '08:00'; outArr = '10:00';
          inNo = 'CX704'; inDep = '11:15'; outArr = '15:15';
        } else if (preset.code === 'CNX') {
          flightAirline = '香港快運 (HK Express)';
          flightNo = 'UO753 / UO754';
          flightHours = 3.0;
          priceLow = 6500; priceHigh = 10500;
          outNo = 'UO753'; outDep = '08:15'; outArr = '10:15';
          inNo = 'UO754'; inDep = '11:00'; inArr = '14:50';
        } else if (preset.code === 'ICN') {
          flightAirline = '國泰航空 (Cathay Pacific)';
          flightNo = 'CX410 / CX411';
          flightHours = 3.7;
          priceLow = 10500; priceHigh = 15500;
          outNo = 'CX410'; outDep = '09:20'; outArr = '14:10';
          inNo = 'CX411'; inDep = '15:20'; inArr = '18:05';
        } else if (preset.code === 'CDG') {
          flightAirline = '國泰航空 (Cathay Pacific)';
          flightNo = 'CX261 / CX260';
          flightHours = 13.0;
          priceLow = 31000; priceHigh = 44000;
          outNo = 'CX261'; outDep = '23:55'; outArr = '06:50';
          inNo = 'CX260'; inDep = '13:10'; inArr = '06:55';
        } else if (preset.code === 'ZRH') {
          flightAirline = '瑞士國際航空 (SWISS)';
          flightNo = 'LX139 / LX138';
          flightHours = 12.5;
          priceLow = 32000; priceHigh = 45000;
          outNo = 'LX139'; outDep = '23:15'; outArr = '06:10';
          inNo = 'LX138'; inDep = '13:30'; inArr = '07:55';
        } else if (preset.code === 'MEL') {
          flightAirline = '國泰航空 (Cathay Pacific)';
          flightNo = 'CX105 / CX104';
          flightHours = 9.0;
          priceLow = 23000; priceHigh = 33000;
          outNo = 'CX105'; outDep = '00:05'; outArr = '12:20';
          inNo = 'CX104'; inDep = '14:20'; inArr = '21:05';
        }
      } else if (origCode === 'KHH') {
        if (preset.code === 'CTS') {
          flightAirline = '長榮航空 / 華航 (經桃機聯程)';
          flightNo = 'BR116 / BR115 聯運';
          flightHours = 5.2;
          priceLow = 17500; priceHigh = 24000;
          outNo = 'BR116'; outDep = '06:30'; outArr = '14:05';
          inNo = 'BR115'; inDep = '15:20'; inArr = '21:40';
        } else if (preset.code === 'KIX') {
          flightAirline = '中華航空 (China Airlines)';
          flightNo = 'CI166 / CI167';
          flightHours = 2.8;
          priceLow = 13500; priceHigh = 19000;
          outNo = 'CI166'; outDep = '07:30'; outArr = '11:15';
          inNo = 'CI167'; inDep = '12:15'; inArr = '14:45';
        } else if (preset.code === 'NRT') {
          flightAirline = '長榮航空 (EVA Air)';
          flightNo = 'BR108 / BR107';
          flightHours = 3.5;
          priceLow = 14500; priceHigh = 20500;
          outNo = 'BR108'; outDep = '07:00'; outArr = '11:45';
          inNo = 'BR107'; inDep = '12:45'; inArr = '15:40';
        } else if (preset.code === 'DAD') {
          flightAirline = '台灣虎航 (Tigerair Taiwan)';
          flightNo = 'IT321 / IT322';
          flightHours = 2.8;
          priceLow = 9800; priceHigh = 14000;
          outNo = 'IT321'; outDep = '06:45'; outArr = '08:35';
          inNo = 'IT322'; inDep = '09:30'; inArr = '13:10';
        } else if (preset.code === 'BKK') {
          flightAirline = '中華航空 (China Airlines)';
          flightNo = 'CI839 / CI840';
          flightHours = 3.7;
          priceLow = 11000; priceHigh = 16000;
          outNo = 'CI839'; outDep = '14:45'; outArr = '17:35';
          inNo = 'CI840'; inDep = '18:35'; inArr = '23:05';
        } else if (preset.code === 'ICN') {
          flightAirline = '德威航空 / 華航';
          flightNo = 'TW672 / TW671';
          flightHours = 2.8;
          priceLow = 10000; priceHigh = 15000;
          outNo = 'TW672'; outDep = '16:05'; outArr = '19:50';
          inNo = 'TW671'; inDep = '13:05'; inArr = '15:05';
        }
      } else if (origCode === 'RMQ') {
        if (preset.code === 'CTS') {
          flightAirline = '星宇航空 (經高鐵特快接駁)';
          flightNo = 'JX 特快聯運直飛';
          flightHours = 4.8;
          priceLow = 17500; priceHigh = 23500;
          outNo = 'JX800'; outDep = '07:00'; outArr = '14:05';
          inNo = 'JX801'; inDep = '15:20'; inArr = '21:15';
        } else if (preset.code === 'DAD') {
          flightAirline = '星宇航空 (STARLUX Airlines)';
          flightNo = 'JX331 / JX332';
          flightHours = 2.7;
          priceLow = 10500; priceHigh = 15000;
          outNo = 'JX331'; outDep = '07:45'; outArr = '09:30';
          inNo = 'JX332'; inDep = '10:30'; inArr = '14:15';
        } else if (preset.code === 'NRT') {
          flightAirline = '星宇航空 (STARLUX Airlines)';
          flightNo = 'JX300 / JX301';
          flightHours = 3.3;
          priceLow = 14500; priceHigh = 20000;
          outNo = 'JX300'; outDep = '08:30'; outArr = '12:45';
          inNo = 'JX301'; inDep = '14:00'; inArr = '16:45';
        } else if (preset.code === 'KIX') {
          flightAirline = '台灣虎航 (Tigerair Taiwan)';
          flightNo = 'IT360 / IT361';
          flightHours = 2.8;
          priceLow = 12500; priceHigh = 17500;
          outNo = 'IT360'; outDep = '09:00'; outArr = '12:45';
          inNo = 'IT361'; inDep = '13:45'; inArr = '15:55';
        }
      }'''

def update_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Locate the start: '      const destCodeMap = {'
    start_str = '      const destCodeMap = {'
    if start_str not in content:
        print(f"Error: Could not find start in {file_path}")
        return False

    start_idx = content.find(start_str)

    # Locate the end: where origin checks end, right before '      const userPref = getUserPreferenceLabels(payload);'
    end_str = '      const userPref = getUserPreferenceLabels(payload);'
    if end_str not in content:
        print(f"Error: Could not find end in {file_path}")
        return False

    end_idx = content.find(end_str)

    # Replace the section
    new_content = content[:start_idx] + NEW_CODE + '\n\n' + content[end_idx:]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Successfully updated {file_path}!")
    return True

if __name__ == '__main__':
    p1 = 'd:/st8925lab/Travel-Assistance/index.html'
    p2 = 'd:/st8925lab/Travel-Assistance/prototype.html'
    update_file(p1)
    update_file(p2)
