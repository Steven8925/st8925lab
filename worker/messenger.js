// ===============================================================
//  st8925lab Worker — SECURE MESSENGER & CHATOPS API Module
//  Handles: /api/status, /api/messages, /api/ai, /api/telegram, /api/telemetry
// ===============================================================

function getCleanSupabaseUrl(env) {
  const raw = (env.SUPABASE_URL || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return raw.replace(/\/+$/, '');
  }
}

function getNimKey(env) {
  return (env.NVIDIA_NIM_API_KEY || env.NVIDIA_API_KEY || '').trim();
}

function sbHeaders(anonKey, prefer = '') {
  const h = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  };
  if (prefer) h.Prefer = prefer;
  return h;
}

async function checkSupabase(env) {
  const sbUrl = getCleanSupabaseUrl(env);
  const sbKey = (env.SUPABASE_ANON_KEY || '').trim();
  if (!sbUrl || !sbKey) return { configured: false, reachable: false, tableReady: false };
  try {
    const r = await fetch(`${sbUrl}/rest/v1/st8925_messages?select=id&limit=1`, {
      headers: sbHeaders(sbKey),
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 200) return { configured: true, reachable: true, tableReady: true };
    if (r.status === 400 || r.status === 404) return { configured: true, reachable: true, tableReady: false };
  } catch {}
  return { configured: true, reachable: false, tableReady: false };
}

async function sbInsertMessage(msg, env) {
  const sbUrl = getCleanSupabaseUrl(env);
  const sbKey = (env.SUPABASE_ANON_KEY || '').trim();
  if (!sbUrl || !sbKey) return false;

  const ts = Number(msg.timestamp || Date.now());
  const base = {
    id: String(msg.id),
    channel: String(msg.channel || 'A'),
    sender: String(msg.sender || 'ANON'),
    role: String(msg.role || 'USER'),
    timestamp: ts,
  };
  const candidates = [
    { ...base, e2ee: Boolean(msg.e2ee), payload: msg },
    {
      ...base,
      encrypted: Boolean(msg.e2ee || msg.encrypted),
      text: msg.text || null,
      ciphertext: msg.ciphertext || null,
      iv: msg.iv || null,
      attachment: msg.attachment || msg.file || null,
      meta: msg,
    },
  ];
  for (const row of candidates) {
    try {
      const r = await fetch(`${sbUrl}/rest/v1/st8925_messages`, {
        method: 'POST',
        headers: sbHeaders(sbKey, 'resolution=merge-duplicates,return=minimal'),
        body: JSON.stringify(row),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) return true;
    } catch {}
  }
  return false;
}

async function sbFetchMessages(env, since = 0, channel = null) {
  const sbUrl = getCleanSupabaseUrl(env);
  const sbKey = (env.SUPABASE_ANON_KEY || '').trim();
  if (!sbUrl || !sbKey) return [];
  const chFilter = channel ? `&channel=eq.${encodeURIComponent(channel)}` : '';
  const query = `select=*&timestamp=gt.${Number(since)}${chFilter}&order=timestamp.asc&limit=100`;
  try {
    const r = await fetch(`${sbUrl}/rest/v1/st8925_messages?${query}`, {
      headers: sbHeaders(sbKey),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const rows = await r.json();
    return rows.map((x) => x.payload || x.meta).filter(Boolean);
  } catch {
    return [];
  }
}

async function handleAiRoute(body, env) {
  const apiKey = getNimKey(env);
  const textModel = env.NVIDIA_NIM_TEXT_MODEL || env.NVIDIA_CHAT_MODEL || 'nvidia/nemotron-3-super-120b-a12b';
  const visionModel = env.NVIDIA_NIM_VISION_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b';
  const baseUrl = (env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
  const prompt = body.prompt || '';
  const channel = body.channel || 'A';
  const imgUrl = body.imageDataUrl || '';
  const hasImage = Boolean(imgUrl && imgUrl.startsWith('data:image/'));
  const selectedModel = hasImage ? visionModel : textModel;
  const routeType = hasImage ? 'VISION_MULTIMODAL_ROUTE' : 'TEXT_FAST_ROUTE';

  if (!apiKey) {
    return {
      provider: 'LOCAL_KB_ENGINE',
      model: selectedModel,
      route: routeType,
      reply: `🤖 [Cloudflare Fallback] 已收到：「${prompt}」`,
    };
  }
  const messages = [
    {
      role: 'system',
      content:
        '你是 Maru，ST8925 LAB 嵌入式安全即時通訊與戰情中樞 (SECURE MESSENGER & CHATOPS) 的駐站資深架構與資安 AI 顧問。請以繁體中文簡潔專業回答。',
    },
  ];
  for (const h of (body.history || []).slice(-5)) {
    messages.push({ role: 'user', content: `${h.sender || 'USER'}: ${h.text || ''}` });
  }
  const userContent = hasImage
    ? [
        { type: 'text', text: prompt || '請分析這張上傳的截圖或架構圖。' },
        { type: 'image_url', image_url: { url: imgUrl } },
      ]
    : prompt;
  messages.push({ role: 'user', content: userContent });

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: hasImage ? 0.6 : 1.0,
        top_p: 0.95,
        max_tokens: 1024,
        chat_template_kwargs: { enable_thinking: Boolean(channel === 'C' || prompt.includes('/diag')) },
      }),
      signal: AbortSignal.timeout(25000),
    });
    // NIM 回 4xx／5xx 或空內容時，改走下方備援，不回空字串的 NVIDIA_NIM 回覆。
    // On a 4xx/5xx or empty content, fall through to the fallback below.
    if (!r.ok) throw new Error(`nim_http_${r.status}`);
    const data = await r.json();
    const msgObj = data?.choices?.[0]?.message || {};
    const reply = (msgObj.content || msgObj.reasoning_content || '').trim();
    if (!reply) throw new Error('nim_empty_reply');
    return {
      provider: 'NVIDIA_NIM',
      model: selectedModel,
      route: routeType,
      reply,
    };
  } catch {
    return {
      provider: 'LOCAL_KB_FALLBACK',
      model: selectedModel,
      route: routeType,
      reply: `🤖 [備援回覆] 已收到提問：「${prompt}」`,
    };
  }
}

async function handleTelegramRoute(body, env) {
  const rawTok = (env.TELEGRAM_BOT_TOKEN || '').trim();
  const token = rawTok.toLowerCase().startsWith('bot') && rawTok.includes(':') ? rawTok.slice(3) : rawTok;
  const chatId = (env.TELEGRAM_CHAT_ID || '').trim();
  const text = `🛡️ [ST8925 LAB | ${body.severity || 'INFO'}]\n來源: ${body.source || 'ST8925_MESSENGER'}\n內容: ${body.message || ''}`;
  if (!token || !chatId) return { ok: true, delivered: false, mode: 'LOCAL_AUDIT_SIMULATED' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) return { ok: true, delivered: true, mode: 'TELEGRAM_CLOUD_DELIVERED' };
  } catch {}
  return { ok: true, delivered: false, mode: 'LOCAL_AUDIT_SIMULATED' };
}

export async function handleMessengerApi(request, url, env, jsonResponse) {
  const path = url.pathname;

  if (request.method === 'GET' && path === '/api/status') {
    const sb = await checkSupabase(env);
    const textModel = env.NVIDIA_NIM_TEXT_MODEL || env.NVIDIA_CHAT_MODEL || 'nvidia/nemotron-3-super-120b-a12b';
    const visionModel = env.NVIDIA_NIM_VISION_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b';
    return jsonResponse({
      ok: true,
      mode: sb.reachable ? 'SUPABASE_CLOUD_SYNC' : 'CLOUDFLARE_EDGE_ACTIVE',
      nimConfigured: Boolean(getNimKey(env)),
      nimModel: textModel,
      nimTextModel: textModel,
      nimVisionModel: visionModel,
      telegramConfigured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
      supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
      supabaseStatus: sb,
    });
  }

  if (request.method === 'GET' && path === '/api/messages') {
    const since = Number(url.searchParams.get('since') || 0);
    const channel = url.searchParams.get('channel') || null;
    const messages = await sbFetchMessages(env, since, channel);
    return jsonResponse({ ok: true, messages });
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (path === '/api/messages') {
      const msg = { id: body.id || `cf_${Date.now()}`, timestamp: body.timestamp || Date.now(), ...body };
      const cloudPersisted = await sbInsertMessage(msg, env);
      return jsonResponse({ ok: true, cloudPersisted, message: msg });
    }
    if (path === '/api/ai') {
      return jsonResponse({ ok: true, ...(await handleAiRoute(body, env)) });
    }
    if (path === '/api/telegram') {
      return jsonResponse(await handleTelegramRoute(body, env));
    }
    if (path === '/api/telemetry') {
      const msg = {
        id: `tele_${Date.now()}`,
        timestamp: Date.now(),
        channel: 'C',
        sender: body.project || 'EXTERNAL_SYSTEM',
        role: 'telemetry',
        severity: body.severity || 'INFO',
        text: `🚨 **[${body.severity || 'INFO'}] ${body.project || 'SYSTEM'}**\n• **事件**：${body.title || 'Event'}\n• **指標**：\`${body.metrics || 'N/A'}\``,
      };
      const cloudPersisted = await sbInsertMessage(msg, env);
      return jsonResponse({ ok: true, cloudPersisted, event: msg });
    }
  }

  return null;
}
