<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\DynamicRuleEngine;

/**
 * IotBatchWorker — Redis Stream Consumer & TimescaleDB Batch Ingester
 * 背景守護進程：每 500ms 批次自 Redis Stream 讀取遙測數據，批次寫入 TimescaleDB 並評估動態規則
 */
class IotBatchWorker extends Command
{
    protected $signature = 'iot:worker';
    protected $description = 'Consume Redis Stream and batch insert to TimescaleDB with dynamic rule evaluation';

    public function handle(DynamicRuleEngine $ruleEngine)
    {
        $this->info("🚀 Wayne IoT Gen 2 Stream Worker Started (PID: " . getmypid() . ")");
        $stream = 'iot_stream:incoming';
        $group = 'timescale_consumers';
        $consumer = 'worker_' . getmypid();

        // 1. Create Consumer Group if not exists
        try {
            Redis::xgroup('CREATE', $stream, $group, '0', 'MKSTREAM');
        } catch (\Exception $e) {
            // Group already exists
        }

        $batchSize = 200;
        $blockMs = 500;

        while (true) {
            try {
                // 2. Read Batch from Redis Stream
                $entries = Redis::xreadgroup($group, $consumer, [$stream => '>'], $batchSize, $blockMs);

                if (empty($entries) || !isset($entries[$stream]) || empty($entries[$stream])) {
                    usleep(50000); // 50ms idle sleep
                    continue;
                }

                $messages = $entries[$stream];
                $insertRows = [];
                $ackIds = [];

                foreach ($messages as $msgId => $fields) {
                    $ackIds[] = $msgId;

                    $machineId = (int)($fields['machine_id'] ?? 0);
                    $cid = (int)($fields['cid'] ?? 1);
                    $receivedAt = $fields['received_at'] ?? now()->toIso8601String();
                    $payloadRaw = json_decode($fields['payload'] ?? '{}', true);

                    if ($machineId > 0 && !empty($payloadRaw)) {
                        $insertRows[] = [
                            'time'       => $receivedAt,
                            'machine_id' => $machineId,
                            'cid'        => $cid,
                            'payload'    => json_encode($payloadRaw),
                            'created_at' => now(),
                        ];

                        // 3. Evaluate dynamic rules in memory
                        $ruleEngine->evaluate($machineId, $cid, $payloadRaw);
                    }
                }

                // 4. Batch Insert into TimescaleDB Hypertable
                if (!empty($insertRows)) {
                    DB::table('sensor_data')->insert($insertRows);
                }

                // 5. Acknowledge messages in Stream
                if (!empty($ackIds)) {
                    Redis::xack($stream, $group, $ackIds);
                }

            } catch (\Exception $e) {
                Log::error("IotBatchWorker Exception: " . $e->getMessage());
                sleep(1);
            }
        }
    }
}
