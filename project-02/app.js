// =========================================================================
//  app.js - Wayne IoT Gen 2 Simulator & Monitor - Main Application
//  前端核心主模組：驅動 21 台機組遙測、Modbus 矩陣更新、圖表繪製與 AI 預測
// =========================================================================

import { ProductionFleetManager, PRODUCTION_FLEET, WEST_LAKE_REGISTERS } from './modules/fleet-simulator.js';
import { AlarmRuleEngine, DEFAULT_RULES } from './modules/rule-engine.js';
import { predictTrend, detectAnomaly } from './modules/ai-predictor.js';

// ── State ──
let fleet = null;
let ruleEngine = null;
let simInterval = null;
let isRunning = false;
let tickCounter = 0;
let currentChartMode = 'temp'; // 'temp' | 'pressure' | 'power'
let selectedModalAlarm = null;

// ── DOM Helpers ──
const $ = id => document.getElementById(id);

// ── Chart Instances ──
let chartRealtime = null;
let chartPrediction = null;

// ── Initialize ──
function init() {
    fleet = new ProductionFleetManager();
    ruleEngine = new AlarmRuleEngine(JSON.parse(JSON.stringify(DEFAULT_RULES)));
    tickCounter = 0;

    // Populate Device Dropdown with 21 Real Devices
    populateDeviceDropdown();

    // Display Rules in Sandbox
    $('ruleDisplay').textContent = JSON.stringify(DEFAULT_RULES, null, 2);

    // Init Charts
    initCharts();

    // Bind Event Listeners
    bindEvents();

    // Initial render of Modbus matrix
    updateModbusGrid();

    // Start Simulation automatically
    startSimulation();
}

function populateDeviceDropdown() {
    const select = $('deviceSelect');
    select.innerHTML = '';
    for (const dev of PRODUCTION_FLEET) {
        const opt = document.createElement('option');
        opt.value = dev.id;
        opt.textContent = `${dev.id}. ${dev.name} (${dev.sn})`;
        if (dev.id === 15) opt.selected = true; // Default West Lake Station #1
        select.appendChild(opt);
    }
}

function bindEvents() {
    // Device switch
    $('deviceSelect').addEventListener('change', e => {
        fleet.setActiveMachine(e.target.value);
        updateActiveDeviceLabels();
        updateModbusGrid();
        refreshCharts();
    });

    // Sim pause / resume
    $('btnPause').addEventListener('click', () => {
        if (isRunning) {
            pauseSimulation();
            $('btnPause').textContent = '▶ 繼續 (RESUME)';
            $('btnPause').classList.add('active');
        } else {
            startSimulation();
            $('btnPause').textContent = '⏸ 暫停 (PAUSE)';
            $('btnPause').classList.remove('active');
        }
    });

    // Fault injection buttons
    document.querySelectorAll('[data-fault]').forEach(btn => {
        btn.addEventListener('click', () => {
            const faultType = btn.dataset.fault;
            fleet.injectFault(faultType);
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 2000);
        });
    });

    // Clear faults
    $('btnClearFaults').addEventListener('click', () => {
        fleet.clearAllFaults();
    });

    // Sim speed selector
    $('simSpeed').addEventListener('change', e => {
        const speed = parseInt(e.target.value);
        if (isRunning) {
            pauseSimulation();
            startSimulation(speed);
        }
    });

    // Chart metric tabs
    document.querySelectorAll('[data-chart]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-chart]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartMode = btn.dataset.chart;
            updateRealtimeChartLabels();
            refreshCharts();
        });
    });

    // Modal close
    $('btnCloseModal').addEventListener('click', () => {
        $('notificationModal').style.display = 'none';
    });

    // Modal Tabs
    $('tabLine').addEventListener('click', () => {
        $('tabLine').classList.add('active');
        $('tabFcm').classList.remove('active');
        renderModalContent('line');
    });
    $('tabFcm').addEventListener('click', () => {
        $('tabFcm').classList.add('active');
        $('tabLine').classList.remove('active');
        renderModalContent('fcm');
    });
}

function startSimulation(intervalMs = 1000) {
    if (simInterval) clearInterval(simInterval);
    isRunning = true;
    simInterval = setInterval(tick, intervalMs);
}

function pauseSimulation() {
    isRunning = false;
    if (simInterval) clearInterval(simInterval);
    simInterval = null;
}

// ── Simulation Tick ──
function tick() {
    tickCounter++;
    const snapshots = fleet.tickAll();

    // Evaluate rules for all snapshots
    for (const snap of snapshots) {
        const devInfo = PRODUCTION_FLEET.find(d => d.id === snap.machineId) || {};
        ruleEngine.evaluateSnapshot(snap, devInfo);
    }

    // Update UI elements
    updateStatusSummary();
    updateActiveDeviceLabels();
    updateModbusGrid();
    updateFleetTable();
    updateAlarmList();
    updateCharts(snapshots);
}

function updateStatusSummary() {
    const summary = fleet.getStatusSummary();
    $('statNormal').textContent = summary.normal;
    $('statWarning').textContent = summary.warning;
    $('statCritical').textContent = summary.critical;

    const lat = fleet.getLatencyPercentiles();
    $('statP99').textContent = lat.p99;

    const dev = fleet.getActiveMachine();
    $('metaSn').textContent = dev.serialNumber;
    $('metaType').textContent = `${dev.type.toUpperCase()} (${dev.model})`;
    $('metaStatus').textContent = dev.status === 'critical' ? '🔴 緊急警報' : (dev.status === 'warning' ? '🟡 異常預警' : '🟢 運轉正常');
    $('metaStatus').style.color = dev.status === 'critical' ? 'var(--red)' : (dev.status === 'warning' ? 'var(--yellow)' : 'var(--green)');
}

function updateActiveDeviceLabels() {
    const dev = fleet.getActiveMachine();
    $('chartTargetLabel').textContent = `${dev.name} (${dev.serialNumber})`;
    $('tableTargetLabel').textContent = `${dev.serialNumber}`;
}

function updateModbusGrid() {
    const dev = fleet.getActiveMachine();
    const hist = fleet.getHistory(dev.machineId);
    const latest = hist.length > 0 ? hist[hist.length - 1] : null;
    const grid = $('modbusRegisterGrid');

    grid.innerHTML = '';
    const telemetry = latest ? latest.data : {};

    for (const [code, meta] of Object.entries(WEST_LAKE_REGISTERS)) {
        const val = telemetry[code] !== undefined ? telemetry[code] : meta.base;
        const cell = document.createElement('div');
        cell.className = 'modbus-cell';

        let valDisplay = val;
        let isWarn = false, isCrit = false;

        if (meta.type === 'digital') {
            valDisplay = val === 1 ? 'ACTIVE (1)' : 'OFF (0)';
            if (code === 'AAA0013' && val === 1) isCrit = true;
            if (code === 'AAA0018' && val === 1) isCrit = true;
            if (code === 'AAA0003' && val === 1) isWarn = true;
        } else {
            valDisplay = typeof val === 'number' ? val.toFixed(2) : val;
            if (code === 'AAA0036' && val > 18.0) isCrit = true;
            else if (code === 'AAA0036' && val > 17.0) isWarn = true;
            if (code === 'AAA0028' && val < 5.0) isCrit = true;
            if (code === 'AAA0037' && val < 2.2) isCrit = true;
            if (code === 'AAA0045' && val < 3.8) isWarn = true;
        }

        if (isCrit) cell.classList.add('crit');
        else if (isWarn) cell.classList.add('warn');

        cell.innerHTML = `
            <div class="m-head">
                <span>${code}</span>
                <span>${meta.type.toUpperCase()}</span>
            </div>
            <div class="m-name">${meta.name}</div>
            <div class="m-val">
                ${valDisplay} <span class="m-unit">${meta.unit || ''}</span>
            </div>
        `;
        grid.appendChild(cell);
    }
}

function updateFleetTable() {
    const tbody = $('fleetTableBody');
    tbody.innerHTML = '';
    const activeId = fleet.activeMachineId;

    for (const dev of PRODUCTION_FLEET) {
        const hist = fleet.getHistory(dev.id);
        const latest = hist.length > 0 ? hist[hist.length - 1] : null;
        const status = latest ? latest.status : 'normal';

        const tr = document.createElement('tr');
        if (dev.id === activeId) tr.classList.add('active-row');

        const cop = latest ? latest.cop.toFixed(2) : '-';
        const pwr = latest ? latest.powerKw.toFixed(1) + ' kW' : '-';
        const sup = latest ? latest.chilledSupply.toFixed(1) + ' °C' : '-';
        const hp = latest ? latest.highPressure.toFixed(1) + ' kg' : '-';

        tr.innerHTML = `
            <td>${dev.id}</td>
            <td><b>${dev.name}</b> <span style="color:var(--text-dim)">(${dev.sn})</span></td>
            <td>${dev.type}</td>
            <td><span class="status-dot ${status}"></span> ${status.toUpperCase()}</td>
            <td>${sup}</td>
            <td>${hp}</td>
            <td><b>${cop}</b></td>
            <td>${latest && latest.status !== 'normal' ? '⚠️ 異常中' : '穩健 (0.05)'}</td>
        `;

        tr.addEventListener('click', () => {
            fleet.setActiveMachine(dev.id);
            $('deviceSelect').value = dev.id;
            updateActiveDeviceLabels();
            updateModbusGrid();
            refreshCharts();
        });

        tbody.appendChild(tr);
    }
}

function updateAlarmList() {
    const list = $('alarmList');
    const alarms = ruleEngine.getAlarmHistory(15);
    const countBadge = $('alarmCount');

    if (alarms.length === 0) {
        list.innerHTML = '<div class="empty-state">目前無活躍警報 — 系統運轉指標正常</div>';
        countBadge.style.display = 'none';
        return;
    }

    countBadge.style.display = 'inline-block';
    countBadge.textContent = alarms.length;

    list.innerHTML = '';
    for (const alm of alarms) {
        const item = document.createElement('div');
        item.className = `alarm-item ${alm.severity}`;
        item.innerHTML = `
            <div class="alarm-info">
                <div class="alarm-name">${alm.severity === 'critical' ? '🔴' : '🟡'} ${alm.ruleName}</div>
                <div class="alarm-sub">${alm.machineName} (${alm.serialNumber}) • ${alm.timeLabel}</div>
            </div>
            <button class="pill-btn" style="border-color:var(--border-bright);">預覽推播 ↗</button>
        `;
        item.addEventListener('click', () => openNotificationModal(alm));
        list.appendChild(item);
    }
}

function openNotificationModal(alarm) {
    selectedModalAlarm = alarm;
    $('notificationModal').style.display = 'flex';
    renderModalContent('line');
}

function renderModalContent(channel) {
    if (!selectedModalAlarm) return;
    const alm = selectedModalAlarm;
    const container = $('previewContent');

    if (channel === 'line') {
        container.innerHTML = `
            <div style="background:#06c755; color:#fff; padding:6px 12px; border-radius:4px 4px 0 0; font-weight:bold;">
                LINE Notify / Flex Message
            </div>
            <div style="padding:12px; background:#1e293b; color:#fff; border-radius:0 0 4px 4px; line-height:1.6;">
                <div style="color:${alm.severity === 'critical' ? '#ff6b6b' : '#fcc419'}; font-weight:bold; font-size:14px;">
                    【機房警報通知】${alm.ruleName}
                </div>
                <hr style="border:none; border-top:1px solid #334155; margin:8px 0;" />
                <div><b>設備名稱：</b>${alm.machineName}</div>
                <div><b>設備序號：</b>${alm.serialNumber}</div>
                <div><b>告警時間：</b>${alm.timestamp}</div>
                <div><b>警報層級：</b>${alm.severity.toUpperCase()}</div>
                <div><b>詳細說明：</b>${alm.description}</div>
                <hr style="border:none; border-top:1px solid #334155; margin:8px 0;" />
                <div style="color:#94a3b8; font-size:11px;">Wayne IoT Server Gen 2 自動派發系統</div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="background:#f59e0b; color:#000; padding:6px 12px; border-radius:4px 4px 0 0; font-weight:bold;">
                Flutter App - Firebase Cloud Messaging (FCM)
            </div>
            <div style="padding:12px; background:#1e293b; color:#fff; border-radius:0 0 4px 4px; line-height:1.6;">
                <div style="color:#60a5fa; font-weight:bold;">notification.title: 【IoT 警報】${alm.machineName}</div>
                <div>notification.body: ${alm.ruleName} (${alm.description})</div>
                <pre style="margin-top:8px; background:#0f172a; padding:8px; border-radius:4px; font-size:11px; color:#38d9a9;">
data: {
  "alarm_id": "${alm.id}",
  "machine_id": "${alm.machineId}",
  "rule_code": "${alm.ruleCode}",
  "severity": "${alm.severity}",
  "click_action": "FLUTTER_NOTIFICATION_CLICK"
}</pre>
            </div>
        `;
    }
}

// ── Chart.js Setup ──
function initCharts() {
    // 1. Realtime Telemetry Chart
    const ctxRealtime = $('chartRealtime').getContext('2d');
    chartRealtime = new Chart(ctxRealtime, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '冰水出水溫 (°C)',
                    data: [],
                    borderColor: '#38d9a9',
                    backgroundColor: 'rgba(56, 217, 169, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                },
                {
                    label: '冰水回水溫 (°C)',
                    data: [],
                    borderColor: '#4dabf7',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    tension: 0.3,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8a9bb5', font: { family: 'monospace', size: 10 } },
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8a9bb5', font: { family: 'monospace', size: 10 } },
                },
            },
            plugins: {
                legend: { labels: { color: '#e8eef7', font: { family: 'monospace', size: 11 } } },
            },
        },
    });

    // 2. AI Prediction Chart
    const ctxPred = $('chartPrediction').getContext('2d');
    chartPrediction = new Chart(ctxPred, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Prophet 預測負載 (kW)',
                    data: [],
                    borderColor: '#ffa94d',
                    backgroundColor: 'rgba(255, 169, 77, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: '+1',
                },
                {
                    label: '預測上限 Upper (kW)',
                    data: [],
                    borderColor: 'rgba(255, 169, 77, 0.3)',
                    borderWidth: 1,
                    borderDash: [2, 2],
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: '預測下限 Lower (kW)',
                    data: [],
                    borderColor: 'rgba(255, 169, 77, 0.3)',
                    borderWidth: 1,
                    borderDash: [2, 2],
                    pointRadius: 0,
                    fill: '-1',
                    backgroundColor: 'rgba(255, 169, 77, 0.05)',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8a9bb5', font: { family: 'monospace', size: 10 } },
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8a9bb5', font: { family: 'monospace', size: 10 } },
                },
            },
            plugins: {
                legend: { labels: { color: '#e8eef7', font: { family: 'monospace', size: 11 } } },
            },
        },
    });
}

function updateRealtimeChartLabels() {
    if (!chartRealtime) return;
    if (currentChartMode === 'temp') {
        chartRealtime.data.datasets[0].label = '冰水出水溫 (°C)';
        chartRealtime.data.datasets[0].borderColor = '#38d9a9';
        chartRealtime.data.datasets[1].label = '冰水回水溫 (°C)';
        chartRealtime.data.datasets[1].borderColor = '#4dabf7';
    } else if (currentChartMode === 'pressure') {
        chartRealtime.data.datasets[0].label = '冷媒高壓 (kg/cm²)';
        chartRealtime.data.datasets[0].borderColor = '#ff6b6b';
        chartRealtime.data.datasets[1].label = '冷媒低壓 (kg/cm²)';
        chartRealtime.data.datasets[1].borderColor = '#fcc419';
    } else {
        chartRealtime.data.datasets[0].label = '實體總功率 (kW)';
        chartRealtime.data.datasets[0].borderColor = '#ffa94d';
        chartRealtime.data.datasets[1].label = '即時 COP 能效';
        chartRealtime.data.datasets[1].borderColor = '#69db7c';
    }
}

function refreshCharts() {
    const dev = fleet.getActiveMachine();
    const hist = fleet.getHistory(dev.machineId);
    if (!chartRealtime) return;

    chartRealtime.data.labels = hist.map(s => s.timeLabel);
    if (currentChartMode === 'temp') {
        chartRealtime.data.datasets[0].data = hist.map(s => s.data.AAA0028);
        chartRealtime.data.datasets[1].data = hist.map(s => s.data.AAA0029);
    } else if (currentChartMode === 'pressure') {
        chartRealtime.data.datasets[0].data = hist.map(s => s.data.AAA0036);
        chartRealtime.data.datasets[1].data = hist.map(s => s.data.AAA0037);
    } else {
        chartRealtime.data.datasets[0].data = hist.map(s => s.data.AAA0059);
        chartRealtime.data.datasets[1].data = hist.map(s => s.data.AAA0045);
    }
    chartRealtime.update();

    // AI Prediction
    const preds = predictTrend(hist, 24);
    chartPrediction.data.labels = preds.map(p => p.time);
    chartPrediction.data.datasets[0].data = preds.map(p => p.yhatPower);
    chartPrediction.data.datasets[1].data = preds.map(p => p.yhatUpper);
    chartPrediction.data.datasets[2].data = preds.map(p => p.yhatLower);
    chartPrediction.update();
}

function updateCharts(snapshots) {
    if (tickCounter % 2 === 0) {
        refreshCharts();
    }
}

// ── Startup ──
window.addEventListener('DOMContentLoaded', init);
