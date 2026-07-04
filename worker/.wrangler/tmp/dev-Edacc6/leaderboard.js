var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// leaderboard.js
var LEVELS = ["JUNGLE JAUNT", "PIPE PANIC", "EMERALD RUSH"];
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type"
};
var json = /* @__PURE__ */ __name((d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", ...CORS } }), "json");
var cleanName = /* @__PURE__ */ __name((v) => String(v || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 10) || "PLAYER 1", "cleanName");
var int = /* @__PURE__ */ __name((v, min, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}, "int");
async function upsert(env, key, entry, cmp) {
  const rows = JSON.parse(await env.SCORES.get(key) || "[]");
  const i = rows.findIndex((r) => r.name === entry.name);
  if (i < 0) rows.push(entry);
  else if (cmp(entry, rows[i]) < 0) rows[i] = entry;
  rows.sort(cmp);
  if (rows.length > 100) rows.length = 100;
  await env.SCORES.put(key, JSON.stringify(rows));
  return rows.slice(0, 10);
}
__name(upsert, "upsert");
async function runner(req, url, env) {
  if (req.method === "GET") {
    const level = url.searchParams.get("level") || "";
    if (!LEVELS.includes(level)) return json({ error: "unknown level" }, 400);
    return json(JSON.parse(await env.SCORES.get("runner:" + level) || "[]").slice(0, 10));
  }
  if (req.method === "POST") {
    let b;
    try {
      b = await req.json();
    } catch (e) {
      return json({ error: "bad json" }, 400);
    }
    const level = String(b.level || "");
    if (!LEVELS.includes(level)) return json({ error: "unknown level" }, 400);
    const entry = {
      name: cleanName(b.name),
      time: int(b.time, 1, 60 * 60 * 60 * 10),
      // frames at 60fps, 10 hour cap
      pickups: int(b.pickups, 0, 9999),
      letters: int(b.letters, 0, 4),
      at: Date.now()
    };
    if (entry.time === null || entry.pickups === null || entry.letters === null) return json({ error: "bad entry" }, 400);
    const cmp = /* @__PURE__ */ __name((a, b2) => a.time - b2.time || b2.letters - a.letters || b2.pickups - a.pickups || a.at - b2.at, "cmp");
    return json(await upsert(env, "runner:" + level, entry, cmp));
  }
  return json({ error: "method not allowed" }, 405);
}
__name(runner, "runner");
async function arcade(req, url, env) {
  if (req.method === "GET") return json(JSON.parse(await env.SCORES.get("arcade") || "[]").slice(0, 10));
  if (req.method === "POST") {
    let b;
    try {
      b = await req.json();
    } catch (e) {
      return json({ error: "bad json" }, 400);
    }
    const entry = {
      name: cleanName(b.name),
      score: int(b.score, 1, 9999999),
      level: int(b.level, 1, 99),
      at: Date.now()
    };
    if (entry.score === null || entry.level === null) return json({ error: "bad entry" }, 400);
    const cmp = /* @__PURE__ */ __name((a, b2) => b2.score - a.score || b2.level - a.level || a.at - b2.at, "cmp");
    return json(await upsert(env, "arcade", entry, cmp));
  }
  return json({ error: "method not allowed" }, 405);
}
__name(arcade, "arcade");
var leaderboard_default = {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    try {
      if (path === "/runner") return await runner(req, url, env);
      if (path === "/arcade") return await arcade(req, url, env);
    } catch (e) {
      return json({ error: "server error" }, 500);
    }
    return json({ error: "not found" }, 404);
  }
};

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-qPODAd/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = leaderboard_default;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-qPODAd/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=leaderboard.js.map
