import http from "node:http";
import puppeteer from "puppeteer-core";

const PORT = Number(process.env.TERVORY_BROWSER_PORT || 8796);
const TOKEN = (process.env.TERVORY_BROWSER_TOKEN || "").trim();
const CHROME = process.env.CHROME_PATH || "/usr/bin/chromium";

const contexts = new Map();
let browser;

async function chrome() {
  if (browser && browser.connected) return browser;
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  return browser;
}

function workerOf(req) {
  return String(req.headers["x-tervory-worker"] || "anon").trim() || "anon";
}

async function contextFor(worker) {
  const b = await chrome();
  if (!contexts.has(worker)) {
    contexts.set(worker, await b.createBrowserContext());
  }
  return contexts.get(worker);
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
  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      ok: true,
      name: "tervory-browser",
      owned: true,
      many: true,
      chrome: Boolean(browser && browser.connected),
      workers: [...contexts.keys()],
    });
  }
  if (!allow(req)) return send(res, 401, { ok: false, error: "token" });
  const worker = workerOf(req);
  try {
    if (req.method === "POST" && url.pathname === "/open") {
      const body = await readBody(req);
      const target = String(body.url || "").trim();
      if (!/^https?:\/\//i.test(target)) return send(res, 400, { ok: false, error: "url" });
      const ctx = await contextFor(worker);
      const pages = await ctx.pages();
      const page = pages[0] || (await ctx.newPage());
      await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 });
      return send(res, 200, { ok: true, worker, url: page.url(), title: await page.title() });
    }
    if (req.method === "GET" && url.pathname === "/tab") {
      const ctx = contexts.get(worker);
      if (!ctx) return send(res, 200, { ok: true, worker, url: null, title: null });
      const pages = await ctx.pages();
      const page = pages[0];
      if (!page) return send(res, 200, { ok: true, worker, url: null, title: null });
      return send(res, 200, { ok: true, worker, url: page.url(), title: await page.title() });
    }
    if (req.method === "POST" && url.pathname === "/reset") {
      const ctx = contexts.get(worker);
      if (ctx) {
        await ctx.close();
        contexts.delete(worker);
      }
      return send(res, 200, { ok: true, worker, reset: true });
    }
    send(res, 404, { ok: false, error: "not found" });
  } catch (err) {
    send(res, 500, { ok: false, error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`tervory-browser chromium ${PORT}\n`);
});
