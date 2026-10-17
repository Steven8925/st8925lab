// ===============================================================
//  TRANSPORT ADAPTER — Pluggable Real-Time Sync Layer
//  Supports:
//    1. Gateway REST + Polling Sync (dev-gateway.py / Cloudflare Functions)
//    2. Browser BroadcastChannel + LocalStorage (Zero-latency cross-tab)
// ===============================================================

export class TransportAdapter {
    constructor(options = {}) {
        this.apiBase = options.apiBase || '/api';
        this.onMessage = options.onMessage || (() => {});
        this.onStatusChange = options.onStatusChange || (() => {});
        this.seenIds = new Set();
        this.lastTimestamp = 0;
        this.gatewayOnline = false;
        this.gatewayConfig = {
            nimConfigured: false,
            telegramConfigured: false,
            supabaseConfigured: false,
            mode: 'LOCAL_STANDALONE'
        };
        this.broadcast = null;
        this.pollTimer = null;
    }

    async init() {
        this._initBroadcastChannel();
        await this.checkGatewayStatus();
        await this.fetchHistory();
        this.pollTimer = setInterval(() => this._pollNewMessages(), 1800);
    }

    _initBroadcastChannel() {
        if ('BroadcastChannel' in window) {
            this.broadcast = new BroadcastChannel('st8925_secure_messenger_v1');
            this.broadcast.onmessage = (event) => {
                if (event.data && event.data.type === 'NEW_MESSAGE') {
                    this._ingestMessage(event.data.payload);
                }
            };
        }
        window.addEventListener('storage', (e) => {
            if (e.key === 'st8925_last_broadcast_msg' && e.newValue) {
                try {
                    const msg = JSON.parse(e.newValue);
                    this._ingestMessage(msg);
                } catch (_) {
                    // ignore malformed storage event
                }
            }
        });
    }

    async checkGatewayStatus() {
        try {
            const res = await fetch(`${this.apiBase}/status`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Gateway non-200');
            const data = await res.json();
            this.gatewayOnline = true;
            this.gatewayConfig = data;
            this.onStatusChange({ online: true, ...data });
            return data;
        } catch (_) {
            this.gatewayOnline = false;
            this.onStatusChange({
                online: false,
                mode: 'BROWSER_P2P_BROADCAST',
                nimConfigured: false,
                telegramConfigured: false
            });
            return null;
        }
    }

    async fetchHistory() {
        if (!this.gatewayOnline) {
            this._loadLocalBackup();
            return;
        }
        try {
            const res = await fetch(`${this.apiBase}/messages?since=0`, { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data.messages)) {
                data.messages.forEach(m => this._ingestMessage(m));
            }
        } catch (_) {
            this._loadLocalBackup();
        }
    }

    async _pollNewMessages() {
        if (!this.gatewayOnline) return;
        try {
            const res = await fetch(
                `${this.apiBase}/messages?since=${this.lastTimestamp}`,
                { cache: 'no-store' }
            );
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data.messages)) {
                data.messages.forEach(m => this._ingestMessage(m));
            }
        } catch (_) {
            // silent retry on next tick
        }
    }

    async sendMessage(msgEnvelope) {
        const message = {
            id: msgEnvelope.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: msgEnvelope.timestamp || Date.now(),
            ...msgEnvelope
        };

        this._ingestMessage(message);
        this._saveLocalBackup(message);

        if (this.broadcast) {
            this.broadcast.postMessage({ type: 'NEW_MESSAGE', payload: message });
        }
        try {
            localStorage.setItem('st8925_last_broadcast_msg', JSON.stringify(message));
        } catch (_) {
            // quota exceeded fallback
        }

        if (this.gatewayOnline) {
            try {
                await fetch(`${this.apiBase}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(message)
                });
            } catch (_) {
                // preserved in local backup & broadcast
            }
        }
        return message;
    }

    _ingestMessage(msg) {
        if (!msg || !msg.id || this.seenIds.has(msg.id)) return;
        this.seenIds.add(msg.id);
        if (msg.timestamp && msg.timestamp > this.lastTimestamp) {
            this.lastTimestamp = msg.timestamp;
        }
        this.onMessage(msg);
    }

    _saveLocalBackup(msg) {
        try {
            const raw = localStorage.getItem('st8925_msg_history_v1');
            const list = raw ? JSON.parse(raw) : [];
            list.push(msg);
            if (list.length > 80) list.splice(0, list.length - 80);
            localStorage.setItem('st8925_msg_history_v1', JSON.stringify(list));
        } catch (_) {
            // ignore storage limit
        }
    }

    _loadLocalBackup() {
        try {
            const raw = localStorage.getItem('st8925_msg_history_v1');
            if (!raw) return;
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
                list.forEach(m => this._ingestMessage(m));
            }
        } catch (_) {
            // ignore corrupt backup
        }
    }
}
