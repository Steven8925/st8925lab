// st8925lab Worker — /api/* 入口 / entry point for /api/* (Phase 1 Stage A, 2026-09-23)
//
// wrangler.jsonc 的 run_worker_first 只把 /api/* 送進這裡；其他路徑由靜態資產直接回應。
// 保底分支仍轉交 env.ASSETS，確保萬一路由設定改變時網站頁面照常可用。
// Only /api/* is routed here (run_worker_first in wrangler.jsonc); every other path is
// served by static assets directly. The final fallback still hands off to env.ASSETS so
// pages keep working even if the routing config changes.

// 安全標頭：值與 _headers 逐字一致（_headers 只作用於靜態資產，碰不到 /api/*，
// 所以必須在這裡另外設）。CSP 用最嚴格版本：JSON 回應不需要載入任何資源。
// Security headers, values copied verbatim from _headers. _headers applies to static
// assets only and never reaches /api/*, so they must be set here as well. The CSP is
// the strictest form, because a JSON response has no reason to load anything.
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-permitted-cross-domain-policies': 'none',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};

// NVIDIA 對話端點：探測送一次 max_tokens=1 的最小請求。
// 2026-09-26（S-31）：原本打 /v1/models，但那個端點連假金鑰都回 200，
// 所以「valid: true」什麼都沒證明。對話端點會拒絕無效金鑰（實測假金鑰 403），
// 每次成本約 1 個 token；探測本身仍由 PROBE_TOKEN 把關，外人無法觸發。
// NVIDIA chat endpoint: the probe sends one minimal request (max_tokens=1).
// 2026-09-26 (S-31): this used to call /v1/models, which answers 200 even for a fake
// key, so "valid: true" proved nothing. The chat endpoint rejects bad keys (a fake
// key measured 403). Cost is about one token per probe, and the probe is still gated
// by PROBE_TOKEN, so outsiders cannot trigger it.
const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
// 與 render.yaml 的 NVIDIA_CHAT_MODEL 相同；Worker 有設同名變數時以變數為準。
// Same as NVIDIA_CHAT_MODEL in render.yaml; a Worker variable of that name wins.
const NVIDIA_PROBE_MODEL = 'nvidia/nemotron-3-super-120b-a12b';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// ⬇ 新增：probe 的授權判斷
// 必須同時滿足 GET + ?probe=1 + 正確的 x-probe-token 標頭。
// 任一條件不符就「靜默忽略」——回一般健康檢查結果，不回 401，
// 避免對外洩漏此端點存在、也沒有可供暴力嘗試的目標。
// PROBE_TOKEN 未設定時一律關閉（fail closed）。
// The probe requires GET + ?probe=1 + a matching x-probe-token header.
// Anything else is silently ignored — the plain health response is returned rather
// than a 401, so the endpoint gives nothing away. Unset PROBE_TOKEN fails closed.
function isProbeAuthorized(request, url, env) {
  if (request.method !== 'GET') return false;
  if (url.searchParams.get('probe') !== '1') return false;
  if (!env.PROBE_TOKEN) return false;
  return request.headers.get('x-probe-token') === env.PROBE_TOKEN;
}

// 拿執行期金鑰實際送一次請求，只回報 HTTP 狀態碼。
// 絕不回傳金鑰、回應內容或錯誤細節。
// valid：200 = true；401／403 = false；其他狀態（例如模型已退役的 404）= null，
// 因為那代表「無法判定」，不代表金鑰無效。
// Sends one real request with the runtime key; reports only the HTTP status.
// Never returns the key, the response body, or error details.
// valid: 200 = true; 401/403 = false; any other status (e.g. 404 for a retired model)
// = null, because that means "cannot tell", not "the key is bad".
async function probeNvidia(env) {
  if (!env.NVIDIA_API_KEY) {
    return { configured: false, reason: 'not_configured' };
  }
  const model = env.NVIDIA_CHAT_MODEL || NVIDIA_PROBE_MODEL;
  try {
    const res = await fetch(NVIDIA_CHAT_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.NVIDIA_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 200) return { configured: true, status: 200, valid: true, model };
    if (res.status === 401 || res.status === 403) {
      return { configured: true, status: res.status, valid: false, model };
    }
    return { configured: true, status: res.status, valid: null, reason: 'inconclusive', model };
  } catch {
    return { configured: true, status: null, valid: null, reason: 'unreachable', model };
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

      // ⬇ 改動：從「帶 ?probe=1 就跑」改為「通過授權才跑」
      if (isProbeAuthorized(request, url, env)) {
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