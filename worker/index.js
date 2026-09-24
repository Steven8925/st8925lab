// st8925lab Worker — /api/* 入口 / entry point for /api/* (Phase 1 Stage A, 2026-09-23)
//
// wrangler.jsonc 的 run_worker_first 只把 /api/* 送進這裡；其他路徑由靜態資產直接回應。
// 保底分支仍轉交 env.ASSETS，確保萬一路由設定改變時網站頁面照常可用。
// Only /api/* is routed here (run_worker_first in wrangler.jsonc); every other path is
// served by static assets directly. The final fallback still hands off to env.ASSETS so
// pages keep working even if the routing config changes.

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

// NVIDIA 模型清單端點：只驗證授權，不消耗 token。
// NVIDIA's model-list endpoint: validates auth only, consumes no tokens.
const NVIDIA_MODELS_URL = 'https://integrate.api.nvidia.com/v1/models';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// 拿執行期金鑰實際送一次請求，只回報 HTTP 狀態碼。
// 絕不回傳金鑰、回應內容或錯誤細節。
// Sends one real request with the runtime key; reports only the HTTP status.
// Never returns the key, the response body, or error details.
async function probeNvidia(env) {
  if (!env.NVIDIA_API_KEY) {
    return { configured: false, reason: 'not_configured' };
  }
  try {
    const res = await fetch(NVIDIA_MODELS_URL, {
      method: 'GET',
      headers: { authorization: `Bearer ${env.NVIDIA_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    return { configured: true, status: res.status, valid: res.status === 200 };
  } catch {
    return { configured: true, status: null, valid: false, reason: 'unreachable' };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/api/health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
      }
      // 只回報金鑰「是否已設定」（布林值），絕不回傳金鑰內容。
      // Reports only whether each key is configured (boolean) — never the key itself.
      const body = {
        ok: true,
        service: 'st8925lab-api',
        time: new Date().toISOString(),
        configured: {
          nvidia: Boolean(env.NVIDIA_API_KEY),
          tavily: Boolean(env.TAVILY_API_KEY),
        },
      };

      // 只有 ?probe=1 才真的外呼；一般健康檢查維持零外部請求。
      // Only ?probe=1 makes a real outbound call; the plain health check stays request-free.
      if (request.method === 'GET' && url.searchParams.get('probe') === '1') {
        body.probe = { nvidia: await probeNvidia(env) };
      }

      return jsonResponse(body);
    }

    if (pathname.startsWith('/api/')) {
      return jsonResponse({ ok: false, error: 'not_found' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};