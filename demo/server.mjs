// Minimal dependency-free static server + telemetry sink for the @dalin/tactile demo.
// GET  /*     → serves files under the package root (so demo can import ../dist/*)
// POST /log   → appends the JSON body to demo/events.log (device telemetry)
import { createServer } from "node:http";
import { readFile, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, join, normalize } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LOG = fileURLToPath(new URL("./events.log", import.meta.url));
const PORT = 8137;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type");
  res.setHeader("cache-control", "no-store"); // always serve fresh dist during dev
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && pathname === "/log") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 1e5) req.destroy();
    });
    req.on("end", async () => {
      try {
        await appendFile(LOG, `[${new Date().toISOString()}] ${body}\n`);
      } catch {
        /* ignore */
      }
      res.writeHead(204);
      res.end();
    });
    return;
  }

  try {
    const p = pathname === "/" ? "/demo/index.html" : pathname;
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(PORT, () => console.log(`@dalin/tactile demo → http://localhost:${PORT}/  (telemetry → demo/events.log)`));
