<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\IngestController;
use App\Http\Controllers\DashboardController;
use App\Http\Middleware\DeviceTokenAuth;

/*
|--------------------------------------------------------------------------
| Wayne IoT Server Gen 2 API Routes
|--------------------------------------------------------------------------
*/

// =========================================================================
// 1. Ultra-Fast IoT Ingestion Endpoint (極速接收通道)
//    - 無全域限流 (Throttle 移至邊緣或單一 Token 限流)
//    - 無 Session、無 CSRF
//    - 寫入 Redis 7 Stream 即刻返回 200 OK (< 20ms)
// =========================================================================
Route::post('/iot/{company_id}/{serial_number}/ingest', [IngestController::class, 'ingest'])
    ->middleware(DeviceTokenAuth::class);

// =========================================================================
// 2. Health & Monitoring Endpoints (系統健康檢查與指標)
// =========================================================================
Route::get('/health', [DashboardController::class, 'health']);
Route::get('/metrics', [DashboardController::class, 'metrics']);

// =========================================================================
// 3. Telemetry & Continuous Aggregations History (高頻監控與歷史趨勢查詢)
// =========================================================================
Route::prefix('/telemetry')->group(function () {
    // 取得即時案場 21 台機隊狀態
    Route::get('/fleet/status', [DashboardController::class, 'getFleetStatus']);
    
    // 取得特定主機最新即時點位 (自 Redis 快取讀取 < 1ms)
    Route::get('/machines/{machine_id}/realtime', [DashboardController::class, 'getMachineRealtime']);
    
    // 取得歷史聚合趨勢數據 (自 TimescaleDB Continuous View 讀取 < 10ms)
    Route::get('/machines/{machine_id}/history', [DashboardController::class, 'getMachineHourlyHistory']);
    
    // 取得告警事件列表
    Route::get('/alarms', [DashboardController::class, 'getAlarms']);
    Route::post('/alarms/{alarm_id}/ack', [DashboardController::class, 'acknowledgeAlarm']);
});
