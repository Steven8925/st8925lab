// ===============================================================
//  AI BOT CLIENT — NVIDIA NIM Dual-Model Router & Slash Commands
//  Text Route  : nvidia/nemotron-3-super-120b-a12b
//  Vision Route: nvidia/nemotron-3.5-super-vl-120b-a12b
// ===============================================================

export class AiBotClient {
    constructor(options = {}) {
        this.apiBase = options.apiBase || '/api';
        this.telemetryBridge = options.telemetryBridge || null;
    }

    isSlashCommand(text) {
        return typeof text === 'string' && text.trim().startsWith('/');
    }

    async processInput(text, channel, contextMessages = [], attachment = null) {
        const trimmed = (text || '').trim();
        const imageDataUrl = (attachment && !attachment.e2ee && attachment.isImage && attachment.dataUrl)
            ? attachment.dataUrl
            : '';

        if (this.isSlashCommand(trimmed)) {
            return await this._handleSlashCommand(trimmed, channel, contextMessages, imageDataUrl);
        }
        if (channel === 'A' || imageDataUrl) {
            return await this.askAi(trimmed, channel, contextMessages, imageDataUrl);
        }
        return null;
    }

    async _handleSlashCommand(rawCmd, channel, contextMessages, imageDataUrl = '') {
        const parts = rawCmd.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const argText = parts.slice(1).join(' ');

        if (cmd === '/help') {
            return {
                sender: 'ST-AI BOT [SYSTEM]',
                role: 'bot',
                text: [
                    '📌 **ST8925 LAB ChatOps 指令與雙模型路由清單**：',
                    '• `/status` — 檢視 P01~P06 子系統、雙模型路由與加密連線狀態',
                    '• `/diag <target>` — 呼叫 AI 針對指定設備或附圖進行根因分析 (如 `/diag P02-NODE-07`)',
                    '• `/ask <prompt>` — 直接向駐站 NVIDIA NIM 雙模型顧問提問（附圖自動切換 VL 視覺模型）',
                    '• `/notify <message>` — 透過 Telegram Bridge 發送隨身緊急通知給山姆哥',
                    '• `/sim <p01|p02|p03|p06>` — 觸發跨專案模擬告警卡片注入測試'
                ].join('\n')
            };
        }

        if (cmd === '/status') {
            return await this._buildStatusReport();
        }

        if (cmd === '/notify') {
            if (!argText) {
                return {
                    sender: 'TELEGRAM BRIDGE',
                    role: 'system',
                    text: '⚠️ 請輸入要推播給山姆哥的訊息內容，例如：`/notify 訪客請求架構諮詢`'
                };
            }
            const tgRes = await this.telemetryBridge.sendTelegramAlert({
                source: `CHANNEL_${channel}_CHATOPS`,
                severity: 'HIGH',
                message: argText
            });
            return {
                sender: 'TELEGRAM BRIDGE',
                role: 'bot',
                text: tgRes.delivered
                    ? `✅ 已透過 Telegram Bot API 即時推播至山姆哥手機！\n• 狀態：\`${tgRes.mode}\`\n• 內容：${argText}`
                    : `📋 已記錄至本地安全推播佇列（模式：\`${tgRes.mode}\`）：\n• 內容：${argText}`
            };
        }

        if (cmd === '/sim') {
            const target = (argText || 'p01').toLowerCase();
            if (this.telemetryBridge) {
                await this.telemetryBridge.triggerSimulatedEvent(target);
                return null;
            }
        }

        if (cmd === '/diag') {
            const target = argText || 'ALL_ACTIVE_NODES';
            return await this.askAi(
                `請針對 ST8925 LAB 目標 [${target}] 執行資安與連線根因診斷 (Root Cause Analysis)，列出潛在異常、指標判讀與 3 點修復建議。`,
                channel,
                contextMessages,
                imageDataUrl
            );
        }

        if (cmd === '/ask') {
            return await this.askAi(
                argText || '請介紹 ST8925 LAB 的核心專案架構',
                channel,
                contextMessages,
                imageDataUrl
            );
        }

        return {
            sender: 'ST-AI BOT',
            role: 'system',
            text: `未知指令 \`${cmd}\`。輸入 \`/help\` 查看支援的 ChatOps 指令。`
        };
    }

    async _buildStatusReport() {
        try {
            const res = await fetch(`${this.apiBase}/status`, { cache: 'no-store' });
            const st = await res.json();
            return {
                sender: 'ST8925 TELEMETRY CORE',
                role: 'bot',
                text: [
                    '🟢 **ST8925 LAB 安全通訊與雙模型路由狀態報告**',
                    `• Gateway 狀態：\`ONLINE (${st.mode})\``,
                    `• 端對端加密引擎：\`Web Crypto API (PBKDF2 + AES-256-GCM 96-bit IV)\``,
                    `• 純文字主力路由：\`${st.nimTextModel || 'nvidia/nemotron-3-super-120b-a12b'}\``,
                    `• 多模態視覺路由：\`${st.nimVisionModel || 'nvidia/nemotron-3.5-super-vl-120b-a12b'}\``,
                    `• NIM 金鑰狀態：\`${st.nimConfigured ? 'ACTIVE (NVIDIA Cloud)' : 'LOCAL_RULE_ENGINE (未設定 .env 金鑰自動降級)'}\``,
                    `• Telegram 隨身推播：\`${st.telegramConfigured ? 'CONNECTED' : 'LOCAL_AUDIT_SIM (未設定 .env Token 自動降級)'}\``
                ].join('\n')
            };
        } catch (_) {
            return {
                sender: 'ST8925 TELEMETRY CORE',
                role: 'bot',
                text: '🟡 **Gateway 處於純瀏覽器離線 P2P 模式 (BroadcastChannel)**\n• 本地端 Web Crypto `AES-256-GCM` 加解密功能 100% 正常運作。'
            };
        }
    }

    async askAi(prompt, channel, contextMessages = [], imageDataUrl = '') {
        try {
            const res = await fetch(`${this.apiBase}/ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    channel,
                    imageDataUrl,
                    history: contextMessages.slice(-6).map(m => ({
                        sender: m.sender,
                        text: m.text || '[Encrypted/Attachment]'
                    }))
                })
            });
            if (!res.ok) throw new Error('AI endpoint error');
            const data = await res.json();
            return {
                sender: `MARU AI [${data.model || 'NIM'}]`,
                role: 'bot',
                text: data.reply
            };
        } catch (_) {
            return {
                sender: 'MARU AI [OFFLINE FALLBACK]',
                role: 'bot',
                text: this._localFallbackReply(prompt, channel, Boolean(imageDataUrl))
            };
        }
    }

    _localFallbackReply(prompt, channel, hasImage = false) {
        if (hasImage) {
            return '👁️ **多模態視覺診斷路由 (`nvidia/nemotron-3.5-super-vl-120b-a12b`)**：已接收您上傳的圖片！連線至 Gateway 後將自動啟動視覺理解分析。';
        }
        return `🤖 **ST8925 駐站 AI 顧問回覆**（頻道 ${channel}）：\n已收到您的訊息：「${prompt}」。\n• 如需進行設備診斷請輸入 \`/diag <設備代碼>\`\n• 如需緊急聯繫山姆哥請輸入 \`/notify <訊息>\``;
    }
}
