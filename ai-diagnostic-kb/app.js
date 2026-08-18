// =========================================================================
//  app.js — AI Diagnostic Knowledge Base Frontend Controller
// =========================================================================

import { FLEET_MACHINES, REGISTER_DEFINITIONS, generateMachineTelemetryHistory } from './modules/fleet-data.js';
import { aiEngine } from './modules/ai-engine.js';
import { KB_TROUBLESHOOTING, KB_WORK_ORDERS, KB_FAQS, KB_PARTS, searchKnowledgeBase } from './modules/kb-store.js';

class DiagnosticApp {
    constructor() {
        this.machines = FLEET_MACHINES;
        this.activeMachineId = 15; // Default: A區南區1號冰水主機
        this.activeView = 'dashboard'; // 'dashboard' | 'diagnosis' | 'trends' | 'knowledge'
        this.activeKbTab = 'troubleshooting'; // 'troubleshooting' | 'workorders' | 'faqs' | 'parts'

        this.machineHistories = new Map();
        this.machineSnapshots = new Map();
        this.sparklineCharts = new Map();
        this.mainTrendChart = null;
        this.cusumChart = null;

        this.initData();
    }

    initData() {
        // Pre-generate 30-day historical telemetry for all 21 machines
        for (const m of this.machines) {
            const hist = generateMachineTelemetryHistory(m.id, 30);
            this.machineHistories.set(m.id, hist);
            this.machineSnapshots.set(m.id, hist[hist.length - 1].data);
        }
    }

    init() {
        this.bindEvents();
        this.renderDashboard();
        this.renderDiagnosisView();
        this.renderKnowledgeBaseView();
        this.startLiveSimulation();
    }

    bindEvents() {
        // Topbar navigation tabs
        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetView = e.currentTarget.dataset.view;
                this.switchView(targetView);
            });
        });

        // KB Subtabs
        document.querySelectorAll('.kb-subtab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.kb-subtab').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.activeKbTab = e.currentTarget.dataset.tab;
                this.renderKnowledgeBaseTab();
            });
        });

        // KB Search Input
        const searchInput = document.getElementById('kb-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleKBSearch(e.target.value);
            });
        }

        // Trigger AI Diagnosis Button
        const diagBtn = document.getElementById('btn-run-diagnosis');
        if (diagBtn) {
            diagBtn.addEventListener('click', () => this.triggerAIDiagnosis());
        }

        // Fault Injection Buttons
        const injectFoulingBtn = document.getElementById('btn-fault-fouling');
        if (injectFoulingBtn) {
            injectFoulingBtn.addEventListener('click', () => this.injectFault(15, 'condenser_fouling'));
        }

        const injectLeakBtn = document.getElementById('btn-fault-leak');
        if (injectLeakBtn) {
            injectLeakBtn.addEventListener('click', () => this.injectFault(6, 'refrigerant_leak'));
        }

        const resetFaultsBtn = document.getElementById('btn-reset-faults');
        if (resetFaultsBtn) {
            resetFaultsBtn.addEventListener('click', () => this.resetAllFaults());
        }
    }

    switchView(viewName) {
        this.activeView = viewName;
        document.querySelectorAll('.nav-tab').forEach(b => {
            b.classList.toggle('active', b.dataset.view === viewName);
        });

        document.querySelectorAll('.view-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === `view-${viewName}`);
        });

        if (viewName === 'diagnosis') {
            this.renderDiagnosisView();
        } else if (viewName === 'trends') {
            this.renderTrendsView();
        } else if (viewName === 'knowledge') {
            this.renderKnowledgeBaseView();
        }
    }

    selectMachine(machineId) {
        this.activeMachineId = parseInt(machineId);
        this.switchView('diagnosis');
    }

    // ── View 1: Fleet Dashboard ──
    renderDashboard() {
        const grid = document.getElementById('fleet-cards-grid');
        if (!grid) return;
        grid.innerHTML = '';

        let healthy = 0, warning = 0, critical = 0;

        for (const m of this.machines) {
            const hist = this.machineHistories.get(m.id) || [];
            const snapshot = this.machineSnapshots.get(m.id) || {};
            const drifts = aiEngine.detectDrifts(m.id, snapshot, hist);

            let status = 'healthy';
            let score = 96;

            if (m.id === 6 || m.degradation === 'refrigerant_leak') {
                status = 'critical';
                score = 62;
                critical++;
            } else if (m.id === 15 || m.id === 23 || drifts.length > 0) {
                status = 'warning';
                score = m.id === 15 ? 78 : 81;
                warning++;
            } else {
                healthy++;
            }

            const card = document.createElement('div');
            card.className = `machine-card status-${status}`;
            card.onclick = () => this.selectMachine(m.id);

            const badgeClass = status === 'critical' ? 'badge-critical' : (status === 'warning' ? 'badge-warning' : 'badge-healthy');
            const statusLabel = status === 'critical' ? '危急 Critical' : (status === 'warning' ? '預警 Warning' : '正常 Healthy');
            const scoreColor = status === 'critical' ? 'var(--critical)' : (status === 'warning' ? 'var(--warning)' : 'var(--healthy)');

            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <div class="card-title">${m.name}</div>
                        <div class="card-meta">SN: ${m.sn} · ${m.model} · ${m.capacity}RT</div>
                    </div>
                    <span class="status-badge ${badgeClass}">${statusLabel}</span>
                </div>
                <div class="card-body">
                    <div class="health-dial">
                        <div class="health-dial-score" style="color: ${scoreColor}">${score}</div>
                        <div class="health-dial-label">AI 健康指標</div>
                    </div>
                    <div class="sparkline-box">
                        <canvas id="sparkline-${m.id}"></canvas>
                    </div>
                </div>
                <div class="card-footer">
                    <div>出水: <strong>${snapshot.AAA0028 || 8.2}°C</strong> · 高壓: <strong>${snapshot.AAA0036 || 15.6} kg</strong></div>
                    ${drifts.length > 0 ? `<div class="card-drift-tag">⚠️ 漂移: ${drifts[0].fieldName}</div>` : `<div style="color:var(--healthy)">✓ 基線吻合</div>`}
                </div>
            `;
            grid.appendChild(card);

            // Render mini sparkline
            setTimeout(() => {
                this.renderSparkline(m.id, hist.slice(-14));
            }, 50);
        }

        // Update Stat Counters
        document.getElementById('stat-total-machines').textContent = this.machines.length;
        document.getElementById('stat-healthy-count').textContent = healthy;
        document.getElementById('stat-warning-count').textContent = warning;
        document.getElementById('stat-critical-count').textContent = critical;
    }

    renderSparkline(machineId, snapshots) {
        const canvas = document.getElementById(`sparkline-${machineId}`);
        if (!canvas || typeof Chart === 'undefined') return;

        const vals = snapshots.map(s => s.data.AAA0028);
        const labels = snapshots.map((_, i) => i);

        if (this.sparklineCharts.has(machineId)) {
            this.sparklineCharts.get(machineId).destroy();
        }

        const isWarning = machineId === 15 || machineId === 23;
        const isCrit = machineId === 6;
        const lineColor = isCrit ? '#ff6b6b' : (isWarning ? '#fcc419' : '#40c057');

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data: vals,
                    borderColor: lineColor,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.35,
                    fill: true,
                    backgroundColor: isCrit ? 'rgba(255,107,107,0.1)' : (isWarning ? 'rgba(252,196,25,0.1)' : 'rgba(64,192,87,0.1)')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } }
            }
        });

        this.sparklineCharts.set(machineId, chart);
    }

    // ── View 2: Machine Deep Diagnosis ──
    renderDiagnosisView() {
        const machine = this.machines.find(m => m.id === this.activeMachineId) || this.machines[0];
        const snapshot = this.machineSnapshots.get(machine.id) || {};
        const history = this.machineHistories.get(machine.id) || [];

        // Render Sidebar Machine List
        const listEl = document.getElementById('diag-machine-list');
        if (listEl) {
            listEl.innerHTML = this.machines.map(m => {
                const s = this.machineSnapshots.get(m.id) || {};
                const isActive = m.id === this.activeMachineId ? 'active' : '';
                return `
                    <div class="machine-nav-item ${isActive}" onclick="window.diagnosticApp.selectMachine(${m.id})">
                        <div>
                            <div style="font-weight:600; font-size:12px; color:#fff">${m.name}</div>
                            <div style="font-size:10px; color:var(--muted)">${m.model} · ${m.sn}</div>
                        </div>
                        <div style="font-size:12px; font-weight:700; color:${m.id === 6 ? 'var(--critical)' : (m.id === 15 || m.id === 23 ? 'var(--warning)' : 'var(--healthy)')}">
                            ${m.id === 6 ? '62' : (m.id === 15 ? '78' : (m.id === 23 ? '81' : '96'))}
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Header details
        document.getElementById('diag-target-name').textContent = machine.name;
        document.getElementById('diag-target-meta').textContent = `型號: ${machine.model} · 序號: ${machine.sn} · 容量: ${machine.capacity} RT · 運轉時數: ${snapshot.AAA0042 || 12850} hrs`;

        // Baseline Comparison Table
        const tableBody = document.getElementById('diag-comparison-tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            for (const [code, meta] of Object.entries(REGISTER_DEFINITIONS)) {
                const val = snapshot[code] || meta.base;
                const base = meta.base;
                const std = meta.std;
                const diff = val - base;
                const sigma = (diff / std).toFixed(2);
                const isWarn = Math.abs(sigma) > 1.8;
                const isCrit = Math.abs(sigma) > 3.0;

                const statusColor = isCrit ? 'var(--critical)' : (isWarn ? 'var(--warning)' : 'var(--healthy)');
                const statusPill = isCrit ? 'CRITICAL' : (isWarn ? 'WARNING' : 'NORMAL');
                const fillClass = isCrit ? 'critical' : (isWarn ? 'warning' : '');

                // Percent of bar (50% is baseline center)
                const barPercent = Math.max(10, Math.min(90, 50 + (diff / (std * 4)) * 40));

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${meta.name}</strong> <span style="color:var(--muted)">(${code})</span></td>
                    <td><strong>${val}</strong> ${meta.unit}</td>
                    <td>${base.toFixed(2)} ± ${std.toFixed(2)} ${meta.unit}</td>
                    <td>
                        <div class="meter-bar">
                            <div class="meter-fill ${fillClass}" style="width: ${barPercent}%"></div>
                        </div>
                    </td>
                    <td style="color:${statusColor}; font-weight:700">${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${sigma}σ)</td>
                    <td><span class="status-badge" style="background:${statusColor}22; color:${statusColor}; border:1px solid ${statusColor}55">${statusPill}</span></td>
                `;
                tableBody.appendChild(tr);
            }
        }

        // Render AI Report
        this.renderAIDiagnosisReport(machine, snapshot, history);
        this.renderDetailedTrendChart(machine.id, history);
    }

    async renderAIDiagnosisReport(machine, snapshot, history) {
        const report = await aiEngine.generateDiagnosis(machine, snapshot, history);
        const container = document.getElementById('ai-report-container');
        if (!container) return;

        container.innerHTML = `
            <div class="ai-report-box">
                <div class="report-badge">🤖 GEMINI RAG AI 智慧根因診斷報告 (置信度: ${Math.round(report.confidenceScore * 100)}%)</div>
                <div class="report-summary-text">${report.summary}</div>

                <div class="report-section-title">🔍 根本原因推理分析 (Root Cause Ranking)</div>
                ${report.causes.map(c => `
                    <div class="cause-item">
                        <div class="cause-title">
                            <span>#${c.rank} ${c.cause}</span>
                            <span style="color:var(--warning)">機率: ${c.prob}</span>
                        </div>
                        <div class="cause-reason">${c.reason}</div>
                    </div>
                `).join('')}

                <div class="report-section-title">🛠️ 建議處置行動步驟 (Prescriptive Remediation)</div>
                ${report.actions.map(a => `
                    <div class="action-step">
                        <div class="action-step-left">
                            <div class="step-num">${a.priority}</div>
                            <div>
                                <div style="font-weight:600; color:#fff">${a.action}</div>
                                <div style="font-size:11px; color:var(--muted)">所需工具: ${a.tools || '一般檢修工具'} · 預估耗時: ${a.time}</div>
                            </div>
                        </div>
                        <span class="status-badge" style="background:rgba(77,171,247,0.15); color:var(--c)">${a.urgency.toUpperCase()}</span>
                    </div>
                `).join('')}

                <div class="report-section-title">⚠️ 風險評估與惡化預判 (Risk Escalation)</div>
                <div style="background:rgba(0,0,0,0.3); padding:12px 16px; border-radius:var(--radius-sm); font-size:12px; color:#cbd5e1; border-left:3px solid var(--critical)">
                    ${report.risk.escalation} (預估時間窗口: <strong>${report.risk.timeframe}</strong>)
                </div>
            </div>
        `;
    }

    renderDetailedTrendChart(machineId, history) {
        const canvas = document.getElementById('diag-trend-canvas');
        if (!canvas || typeof Chart === 'undefined') return;

        const points = history.slice(-72); // Last 3 days
        const labels = points.map(p => p.timeLabel);
        const supplyVals = points.map(p => p.data.AAA0028);
        const condVals = points.map(p => p.data.AAA0030);
        const hpVals = points.map(p => p.data.AAA0036);

        if (this.mainTrendChart) {
            this.mainTrendChart.destroy();
        }

        this.mainTrendChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: '冷卻水出水溫度 (AAA0030, °C)',
                        data: condVals,
                        borderColor: '#fcc419',
                        backgroundColor: 'rgba(252,196,25,0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: '冰水出水溫度 (AAA0028, °C)',
                        data: supplyVals,
                        borderColor: '#339af0',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: '冷媒高壓壓力 (AAA0036, kg/cm²)',
                        data: hpVals,
                        borderColor: '#ff6b6b',
                        borderWidth: 1.5,
                        borderDash: [4, 4],
                        tension: 0.2,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: '#e8eef7', font: { family: 'ui-monospace' } } }
                },
                scales: {
                    x: { ticks: { color: '#8494ab', maxTicksLimit: 12 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { type: 'linear', position: 'left', ticks: { color: '#8494ab' }, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: '溫度 (°C)', color: '#8494ab' } },
                    y1: { type: 'linear', position: 'right', ticks: { color: '#ff6b6b' }, grid: { drawOnChartArea: false }, title: { display: true, text: '高壓 (kg/cm²)', color: '#ff6b6b' } }
                }
            }
        });
    }

    // ── View 3: Trends & CUSUM ──
    renderTrendsView() {
        const cusumCanvas = document.getElementById('cusum-chart-canvas');
        if (!cusumCanvas || typeof Chart === 'undefined') return;

        const hist = this.machineHistories.get(15) || [];
        const condVals = hist.map(p => p.data.AAA0030);
        const labels = hist.map(p => p.timeLabel);

        // Compute CUSUM S_hi series
        const target = 34.5;
        const k = 0.5 * 0.65;
        let sHi = 0;
        const cusumHiSeries = [];

        for (const v of condVals) {
            sHi = Math.max(0, sHi + (v - target - k));
            cusumHiSeries.push(parseFloat(sHi.toFixed(2)));
        }

        if (this.cusumChart) {
            this.cusumChart.destroy();
        }

        this.cusumChart = new Chart(cusumCanvas, {
            type: 'line',
            data: {
                labels: labels.slice(-96),
                datasets: [
                    {
                        label: 'CUSUM 累積偏移值 (S_hi)',
                        data: cusumHiSeries.slice(-96),
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255,107,107,0.15)',
                        fill: true,
                        borderWidth: 2,
                        tension: 0.25
                    },
                    {
                        label: '決策閾值 (Threshold h = 4.5σ = 2.92)',
                        data: new Array(96).fill(2.92),
                        borderColor: '#fcc419',
                        borderDash: [6, 6],
                        borderWidth: 1.5,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#e8eef7' } }
                },
                scales: {
                    x: { ticks: { color: '#8494ab', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#8494ab' }, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: '累積和 S_n', color: '#8494ab' } }
                }
            }
        });
    }

    // ── View 4: Knowledge Base Browser ──
    renderKnowledgeBaseView() {
        this.renderKnowledgeBaseTab();
    }

    renderKnowledgeBaseTab() {
        const container = document.getElementById('kb-content-area');
        if (!container) return;

        if (this.activeKbTab === 'troubleshooting') {
            container.innerHTML = KB_TROUBLESHOOTING.map(t => `
                <div class="kb-card">
                    <div class="kb-card-header">
                        <div style="font-size:15px; font-weight:600; color:#fff">${t.title}</div>
                        <span class="kb-code-tag">${t.code}</span>
                    </div>
                    <div style="font-size:12px; color:var(--muted); margin-bottom:12px">${t.symptom}</div>
                    <div style="font-weight:600; font-size:12px; color:#94a3b8; margin-bottom:6px">可能根本原因：</div>
                    ${t.causes.map(c => `
                        <div style="background:rgba(0,0,0,0.25); padding:8px 12px; border-radius:4px; margin-bottom:6px; font-size:12px">
                            <span style="color:#fff; font-weight:600">#${c.rank} ${c.cause}</span>
                            <span style="color:var(--warning); float:right">機率 ${c.prob}</span>
                            <div style="color:var(--muted); font-size:11px; margin-top:2px">${c.reason}</div>
                        </div>
                    `).join('')}
                </div>
            `).join('');
        } else if (this.activeKbTab === 'workorders') {
            container.innerHTML = KB_WORK_ORDERS.map(w => `
                <div class="kb-card">
                    <div class="kb-card-header">
                        <div style="font-size:15px; font-weight:600; color:#fff">${w.title}</div>
                        <span class="kb-code-tag">${w.no}</span>
                    </div>
                    <div style="font-size:12px; color:var(--muted); margin-bottom:8px">📅 維修日期: ${w.date} · 技師: ${w.tech} · 工時: ${w.hours}</div>
                    <div style="background:rgba(0,0,0,0.25); padding:10px 14px; border-radius:6px; font-size:12px; margin-bottom:8px">
                        <div><strong>故障現象：</strong>${w.phenomenon}</div>
                        <div style="margin-top:4px"><strong>根本原因：</strong>${w.cause}</div>
                        <div style="margin-top:4px"><strong>維修動作：</strong>${w.action}</div>
                        <div style="margin-top:4px; color:var(--healthy)"><strong>更換料件：</strong>${w.parts}</div>
                    </div>
                </div>
            `).join('');
        } else if (this.activeKbTab === 'faqs') {
            container.innerHTML = KB_FAQS.map(f => `
                <div class="kb-card">
                    <div style="font-size:14px; font-weight:600; color:#74c0fc; margin-bottom:8px">❓ Q: ${f.q}</div>
                    <div style="font-size:13px; line-height:1.6; color:#e2e8f0; background:rgba(0,0,0,0.25); padding:12px 16px; border-radius:6px">
                        ${f.a.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `).join('');
        } else if (this.activeKbTab === 'parts') {
            container.innerHTML = KB_PARTS.map(p => `
                <div class="kb-card" style="display:flex; justify-content:space-between; align-items:center">
                    <div>
                        <div style="font-size:14px; font-weight:600; color:#fff">${p.name}</div>
                        <div style="font-size:12px; color:var(--muted)">標準保養週期: ${p.interval} · 預估費用: ${p.cost}</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:13px; font-weight:700; color:var(--healthy)">壽命 ${p.life} Hrs</div>
                        <div style="font-size:11px; color:var(--warning)">預警門檻: ${p.warn} Hrs</div>
                    </div>
                </div>
            `).join('');
        }
    }

    handleKBSearch(query) {
        const container = document.getElementById('kb-content-area');
        if (!container) return;

        if (!query.trim()) {
            this.renderKnowledgeBaseTab();
            return;
        }

        const hits = searchKnowledgeBase(query);
        if (hits.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted)">查無符合「${query}」之知識庫條目。</div>`;
            return;
        }

        container.innerHTML = `
            <div style="font-size:12px; color:var(--c); margin-bottom:14px">找到 ${hits.length} 筆語義關聯知識結果：</div>
            ${hits.map(h => `
                <div class="kb-card">
                    <div class="kb-card-header">
                        <div style="font-size:15px; font-weight:600; color:#fff">${h.title}</div>
                        <span class="status-badge badge-healthy">相關度 ${(h.score * 100).toFixed(0)}%</span>
                    </div>
                    <div style="font-size:11px; color:var(--c); margin-bottom:6px">[來源: ${h.table}] ${h.code}</div>
                    <div style="font-size:13px; color:#cbd5e1; line-height:1.5">${h.summary}</div>
                </div>
            `).join('')}
        `;
    }

    // ── Live Simulation & Fault Injections ──
    startLiveSimulation() {
        setInterval(() => {
            for (const m of this.machines) {
                const snapshot = this.machineSnapshots.get(m.id);
                if (snapshot) {
                    // Small real-time flutter
                    snapshot.AAA0028 = parseFloat((snapshot.AAA0028 + (Math.random() - 0.5) * 0.05).toFixed(2));
                    snapshot.AAA0030 = parseFloat((snapshot.AAA0030 + (Math.random() - 0.5) * 0.08).toFixed(2));
                    snapshot.AAA0036 = parseFloat((snapshot.AAA0036 + (Math.random() - 0.5) * 0.04).toFixed(2));
                }
            }
        }, 3000);
    }

    injectFault(machineId, faultType) {
        const m = this.machines.find(dev => dev.id === machineId);
        if (!m) return;
        m.degradation = faultType;

        const snapshot = this.machineSnapshots.get(machineId);
        if (faultType === 'condenser_fouling') {
            snapshot.AAA0030 = 36.8;
            snapshot.AAA0036 = 17.6;
            snapshot.AAA0045 = 4.1;
        } else if (faultType === 'refrigerant_leak') {
            snapshot.AAA0037 = 2.1;
            snapshot.AAA0036 = 13.2;
            snapshot.AAA0028 = 9.8;
        }

        this.renderDashboard();
        if (this.activeView === 'diagnosis' && this.activeMachineId === machineId) {
            this.renderDiagnosisView();
        }
        alert(`已成功注入「${faultType === 'condenser_fouling' ? '冷凝器結垢散熱不良' : '冷媒管路微量洩漏'}」故障場景至 ${m.name}！AI 預警與診斷引擎已立即更新。`);
    }

    resetAllFaults() {
        this.initData();
        this.renderDashboard();
        if (this.activeView === 'diagnosis') {
            this.renderDiagnosisView();
        }
        alert('全機隊運轉參數已重置為健康標準狀態！');
    }

    triggerAIDiagnosis() {
        this.renderDiagnosisView();
        alert('AI 根因診斷引擎重新評估完成！');
    }
}

// Instantiate and attach globally
window.diagnosticApp = new DiagnosticApp();
window.addEventListener('DOMContentLoaded', () => {
    window.diagnosticApp.init();
});
