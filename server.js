import http from "node:http";

const PORT = Number(process.env.TERVORY_BROWSER_PORT || 8796);
const TOKEN = (process.env.TERVORY_BROWSER_TOKEN || "").trim();

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

const state = {
  url: null,
  title: null,
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      ok: true,
      name: "tervory-browser",
      owned: true,
      url: state.url,
    });
  }
  if (!allow(req)) return send(res, 401, { ok: false, error: "token" });
  try {
    if (req.method === "POST" && url.pathname === "/open") {
      const body = await readBody(req);
      const target = String(body.url || "").trim();
      if (!target) return send(res, 400, { ok: false, error: "url" });
      state.url = target;
      state.title = body.title || target;
      return send(res, 200, { ok: true, url: state.url, title: state.title });
    }
    if (req.method === "GET" && url.pathname === "/tab") {
      return send(res, 200, { ok: true, url: state.url, title: state.title });
    }
    send(res, 404, { ok: false, error: "not found" });
  } catch (err) {
    send(res, 400, { ok: false, error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`tervory-browser ${PORT}\n`);
});
