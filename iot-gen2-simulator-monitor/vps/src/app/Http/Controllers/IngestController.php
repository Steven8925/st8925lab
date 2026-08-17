<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Carbon\Carbon;

/**
 * IngestController — Gen 2 High-Speed Telemetry Receiver
 * 極速 Ingestion 接收端點：零資料庫鎖、推入 Redis 7 Stream、立即釋放 HTTP 連線
 */
class IngestController extends Controller
{
    public function ingest($company_id, $serial_number, Request $request)
    {
        $t0 = microtime(true);
        $payload = $request->json()->all();

        if (empty($payload)) {
            return response()->json([
                'status' => 'bad_request',
                'code' => 400,
                'message' => 'Empty telemetry payload.'
            ], 400);
        }

        $meta = $request->attributes->get('machine_meta');
        $machineId = $meta ? (int)$meta['id'] : null;
        $now = Carbon::now()->toIso8601String();

        // 1. Structure Stream Message
        $streamEntry = [
            'machine_id'    => (string)$machineId,
            'cid'           => (string)$company_id,
            'serial_number' => $serial_number,
            'received_at'   => $now,
            'payload'       => json_encode($payload['data'] ?? $payload),
        ];

        // 2. Append to Redis 7 Stream (XADD takes < 0.5ms)
        Redis::xadd('iot_stream:incoming', '*', $streamEntry);

        // 3. Update realtime snapshot in Redis for sub-millisecond dashboard queries
        $realtimeKey = "realtime_telemetry:{$machineId}";
        Redis::setex($realtimeKey, 300, json_encode([
            'machine_id' => $machineId,
            'serial_number' => $serial_number,
            'updated_at' => $now,
            'data' => $payload['data'] ?? $payload,
        ]));

        $elapsedMs = round((microtime(true) - $t0) * 1000, 2);

        // 4. Return instant 200 Buffered response
        return response()->json([
            'status'        => 'buffered',
            'code'          => 200,
            'machine_id'    => $machineId,
            'serial_number' => $serial_number,
            'server_time'   => $now,
            'latency_ms'    => $elapsedMs,
            'message'       => 'Telemetry buffered to in-memory stream for batch TimescaleDB insert.'
        ], 200);
    }
}
