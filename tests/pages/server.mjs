/**
 * Serves the repo the way GitHub Pages serves master: the source tree as-is,
 * unbundled, under /clockwork_carnage/. No Vite, so import.meta.env is
 * undefined and every module is fetched on its own, as players get it.
 *
 *   node tests/pages/server.mjs [port]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "/clockwork_carnage/";
const PORT = Number(process.argv[2] ?? 4455);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webmanifest": "application/manifest+json",
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith(BASE)) {
      res.writeHead(url.pathname === "/" ? 302 : 404, { Location: BASE });
      return res.end();
    }
    let rel = decodeURIComponent(url.pathname.slice(BASE.length));
    if (rel === "" || rel.endsWith("/")) rel += "index.html";
    const file = path.join(ROOT, rel);
    // Pages publishes the tracked tree; node_modules is never there.
    if (!file.startsWith(ROOT) || rel.startsWith("node_modules/")) {
      res.writeHead(404);
      return res.end();
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
      res.end(body);
    });
  })
  .listen(PORT, () => console.log(`pages: http://localhost:${PORT}${BASE}`));
