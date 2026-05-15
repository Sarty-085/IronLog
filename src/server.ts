import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// The FastAPI backend on Render. Requests to /api/* are proxied here
// server-side — the browser never makes a cross-origin request, eliminating CORS.
const BACKEND_ORIGIN = "https://ironlog-api-i7zi.onrender.com";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // ── API reverse proxy ──────────────────────────────────────────────────
    // Strip /api prefix and forward to the FastAPI backend.
    // This runs server-side (Cloudflare Worker → Render) so CORS never applies.
    if (url.pathname.startsWith("/api/")) {
      const backendPath = url.pathname.slice(4); // "/api/auth/login" → "/auth/login"
      const backendUrl = `${BACKEND_ORIGIN}${backendPath}${url.search}`;

      const proxyHeaders = new Headers(request.headers);
      // Remove the browser Host header; let fetch set it to the backend host
      proxyHeaders.delete("host");

      try {
        return await fetch(backendUrl, {
          method: request.method,
          headers: proxyHeaders,
          body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
        });
      } catch {
        return new Response(JSON.stringify({ detail: "Backend unreachable" }), {
          status: 502,
          headers: { "content-type": "application/json" },
        });
      }
    }
    // ── End API proxy ──────────────────────────────────────────────────────

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
