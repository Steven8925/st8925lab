// ===============================================================
//  WIDGET EMBED — Floating Secure Messenger Capsule for st8925lab.com
//  Drop-in <script src="/secure-messenger-chatops/js/widget-embed.js"></script>
//  Non-intrusive: preserves 60fps Orbit Canvas & pointer events
// ===============================================================

(function initSt8925FloatingWidget() {
    if (document.getElementById('st8925-widget-root')) return;

    const style = document.createElement('style');
    style.textContent = `
        #st8925-widget-root {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 9999;
            font-family: "JetBrains Mono", "SF Mono", Consolas, "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif;
            color: #eef3fb;
        }
        #st8925-widget-launcher {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 13px 20px;
            border-radius: 999px;
            background: rgba(8, 15, 30, 0.9);
            border: 1px solid rgba(167, 139, 250, 0.6);
            box-shadow: 0 0 24px rgba(167, 139, 250, 0.3);
            color: #eef3fb;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.05em;
            cursor: pointer;
            backdrop-filter: blur(14px);
            transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        #st8925-widget-launcher:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 30px rgba(167, 139, 250, 0.5);
        }
        #st8925-widget-launcher .pulse-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #69db7c;
            box-shadow: 0 0 10px #69db7c;
        }
        #st8925-widget-drawer {
            display: none;
            flex-direction: column;
            width: min(420px, calc(100vw - 32px));
            height: 550px;
            margin-bottom: 14px;
            background: rgba(6, 11, 22, 0.95);
            border: 1px solid rgba(167, 139, 250, 0.45);
            border-radius: 14px;
            box-shadow: 0 18px 48px rgba(0, 0, 0, 0.78);
            backdrop-filter: blur(18px);
            overflow: hidden;
        }
        #st8925-widget-drawer.open { display: flex; }
        .stw-head {
            padding: 14px 16px;
            background: rgba(15, 23, 42, 0.88);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .stw-title { font-size: 15px; font-weight: 700; color: #a78bfa; letter-spacing: 0.05em; }
        .stw-sub { font-size: 13px; color: #9fb0c9; margin-top: 3px; }
        .stw-body {
            flex: 1;
            padding: 14px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 11px;
            font-size: 15px;
        }
        .stw-msg {
            padding: 11px 14px;
            border-radius: 10px;
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.09);
            line-height: 1.55;
        }
        .stw-msg.bot { border-left: 4px solid #69db7c; }
        .stw-msg.user { border-left: 4px solid #4dabf7; align-self: flex-end; background: rgba(29, 78, 216, 0.25); }
        .stw-foot {
            padding: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            gap: 8px;
        }
        .stw-input {
            flex: 1;
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #eef3fb;
            padding: 9px 12px;
            font-family: inherit;
            font-size: 15px;
            outline: none;
        }
        .stw-btn {
            background: #a78bfa;
            color: #04070e;
            border: none;
            border-radius: 8px;
            padding: 9px 16px;
            font-family: inherit;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
        }
        .stw-actions {
            display: flex;
            justify-content: space-between;
            padding: 9px 14px;
            background: rgba(15, 23, 42, 0.65);
            border-top: 1px solid rgba(255, 255, 255, 0.07);
            font-size: 13px;
        }
        .stw-actions a, .stw-actions button {
            color: #69db7c;
            background: none;
            border: none;
            text-decoration: none;
            cursor: pointer;
            font-family: inherit;
            font-size: 13px;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);

    const p04Slug = (window.PROJECTS && window.PROJECTS.find(p => p.id === '04')?.slug) || 'project-04';
    const root = document.createElement('div');
    root.id = 'st8925-widget-root';
    root.innerHTML = `
        <div id="st8925-widget-drawer">
            <div class="stw-head">
                <div>
                    <div class="stw-title">🔒 ST8925 SECURE CONCIERGE</div>
                    <div class="stw-sub">AI 駐站顧問 & Telegram 即時轉接山姆哥</div>
                </div>
                <button id="stw-close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:15px;">✕</button>
            </div>
            <div class="stw-body" id="stw-msg-list">
                <div class="stw-msg bot">
                    <strong>MARU AI：</strong>您好！這裡是 ST8925 LAB 快速通訊艙。可直接提問、輸入 <code>/status</code>，或點擊下方呼叫山姆哥。
                </div>
            </div>
            <div class="stw-actions">
                <button id="stw-call-sam">📲 呼叫山姆哥 (Telegram)</button>
                <a href="./${p04Slug}/index.html?hue=indigo">↗ 開啟 P04 全螢幕加密艙</a>
            </div>
            <form class="stw-foot" id="stw-form">
                <input class="stw-input" id="stw-input" placeholder="輸入訊息或 /diag..." autocomplete="off" />
                <button class="stw-btn" type="submit">SEND</button>
            </form>
        </div>
        <button id="st8925-widget-launcher">
            <span class="pulse-dot"></span>
            <span>SECURE CHAT · P04</span>
        </button>
    `;
    document.body.appendChild(root);

    const drawer = document.getElementById('st8925-widget-drawer');
    const launcher = document.getElementById('st8925-widget-launcher');
    const closeBtn = document.getElementById('stw-close');
    const form = document.getElementById('stw-form');
    const input = document.getElementById('stw-input');
    const list = document.getElementById('stw-msg-list');
    const callSam = document.getElementById('stw-call-sam');
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel('st8925_secure_messenger_v1') : null;

    launcher.onclick = () => drawer.classList.toggle('open');
    closeBtn.onclick = () => drawer.classList.remove('open');

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function appendBubble(sender, text, role) {
        const div = document.createElement('div');
        div.className = `stw-msg ${role === 'user' ? 'user' : 'bot'}`;
        div.innerHTML = `<strong>${escapeHtml(sender)}：</strong>${escapeHtml(text)}`;
        list.appendChild(div);
        list.scrollTop = list.scrollHeight;
    }

    if (bc) {
        bc.onmessage = (e) => {
            if (e.data && e.data.type === 'NEW_MESSAGE' && e.data.payload.channel === 'A') {
                const m = e.data.payload;
                appendBubble(m.sender, m.text || '[Attachment]', m.role);
            }
        };
    }

    callSam.onclick = async () => {
        appendBubble('SYSTEM', '📲 正在透過 Telegram Bot 推播通知山姆哥...', 'bot');
        let delivered = false;
        try {
            const res = await fetch('/api/telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'FLOATING_WIDGET_CHANNEL_A',
                    severity: 'HIGH',
                    message: '網站訪客透過右下角浮動通訊艙請求真人連線！'
                })
            });
            delivered = res.ok && Boolean((await res.json()).delivered);
        } catch (_) {
            delivered = false;
        }
        appendBubble('SYSTEM', delivered ? '✅ 已通知山姆哥。' : '⚠️ 目前離線，通知未送出。', 'bot');
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = '';

        const userMsg = {
            id: `w_${Date.now()}`,
            channel: 'A',
            sender: 'WEB_VISITOR',
            role: 'user',
            timestamp: Date.now(),
            text
        };
        appendBubble('YOU', text, 'user');
        if (bc) bc.postMessage({ type: 'NEW_MESSAGE', payload: userMsg });

        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userMsg)
            });
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text, channel: 'A', history: [] })
            });
            const data = await res.json();
            const botMsg = {
                id: `wb_${Date.now()}`,
                channel: 'A',
                sender: 'MARU AI',
                role: 'bot',
                timestamp: Date.now(),
                text: data.reply
            };
            appendBubble('MARU AI', data.reply, 'bot');
            if (bc) bc.postMessage({ type: 'NEW_MESSAGE', payload: botMsg });
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(botMsg)
            });
        } catch (_) {
            appendBubble('MARU AI', '已收到您的諮詢！您也可點選上方開啟 P04 全螢幕安全通訊中控台。', 'bot');
        }
    };
})();
