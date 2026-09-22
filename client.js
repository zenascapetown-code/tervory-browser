const BASE = process.env.TERVORY_BROWSER_URL || "http://127.0.0.1:8796";
const TOKEN = (process.env.TERVORY_BROWSER_TOKEN || "").trim();
const WORKER = (process.env.TERVORY_BROWSER_WORKER || process.env.TERVORY_WORKER || "").trim();

async function call(method, path, body) {
  const headers = {
    authorization: `Bearer ${TOKEN}`,
    "x-tervory-worker": WORKER,
  };
  if (body) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

export const browser = {
  health: () => call("GET", "/health"),
  open: (url) => call("POST", "/open", { url }),
  tab: () => call("GET", "/tab"),
  text: () => call("GET", "/text"),
  click: (selector) => call("POST", "/click", { selector }),
  type: (selector, text) => call("POST", "/type", { selector, text }),
  wait: (selector) => call("POST", "/wait", { selector }),
  shot: () => call("POST", "/shot"),
  reset: () => call("POST", "/reset"),
};
