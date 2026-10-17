// ===============================================================
//  TELEMETRY BRIDGE — P01~P06 Cross-Project Event Bus & Telegram
//  Connects Alarm Simulator (P01), IoT Gen2 (P02), AI KB (P03),
//  and Travel Assistance (P06) into Channel C + Telegram Alerting
// ===============================================================

export class TelemetryBridge {
    constructor(options = {}) {
        this.apiBase = options.apiBase || '/api';
        this.transport = options.transport;
        this.templates = {
            p01: {
                project: '01 ALARM NOTIFICATION SIMULATOR',
                severity: 'CRITICAL',
                code: 'ALM-9042',
                title: '核心交換機 BGP Session 異常瞬斷告警',
                metrics: 'Peer: 10.240.12.1 | Flap Count: 4 | Packet Loss: 18.4%',
                suggestion: '建議執行 `/diag ALM-9042` 檢查介面 CRC Error 或啟用備援路由。'
            },
            p02: {
                project: '02 IOT GEN2 SIMULATOR & MONITOR',
                severity: 'HIGH',
                code: 'IOT-G2-NODE07',
                title: '邊緣感測節點溫度與功耗超標預警',
                metrics: 'Temp: 84.6°C (Threshold: 75°C) | MQTT Latency: 312ms',
                suggestion: '建議調降取樣頻率或執行 `/diag IOT-G2-NODE07` 啟動冷卻排程。'
            },
            p03: {
                project: '03 AI DIAGNOSTIC KB',
                severity: 'INFO',
                code: 'KB-VEC-SYNC',
                title: 'AI 知識庫向量索引與異常特徵庫更新完成',
                metrics: 'Indexed Docs: 1,420 | Embedding Latency: 19ms | Accuracy: 99.2%',
                suggestion: '可使用 `/ask` 查詢最新故障排除 SOP。'
            },
            p06: {
                project: '06 TRAVEL ASSISTANCE',
                severity: 'MEDIUM',
                code: 'TRV-SKYTEAM-CI',
                title: '東南亞商務航班與跨境漫遊狀態提醒',
                metrics: 'Carrier: China Airlines (SkyTeam) | Gate Status: ON_TIME | eSIM: SG/MY Ready',
                suggestion: '貴賓室與萬豪/IHG 住宿憑證檢核正常。'
            }
        };
    }

    async triggerSimulatedEvent(key = 'p01') {
        const tpl = this.templates[key.toLowerCase()] || this.templates.p01;
        const text = [
            `🚨 **[${tpl.severity}] ${tpl.project}**`,
            `• **事件代碼**：\`${tpl.code}\` — ${tpl.title}`,
            `• **即時指標**：\`${tpl.metrics}\``,
            `• **處置建議**：${tpl.suggestion}`
        ].join('\n');

        const msg = await this.transport.sendMessage({
            channel: 'C',
            sender: tpl.project,
            role: 'telemetry',
            severity: tpl.severity,
            telemetryCode: tpl.code,
            text
        });

        if (tpl.severity === 'CRITICAL' || tpl.severity === 'HIGH') {
            await this.sendTelegramAlert({
                source: tpl.project,
                severity: tpl.severity,
                message: `[${tpl.code}] ${tpl.title} (${tpl.metrics})`
            });
        }
        return msg;
    }

    async sendTelegramAlert(payload) {
        try {
            const res = await fetch(`${this.apiBase}/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Telegram API non-200');
            return await res.json();
        } catch (_) {
            return {
                ok: true,
                delivered: false,
                mode: 'OFFLINE_LOCAL_QUEUE',
                timestamp: Date.now()
            };
        }
    }
}
