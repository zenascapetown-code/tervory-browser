import http from "node:http";

const PORT = Number(process.env.TERVORY_BROWSER_PORT || 8796);
const TOKEN = (process.env.TERVORY_BROWSER_TOKEN || "").trim();
const IDLE_MS = Number(process.env.TERVORY_BROWSER_IDLE_MS || 15 * 60 * 1000);

const sessions = new Map();

function workerOf(req) {
  return String(req.headers["x-tervory-worker"] || "anon").trim() || "anon";
}

function sweep() {
  const now = Date.now();
  for (const [worker, s] of sessions) {
    if (now - (s.at || 0) > IDLE_MS) sessions.delete(worker);
  }
}

function sessionFor(worker) {
  sweep();
  if (!sessions.has(worker)) {
    sessions.set(worker, { worker, url: null, title: null, at: Date.now() });
  }
  return sessions.get(worker);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("bad json"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function allow(req) {
  if (!TOKEN) return false;
  const got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return got === TOKEN;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  sweep();
  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/active")) {
    if (url.pathname === "/active") {
      res.writeHead(204);
      return res.end();
    }
    return send(res, 200, {
      ok: true,
      name: "tervory-browser",
      owned: true,
      many: true,
      workers: [...sessions.keys()],
    });
  }
  if (!allow(req)) return send(res, 401, { ok: false, error: "token" });
  const worker = workerOf(req);
  try {
    if (req.method === "POST" && url.pathname === "/open") {
      const body = await readBody(req);
      const target = String(body.url || "").trim();
      if (!target) return send(res, 400, { ok: false, error: "url" });
      const s = sessionFor(worker);
      s.url = target;
      s.title = body.title || target;
      s.at = Date.now();
      return send(res, 200, { ok: true, worker, url: s.url, title: s.title });
    }
    if (req.method === "GET" && url.pathname === "/tab") {
      const s = sessions.get(worker) || { worker, url: null, title: null };
      return send(res, 200, { ok: true, worker, url: s.url, title: s.title });
    }
    if (req.method === "POST" && url.pathname === "/reset") {
      sessions.delete(worker);
      return send(res, 200, { ok: true, worker, reset: true });
    }
    send(res, 404, { ok: false, error: "not found" });
  } catch (err) {
    send(res, 400, { ok: false, error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`tervory-browser many-session ${PORT}\n`);
});
