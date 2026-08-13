import type { OutgoingHttpHeaders } from "node:http";
import type { FastifyRequest } from "fastify";
import { corsOrigins } from "../config.js";

/**
 * Response headers for a server-sent event stream.
 *
 * The CORS header is set EXPLICITLY here rather than being left to
 * @fastify/cors. An SSE handler takes over the raw socket with
 * reply.raw.writeHead(), which bypasses the Fastify reply and therefore the
 * plugin's onSend hook - so the plugin's headers are never written and every
 * browser silently refuses the stream.
 *
 * This is invisible to the test suite: neither app.inject() nor a Node fetch
 * enforces CORS. It only appears in a real browser.
 *
 * The origin is echoed only when it is on the configured allow-list, so this
 * stays consistent with the narrow CORS policy instead of opening up to "*".
 */
export function sseHeaders(request: FastifyRequest): OutgoingHttpHeaders {
  const origin = request.headers.origin;
  const allowed = typeof origin === "string" && corsOrigins.includes(origin);

  return {
    ...(allowed
      ? {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
          // The response differs per origin, so caches must key on it.
          vary: "Origin",
        }
      : {}),
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    // Without this a proxy can buffer the stream, and the console appears
    // frozen while events pile up invisibly.
    "x-accel-buffering": "no",
  };
}
