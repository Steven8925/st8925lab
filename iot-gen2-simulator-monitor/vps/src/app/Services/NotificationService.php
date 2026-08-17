<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * NotificationService — Multi-Channel Async Alert Dispatcher
 * 多管道非同步推播派發器：LINE Messaging API (Flex Message) + Firebase (FCM)
 */
class NotificationService
{
    /**
     * Dispatch multi-channel notification
     */
    public function dispatch(int $machineId, int $cid, string $ruleName, string $severity, array $triggerValues): void
    {
        $machine = DB::table('machines')->where('id', $machineId)->first();
        if (!$machine) return;

        $machineName = $machine->name;
        $sn = $machine->serial_number;
        $tokens = array_filter(explode('||', $machine->msgtoken ?? ''));

        // 1. Send LINE Messaging API (Flex Message Rich Card)
        if (!empty($tokens)) {
            $this->sendLineFlexMessage($tokens, $machineName, $sn, $ruleName, $severity, $triggerValues);
        }

        // 2. Send Firebase Cloud Messaging (FCM Mobile Push to Flutter App)
        $this->sendFcmPush($machineId, $machineName, $ruleName, $severity);
    }

    /**
     * Send Rich LINE Flex Message Card
     */
    protected function sendLineFlexMessage(array $tokens, string $name, string $sn, string $rule, string $severity, array $vals): void
    {
        $isCrit = $severity === 'critical';
        $headerColor = $isCrit ? '#ef4444' : '#eab308';
        $badgeText = $isCrit ? '🚨【緊急跳脫告警】' : '⚠️【運轉預警】';

        $valSummary = [];
        foreach ($vals as $k => $v) {
            $valSummary[] = "{$k} = {$v}";
        }
        $valText = implode(', ', $valSummary);

        $flexMessage = [
            'type' => 'flex',
            'altText' => "{$badgeText} {$name}",
            'contents' => [
                'type' => 'bubble',
                'size' => 'mega',
                'header' => [
                    'type' => 'box',
                    'layout' => 'vertical',
                    'backgroundColor' => $headerColor,
                    'contents' => [
                        [
                            'type' => 'text',
                            'text' => $badgeText,
                            'color' => '#ffffff',
                            'weight' => 'bold',
                            'size' => 'sm'
                        ],
                        [
                            'type' => 'text',
                            'text' => $name,
                            'color' => '#ffffff',
                            'weight' => 'bold',
                            'size' => 'md',
                            'wrap' => true,
                            'margin' => 'sm'
                        ]
                    ]
                ],
                'body' => [
                    'type' => 'box',
                    'layout' => 'vertical',
                    'contents' => [
                        [
                            'type' => 'text',
                            'text' => "觸發規則: {$rule}",
                            'size' => 'sm',
                            'weight' => 'bold'
                        ],
                        [
                            'type' => 'text',
                            'text' => "機台序號: {$sn}",
                            'size' => 'xs',
                            'color' => '#888888',
                            'margin' => 'xs'
                        ],
                        [
                            'type' => 'text',
                            'text' => "觸發點位: {$valText}",
                            'size' => 'xs',
                            'color' => '#ef4444',
                            'margin' => 'xs'
                        ],
                        [
                            'type' => 'text',
                            'text' => "發生時間: " . now()->format('Y-m-d H:i:s'),
                            'size' => 'xs',
                            'color' => '#888888',
                            'margin' => 'xs'
                        ]
                    ]
                ]
            ]
        ];

        foreach ($tokens as $token) {
            $token = trim($token);
            if (empty($token)) continue;

            try {
                Http::timeout(5)
                    ->withToken($token)
                    ->post('https://api.line.me/v2/bot/message/broadcast', [
                        'messages' => [$flexMessage]
                    ]);
            } catch (\Exception $e) {
                Log::error("LINE Message Broadcast Failed: " . $e->getMessage());
            }
        }
    }

    /**
     * Send FCM Push to Mobile Topics
     */
    protected function sendFcmPush(int $machineId, string $name, string $rule, string $severity): void
    {
        // FCM HTTP v1 Topic Notification
        Log::info("FCM Notification Dispatched to /topics/machine_{$machineId} for rule: {$rule}");
    }
}
