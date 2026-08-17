<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

/**
 * DynamicRuleEngine — Data-Driven Alarm Rule Evaluator (Gen 2)
 * 取代舊版 3,151 行硬編碼 PHP if-else，支援 JSON 條件解析、冷卻水溫差等衍生計算與熱更新
 */
class DynamicRuleEngine
{
    protected array $cachedRules = [];
    protected array $machineMetaMap = [];
    protected NotificationService $notifier;

    public function __construct(NotificationService $notifier)
    {
        $this->notifier = $notifier;
        $this->loadRules();
    }

    /**
     * Load active rules from PostgreSQL / Redis Cache
     */
    public function loadRules(): void
    {
        $rules = DB::table('alarm_rules')
            ->where('is_active', true)
            ->get()
            ->map(function ($r) {
                return [
                    'id'               => $r->id,
                    'machine_id'       => $r->machine_id,
                    'rule_code'        => $r->rule_code,
                    'rule_name'        => $r->rule_name,
                    'severity'         => $r->severity,
                    'duration_seconds' => $r->duration_seconds,
                    'condition'        => json_decode($r->condition_json, true),
                ];
            })
            ->toArray();

        $this->cachedRules = $rules;
    }

    /**
     * Enrich sensor payload with computed physical variables
     */
    protected function enrichPayload(array $data): array
    {
        $enriched = $data;

        // 冷卻水溫差 (Condenser Delta T)
        if (isset($data['AAA0030']) && isset($data['AAA0031'])) {
            $enriched['_computed_cond_delta'] = round(abs((float)$data['AAA0030'] - (float)$data['AAA0031']), 2);
        }

        // 冰水出回水溫差 (Chilled Delta T)
        if (isset($data['AAA0029']) && isset($data['AAA0028'])) {
            $enriched['_computed_chilled_delta'] = round(abs((float)$data['AAA0029'] - (float)$data['AAA0028']), 2);
        }

        // 高低壓比 (Compression Ratio)
        if (isset($data['AAA0036']) && isset($data['AAA0037']) && (float)$data['AAA0037'] > 0) {
            $enriched['_computed_pressure_ratio'] = round((float)$data['AAA0036'] / (float)$data['AAA0037'], 2);
        }

        return $enriched;
    }

    /**
     * Evaluate single condition
     */
    protected function evalCondition(array $cond, array $data): bool
    {
        $field = $cond['field'] ?? null;
        if (!$field || !isset($data[$field])) {
            return false;
        }

        $val = (float)$data[$field];
        $target = (float)$cond['value'];
        $op = $cond['op'];

        switch ($op) {
            case '>':  return $val > $target;
            case '>=': return $val >= $target;
            case '<':  return $val < $target;
            case '<=': return $val <= $target;
            case '==': return $val == $target;
            case '!=': return $val != $target;
            default:   return false;
        }
    }

    /**
     * Evaluate condition group (AND / OR)
     */
    protected function evalGroup(array $group, array $data): bool
    {
        $op = $group['operator'] ?? 'AND';
        $conditions = $group['conditions'] ?? [];
        $results = [];

        foreach ($conditions as $c) {
            if (isset($c['operator']) && isset($c['conditions'])) {
                $results[] = $this->evalGroup($c, $data);
            } else {
                $results[] = $this->evalCondition($c, $data);
            }
        }

        if ($op === 'AND') {
            return !in_array(false, $results, true);
        }
        if ($op === 'OR') {
            return in_array(true, $results, true);
        }

        return false;
    }

    /**
     * Evaluate incoming telemetry for a machine
     */
    public function evaluate(int $machineId, int $cid, array $rawPayload): void
    {
        $data = $this->enrichPayload($rawPayload);

        foreach ($this->cachedRules as $rule) {
            // Check machine scope (NULL applies to all machines)
            if ($rule['machine_id'] !== null && (int)$rule['machine_id'] !== $machineId) {
                continue;
            }

            if ($this->evalGroup($rule['condition'], $data)) {
                $this->triggerAlarm($machineId, $cid, $rule, $data);
            }
        }
    }

    /**
     * Trigger alarm, insert record, and dispatch async notifications
     */
    protected function triggerAlarm(int $machineId, int $cid, array $rule, array $enrichedData): void
    {
        // 1. Debounce / Anti-Flapping check via Redis (10 minutes cooldown per rule)
        $cooldownKey = "alarm_cooldown:{$machineId}:{$rule['rule_code']}";
        if (Redis::get($cooldownKey)) {
            return;
        }
        Redis::setex($cooldownKey, 600, '1');

        // 2. Extract trigger values for fields in condition
        $triggerValues = [];
        foreach ($rule['condition']['conditions'] ?? [] as $c) {
            $f = $c['field'] ?? null;
            if ($f && isset($enrichedData[$f])) {
                $triggerValues[$f] = $enrichedData[$f];
            }
        }

        // 3. Insert alarm_records into PostgreSQL
        $recordId = DB::table('alarm_records')->insertGetId([
            'machine_id'     => $machineId,
            'cid'            => $cid,
            'rule_id'        => $rule['id'],
            'rule_code'      => $rule['rule_code'],
            'severity'       => $rule['severity'],
            'trigger_values' => json_encode($triggerValues),
            'created_at'     => now(),
        ]);

        // 4. Dispatch Async Notifications via Redis Queue
        $this->notifier->dispatch(
            $machineId,
            $cid,
            $rule['rule_name'],
            $rule['severity'],
            $triggerValues
        );
    }
}
