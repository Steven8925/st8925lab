<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\DB;

/**
 * DeviceTokenAuth — High-Speed Token Validator via Redis
 * 透過 Redis 記憶體快取秒級驗證設備 Token，避免查詢資料庫
 */
class DeviceTokenAuth
{
    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization');
        $token = null;

        if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = trim($matches[1]);
        } elseif ($request->has('token')) {
            $token = $request->input('token');
        }

        $cid = (int)$request->route('company_id');
        $sn = $request->route('serial_number');

        if (!$token || !$cid || !$sn) {
            return response()->json([
                'status' => 'unauthorized',
                'code' => 401,
                'message' => 'Missing authorization token or device credentials.'
            ], 401);
        }

        // 1. Check Redis memory cache for machine metadata (TTL: 24h)
        $cacheKey = "device_meta:{$cid}:{$sn}";
        $cachedMeta = Redis::get($cacheKey);

        if (!$cachedMeta) {
            // Cache miss: query PostgreSQL metadata table
            $machine = DB::table('machines')
                ->where('company_id', $cid)
                ->where('serial_number', $sn)
                ->where('is_active', true)
                ->select('id', 'company_id', 'serial_number', 'token', 'model')
                ->first();

            if (!$machine) {
                return response()->json([
                    'status' => 'not_found',
                    'code' => 404,
                    'message' => 'Device not registered in Wayne IoT platform.'
                ], 404);
            }

            $cachedMeta = json_encode($machine);
            Redis::setex($cacheKey, 86400, $cachedMeta);
        }

        $meta = json_decode($cachedMeta, true);

        // 2. Fast token comparison (Support master test token or per-device token)
        if ($token !== $meta['token'] && $token !== 'Wayne_Master_Secret_Token_2026') {
            return response()->json([
                'status' => 'forbidden',
                'code' => 403,
                'message' => 'Invalid device authentication token.'
            ], 403);
        }

        // Attach machine metadata to request for downstream controller
        $request->attributes->set('machine_meta', $meta);

        return $next($request);
    }
}
