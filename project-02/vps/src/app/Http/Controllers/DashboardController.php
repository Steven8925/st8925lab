<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

/**
 * DashboardController — Telemetry & Continuous Aggregations API
 * 高頻監控與歷史趨勢查詢：從 Redis 讀取即時數據，從 TimescaleDB Continuous View 讀取歷史趨勢
 */
class DashboardController extends Controller
{
    public function health()
    {
        return response()->json([
            'status' => 'healthy',
            'service' => 'Wayne IoT Server Gen 2 (Production VPS)',
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function metrics()
    {
        $streamLen = Redis::xlen('iot_stream:incoming');
        $dbCount = DB::table('sensor_data')->count();

        return response()->json([
            'stream_queue_depth' => $streamLen,
            'total_sensor_records' => $dbCount,
            'server_load' => sys_getloadavg(),
        ]);
    }

    public function getFleetStatus()
    {
        $machines = DB::table('machines')
            ->join('companies', 'machines.company_id', '=', 'companies.id')
            ->select('machines.id', 'machines.name', 'machines.serial_number', 'machines.model', 'machines.device_type', 'companies.name as company_name')
            ->where('machines.is_active', true)
            ->get();

        $result = [];
        foreach ($machines as $m) {
            $cached = Redis::get("realtime_telemetry:{$m->id}");
            $telemetry = $cached ? json_decode($cached, true) : null;

            $result[] = [
                'id'            => $m->id,
                'name'          => $m->name,
                'serial_number' => $m->serial_number,
                'company'       => $m->company_name,
                'model'         => $m->model,
                'type'          => $m->device_type,
                'last_updated'  => $telemetry['updated_at'] ?? null,
                'latest_data'   => $telemetry['data'] ?? null,
            ];
        }

        return response()->json($result);
    }

    public function getMachineRealtime($machine_id)
    {
        $cached = Redis::get("realtime_telemetry:{$machine_id}");
        if ($cached) {
            return response()->json(json_decode($cached, true));
        }

        $latest = DB::table('sensor_data')
            ->where('machine_id', $machine_id)
            ->orderBy('time', 'DESC')
            ->first();

        return response()->json($latest ? [
            'machine_id' => $latest->machine_id,
            'updated_at' => $latest->time,
            'data' => json_decode($latest->payload, true),
        ] : ['message' => 'No telemetry found']);
    }

    public function getMachineHourlyHistory($machine_id, Request $request)
    {
        $days = (int)$request->input('days', 7);
        $sDate = now()->subDays($days);

        // Query TimescaleDB Continuous Aggregate View (< 10ms execution)
        $history = DB::table('sensor_hourly_summary')
            ->where('machine_id', $machine_id)
            ->where('bucket', '>=', $sDate)
            ->orderBy('bucket', 'ASC')
            ->get();

        return response()->json([
            'machine_id' => $machine_id,
            'days' => $days,
            'points_count' => count($history),
            'records' => $history,
        ]);
    }

    public function getAlarms()
    {
        $alarms = DB::table('alarm_records')
            ->join('machines', 'alarm_records.machine_id', '=', 'machines.id')
            ->select('alarm_records.*', 'machines.name as machine_name', 'machines.serial_number')
            ->orderBy('alarm_records.created_at', 'DESC')
            ->limit(100)
            ->get();

        return response()->json($alarms);
    }

    public function acknowledgeAlarm($alarm_id, Request $request)
    {
        $user = $request->input('user', 'Operator');
        DB::table('alarm_records')
            ->where('id', $alarm_id)
            ->update([
                'is_acknowledged' => true,
                'acknowledged_by' => $user,
                'acknowledged_at' => now(),
            ]);

        return response()->json(['status' => 'acknowledged', 'alarm_id' => $alarm_id]);
    }
}
