// ===============================================================
//  MAIN ENTRYPOINT — ST8925 LAB PROJECT 04 (SECURE MESSENGER)
//  Minimal Orchestrator per AGENTS.md & PROMPT.md V1.1
// ===============================================================

import { CryptoEngine } from './crypto-engine.js';
import { TransportAdapter } from './transport-adapter.js';
import { FileHandler } from './file-handler.js';
import { AiBotClient } from './ai-bot-client.js';
import { TelemetryBridge } from './telemetry-bridge.js';
import { UiController } from './ui-controller.js';

const MY_ID = '04';

function applyOrbitThemeAndWordmark() {
    if (typeof PROJECTS !== 'undefined' && typeof RAINBOW !== 'undefined') {
        const idx = PROJECTS.findIndex(p => p.id === MY_ID);
        const proj = PROJECTS[idx] || { label: 'SECURE MESSENGER & CHATOPS' };
        const hue = new URLSearchParams(window.location.search).get('hue');
        const col = RAINBOW.find(c => c.name === hue) || RAINBOW[idx % RAINBOW.length];

        document.documentElement.style.setProperty('--c', col.hex);
        document.title = `${ typeof SITE_NAME !== 'undefined' ? SITE_NAME : 'ST8925 LAB' } — ${proj.label}`;

        const badgeEl = document.getElementById('project-title-badge');
        if (badgeEl) badgeEl.textContent = proj.label;
    }

    const wmEl = document.getElementById('wordmark');
    if (typeof initWordmark === 'function' && wmEl && !wmEl.children.length) {
        initWordmark('wordmark', typeof SITE_NAME !== 'undefined' ? SITE_NAME : 'ST8925 LAB');
    }
}

async function bootstrapMessenger() {
    applyOrbitThemeAndWordmark();

    const crypto = new CryptoEngine();
    const fileHandler = new FileHandler(crypto);

    let ui = null;
    const transport = new TransportAdapter({
        apiBase: '/api',
        onMessage: (msg) => {
            if (ui) ui.ingestIncomingMessage(msg);
        },
        onStatusChange: (status) => {
            const gwEl = document.getElementById('inspector-gw-status');
            const nimEl = document.getElementById('inspector-nim-status');
            const tgEl = document.getElementById('inspector-tg-status');
            if (gwEl) {
                gwEl.textContent = status.online ? `ONLINE (${status.mode})` : 'BROWSER P2P (BroadcastChannel)';
                gwEl.className = status.online ? 'status-val ok' : 'status-val warn';
            }
            if (nimEl) {
                nimEl.textContent = status.nimConfigured ? 'ACTIVE (NVIDIA NIM)' : 'STANDBY (Local Rule Engine)';
            }
            if (tgEl) {
                tgEl.textContent = status.telegramConfigured ? 'CONNECTED (Telegram Bot)' : 'SIMULATED (Local Audit Log)';
            }
        }
    });

    const telemetry = new TelemetryBridge({ apiBase: '/api', transport });
    const aiBot = new AiBotClient({ apiBase: '/api', telemetryBridge: telemetry });

    ui = new UiController({
        crypto,
        transport,
        fileHandler,
        aiBot,
        telemetry
    });

    ui.init();
    await transport.init();
}

window.addEventListener('DOMContentLoaded', bootstrapMessenger);
