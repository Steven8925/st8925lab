// ===============================================================
//  UI CONTROLLER — 3-Channel Views, E2EE Vault Bar & File Rendering
// ===============================================================

export class UiController {
    constructor(deps) {
        this.crypto = deps.crypto;
        this.transport = deps.transport;
        this.fileHandler = deps.fileHandler;
        this.aiBot = deps.aiBot;
        this.telemetry = deps.telemetry;

        this.currentChannel = 'A';
        this.userName = 'SAM_ARCHITECT';
        this.messages = { A: [], B: [], C: [] };
        this.pendingFile = null;
    }

    init() {
        this._bindFontScaleControls();
        this._bindChannelTabs();
        this._bindComposer();
        this._bindVaultControls();
        this._bindTelemetryControls();
        this._seedWelcomeMessages();
        this.switchChannel('A');
    }

    _bindFontScaleControls() {
        const decBtn = document.getElementById('btn-font-dec');
        const rstBtn = document.getElementById('btn-font-reset');
        const incBtn = document.getElementById('btn-font-inc');
        let scale = parseFloat(localStorage.getItem('st8925_font_scale') || '1') || 1;
        const applyScale = (next) => {
            scale = Math.min(1.45, Math.max(0.85, Math.round(next * 100) / 100));
            document.documentElement.style.setProperty('--font-scale', String(scale));
            localStorage.setItem('st8925_font_scale', String(scale));
            if (rstBtn) rstBtn.textContent = `${Math.round(scale * 100)}%`;
        };
        applyScale(scale);
        if (decBtn) decBtn.addEventListener('click', () => applyScale(scale - 0.1));
        if (rstBtn) rstBtn.addEventListener('click', () => applyScale(1));
        if (incBtn) incBtn.addEventListener('click', () => applyScale(scale + 0.1));
    }

    _seedWelcomeMessages() {
        if (this.messages.A.length === 0) {
            this.ingestIncomingMessage({
                id: 'seed_a_1',
                channel: 'A',
                sender: 'MARU AI [CONCIERGE]',
                role: 'bot',
                timestamp: Date.now() - 60000,
                text: '歡迎來到 **ST8925 LAB 訪客與 AI 諮詢接待室 (Channel A)**！\n您可以直接發送文字或圖片詢問專案細節，或點擊上方「📲 呼叫山姆哥」透過 Telegram 即時通知本人接手。'
            });
        }
        if (this.messages.B.length === 0) {
            this.ingestIncomingMessage({
                id: 'seed_b_1',
                channel: 'B',
                sender: 'ZERO-KNOWLEDGE VAULT',
                role: 'system',
                timestamp: Date.now() - 50000,
                text: '🔒 **端對端加密私密包廂 (Channel B)**：請先於上方輸入通行密語（Passphrase）衍生 `AES-256-GCM` 金鑰。所有文字與圖片在離開瀏覽器前皆已加密為密文。'
            });
        }
        if (this.messages.C.length === 0) {
            this.ingestIncomingMessage({
                id: 'seed_c_1',
                channel: 'C',
                sender: 'ST8925 CHATOPS CORE',
                role: 'bot',
                timestamp: Date.now() - 40000,
                text: '⚡ **P01~P06 戰情告警與 ChatOps 頻道 (Channel C)** 已就緒。\n可點擊右側模擬器注入 P01/P02/P03 告警，或直接輸入 `/status`、`/diag ALM-9042`、`/help`。'
            });
        }
    }

    _bindChannelTabs() {
        document.querySelectorAll('[data-channel-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchChannel(btn.getAttribute('data-channel-tab'));
            });
        });
        const nameInput = document.getElementById('sender-alias-input');
        if (nameInput) {
            nameInput.addEventListener('change', () => {
                this.userName = nameInput.value.trim() || 'SAM_ARCHITECT';
            });
        }
    }

    switchChannel(channelId) {
        this.currentChannel = channelId;
        document.querySelectorAll('[data-channel-tab]').forEach(btn => {
            const active = btn.getAttribute('data-channel-tab') === channelId;
            btn.classList.toggle('active', active);
        });

        const vaultBar = document.getElementById('e2ee-vault-bar');
        if (vaultBar) {
            vaultBar.style.display = channelId === 'B' ? 'flex' : 'none';
        }

        const headerTitle = document.getElementById('active-channel-title');
        const headerDesc = document.getElementById('active-channel-desc');
        const meta = this._getChannelMeta(channelId);
        if (headerTitle) headerTitle.textContent = meta.title;
        if (headerDesc) headerDesc.textContent = meta.desc;

        this.renderCurrentStream();
    }

    _getChannelMeta(ch) {
        const map = {
            A: {
                title: '🌐 CHANNEL A — GUEST & AI CONCIERGE',
                desc: 'TLS + NVIDIA NIM 駐站 AI 即時接待｜支援一鍵 Telegram 呼叫山姆哥'
            },
            B: {
                title: '🔒 CHANNEL B — E2EE SECRET VAULT (AES-256-GCM)',
                desc: 'W3C Web Crypto PBKDF2 (100k SHA-256) + 96-bit IV｜伺服器零知識純密文傳輸'
            },
            C: {
                title: '⚡ CHANNEL C — P01~P06 TELEMETRY & CHATOPS',
                desc: '跨專案即時告警匯流排｜支援 /status, /diag, /ask, /notify 斜線指令'
            }
        };
        return map[ch] || map.A;
    }

    _bindVaultControls() {
        const unlockBtn = document.getElementById('btn-unlock-vault');
        const lockBtn = document.getElementById('btn-lock-vault');
        const passInput = document.getElementById('vault-passphrase-input');

        if (unlockBtn && passInput) {
            unlockBtn.addEventListener('click', async () => {
                await this._unlockVaultWithPassphrase(passInput.value);
            });
            passInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    await this._unlockVaultWithPassphrase(passInput.value);
                }
            });
        }
        if (lockBtn) {
            lockBtn.addEventListener('click', () => {
                this.crypto.clearKey();
                this._updateVaultBadge();
                this.renderCurrentStream();
            });
        }
    }

    async _unlockVaultWithPassphrase(pass) {
        try {
            const fp = await this.crypto.deriveKeyFromPassphrase(pass);
            this._updateVaultBadge(fp);
            await this.renderCurrentStream();
        } catch (err) {
            alert(err.message);
        }
    }

    _updateVaultBadge() {
        const badge = document.getElementById('vault-key-status');
        const fpBox = document.getElementById('inspector-key-fp');
        const unlocked = this.crypto.isReady();
        const fp = this.crypto.getFingerprint();

        if (badge) {
            badge.textContent = unlocked ? `🔓 UNLOCKED [FP: ${fp}]` : '🔒 VAULT LOCKED';
            badge.className = unlocked ? 'vault-badge unlocked' : 'vault-badge locked';
        }
        if (fpBox) {
            fpBox.textContent = unlocked ? `${fp} (AES-256-GCM)` : 'LOCKED (No Key in RAM)';
        }
    }

    _bindTelemetryControls() {
        document.querySelectorAll('[data-sim-trigger]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const key = btn.getAttribute('data-sim-trigger');
                this.switchChannel('C');
                await this.telemetry.triggerSimulatedEvent(key);
            });
        });

        const callSamBtn = document.getElementById('btn-call-sam-tg');
        if (callSamBtn) {
            callSamBtn.addEventListener('click', async () => {
                const res = await this.telemetry.sendTelegramAlert({
                    source: `WEB_CHANNEL_${this.currentChannel}`,
                    severity: 'HIGH',
                    message: `使用者 [${this.userName}] 於頻道 ${this.currentChannel} 請求山姆哥即時連線上線！`
                });
                await this.transport.sendMessage({
                    channel: this.currentChannel,
                    sender: 'TELEGRAM BRIDGE',
                    role: 'system',
                    text: res.delivered
                        ? '📲 **已透過 Telegram Bot 推播通知山姆哥手機**，請稍候回應。'
                        : `⚠️ **目前離線，通知未送出**（閘道模式：\`${res.mode}\`）。如需聯繫山姆哥，請改用首頁的 CONTACT。`
                });
            });
        }
    }

    _bindComposer() {
        const form = document.getElementById('chat-composer-form');
        const input = document.getElementById('chat-message-input');
        const fileInput = document.getElementById('chat-file-input');
        const dropZone = document.getElementById('chat-stream-container');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this._handleSend(input);
            });
        }
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files[0]) {
                    this._stageFile(fileInput.files[0]);
                }
            });
        }
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-active');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-active');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-active');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    this._stageFile(e.dataTransfer.files[0]);
                }
            });
        }
        window.addEventListener('paste', (e) => {
            if (e.clipboardData && e.clipboardData.files.length > 0) {
                this._stageFile(e.clipboardData.files[0]);
            }
        });
    }

    _stageFile(file) {
        try {
            this.fileHandler.validateFile(file);
            this.pendingFile = file;
            const previewBar = document.getElementById('staged-file-bar');
            if (previewBar) {
                previewBar.style.display = 'flex';
                previewBar.innerHTML = `
                    <span>📎 待傳送附件：<strong>${this._escapeHtml(file.name)}</strong> (${this.fileHandler.formatSize(file.size)})</span>
                    <button type="button" id="btn-cancel-file" class="mini-btn">✕ 移除</button>
                `;
                document.getElementById('btn-cancel-file').onclick = () => {
                    this.pendingFile = null;
                    previewBar.style.display = 'none';
                };
            }
        } catch (err) {
            alert(err.message);
        }
    }

    async _handleSend(inputEl) {
        const rawText = (inputEl ? inputEl.value : '').trim();
        if (!rawText && !this.pendingFile) return;

        const ch = this.currentChannel;
        const isE2ee = ch === 'B';

        if (isE2ee && !this.crypto.isReady()) {
            alert('🔒 頻道 B 為端對端加密私密包廂，請先於上方輸入通行密語（Passphrase）解鎖金鑰！');
            return;
        }

        try {
            let attachment = null;
            if (this.pendingFile) {
                attachment = await this.fileHandler.prepareAttachment(this.pendingFile, isE2ee);
                this.pendingFile = null;
                const previewBar = document.getElementById('staged-file-bar');
                if (previewBar) previewBar.style.display = 'none';
            }

            let envelope = {
                channel: ch,
                sender: this.userName,
                role: 'user',
                e2ee: isE2ee,
                attachment
            };

            if (isE2ee && rawText) {
                envelope.encryptedPayload = await this.crypto.encryptText(rawText);
            } else {
                envelope.text = rawText;
            }

            if (inputEl) inputEl.value = '';
            await this.transport.sendMessage(envelope);

            if (!isE2ee && (rawText || (attachment && attachment.isImage))) {
                const botReply = await this.aiBot.processInput(
                    rawText,
                    ch,
                    this.messages[ch],
                    attachment
                );
                if (botReply) {
                    await this.transport.sendMessage({
                        channel: ch,
                        ...botReply
                    });
                }
            }
        } catch (err) {
            alert(`發送失敗: ${err.message}`);
        }
    }

    async ingestIncomingMessage(msg) {
        const ch = msg.channel || 'A';
        if (!this.messages[ch]) this.messages[ch] = [];
        this.messages[ch].push(msg);
        this._updateChannelCounts();
        if (ch === this.currentChannel) {
            await this.renderCurrentStream();
        }
    }

    _updateChannelCounts() {
        ['A', 'B', 'C'].forEach(ch => {
            const el = document.getElementById(`count-ch-${ch}`);
            if (el) el.textContent = String((this.messages[ch] || []).length);
        });
    }

    async renderCurrentStream() {
        const container = document.getElementById('chat-stream-container');
        if (!container) return;
        const list = this.messages[this.currentChannel] || [];
        const fragments = [];

        for (const msg of list) {
            fragments.push(await this._renderMessageCard(msg));
        }
        container.innerHTML = fragments.join('');
        container.scrollTop = container.scrollHeight;
    }

    async _renderMessageCard(msg) {
        const timeStr = new Date(msg.timestamp || Date.now()).toLocaleTimeString('zh-TW', { hour12: false });
        const roleClass = `msg-card role-${this._escapeHtml(msg.role || 'user')}`;
        let bodyHtml = '';

        if (msg.e2ee && msg.encryptedPayload) {
            bodyHtml = await this._renderEncryptedText(msg.encryptedPayload);
        } else if (msg.text) {
            bodyHtml = `<div class="msg-text">${this._formatMarkdown(msg.text)}</div>`;
        }

        if (msg.attachment) {
            bodyHtml += await this._renderAttachmentHtml(msg.attachment);
        }

        return `
            <article class="${roleClass}">
                <header class="msg-header">
                    <span class="msg-sender">${this._escapeHtml(msg.sender || 'ANON')}</span>
                    ${msg.e2ee ? '<span class="e2ee-pill">🔒 AES-256-GCM</span>' : ''}
                    <time class="msg-time">${timeStr}</time>
                </header>
                ${bodyHtml}
            </article>
        `;
    }

    async _renderEncryptedText(encPayload) {
        const previewCipher = encPayload.ciphertext.slice(0, 44) + '...';
        if (!this.crypto.isReady()) {
            return `
                <div class="cipher-locked-box">
                    <div class="cipher-line">🔐 <strong>ENCRYPTED CIPHERTEXT</strong> (IV: <code>${this._escapeHtml(encPayload.iv)}</code> | Key FP: <code>${this._escapeHtml(encPayload.fingerprint)}</code>)</div>
                    <code class="raw-cipher">${this._escapeHtml(previewCipher)}</code>
                    <div class="cipher-hint">請於上方輸入通行密語解鎖以於瀏覽器本地端解密檢視。</div>
                </div>
            `;
        }
        try {
            const plain = await this.crypto.decryptText(encPayload);
            return `
                <div class="msg-text e2ee-decrypted">${this._formatMarkdown(plain)}</div>
                <div class="cipher-verified-meta">✓ Verified E2EE Decrypted Locally | IV: <code>${this._escapeHtml(String(encPayload.iv).slice(0, 8))}…</code> | FP: <code>${this._escapeHtml(encPayload.fingerprint)}</code></div>
            `;
        } catch (_) {
            return `
                <div class="cipher-locked-box mismatch">
                    <div>⚠️ <strong>金鑰不匹配 (Key Mismatch)</strong> — 此訊息使用指紋 <code>${this._escapeHtml(encPayload.fingerprint)}</code> 加密</div>
                    <code class="raw-cipher">${this._escapeHtml(previewCipher)}</code>
                </div>
            `;
        }
    }

    async _renderAttachmentHtml(att) {
        const resolved = await this.fileHandler.resolveAttachment(att);
        if (!resolved.unlocked) {
            return `
                <div class="attachment-box locked">
                    🔒 <strong>加密二進位附件 (AES-256-GCM Encrypted Binary)</strong>
                    <span>大小：${this.fileHandler.formatSize(resolved.size)} | 金鑰指紋：<code>${this._escapeHtml(resolved.fingerprint)}</code></span>
                </div>
            `;
        }
        const safeName = this._escapeHtml(resolved.name);
        const safeUrl = this._safeAttachmentUrl(resolved.url);
        const sizeLabel = this.fileHandler.formatSize(resolved.size);
        if (resolved.isImage) {
            return `
                <div class="attachment-box unlocked">
                    <div class="att-meta">🖼️ ${safeName} (${sizeLabel}) ${resolved.e2eeVerified ? '· <span class="e2ee-ok">E2EE Decrypted</span>' : ''}</div>
                    <img src="${safeUrl}" alt="${safeName}" class="chat-img-preview" loading="lazy" />
                    <a href="${safeUrl}" download="${safeName}" class="att-download-link">⬇ 下載檔案</a>
                </div>
            `;
        }
        return `
            <div class="attachment-box unlocked">
                <div class="att-meta">📄 <strong>${safeName}</strong> (${sizeLabel}) ${resolved.e2eeVerified ? '· <span class="e2ee-ok">E2EE Decrypted</span>' : ''}</div>
                <a href="${safeUrl}" download="${safeName}" class="att-download-link">⬇ 點擊下載解密後檔案</a>
            </div>
        `;
    }

    _formatMarkdown(text) {
        let safe = this._escapeHtml(text);
        safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
        return safe.replace(/\n/g, '<br>');
    }

    // 附件網址只接受本機產生的 data: 與 blob:，其餘（如 javascript:）一律丟棄。
    _safeAttachmentUrl(url) {
        const s = String(url || '');
        return /^(data|blob):/i.test(s) ? this._escapeHtml(s) : '#';
    }

    _escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
