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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
      }
      return jsonResponse({ ok: true, service: 'st8925lab-api', time: new Date().toISOString() });
    }

    if (pathname.startsWith('/api/')) {
      return jsonResponse({ ok: false, error: 'not_found' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
