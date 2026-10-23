#!/usr/bin/env node
// Serveur local du site, avec les en-têtes de sécurité de shemtov/_headers.
//   node shemtov-interne/tests/serveur.mjs [port]   puis ouvrir http://127.0.0.1:<port>/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../shemtov");
const PORT = Number(process.argv[2] || 8080);
const regles = [];
let r = null;
for (const l of fs.readFileSync(path.join(SITE, "_headers"), "utf8").split("\n")) {
  if (!l.trim() || l.startsWith("#")) continue;
  if (!l.startsWith(" ")) { r = { motif: l.trim(), h: {} }; regles.push(r); continue; }
  const [k, ...v] = l.trim().split(": ");
  r.h[k] = v.join(": ").replace("; upgrade-insecure-requests", ""); // inutile et bloquant en http local
}
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(SITE, path.normalize(p));
  const h = {};
  for (const x of regles) if (x.motif === "/*" || (x.motif.endsWith("*") && p.startsWith(x.motif.slice(0, -1)))) Object.assign(h, x.h);
  const ok = f.startsWith(SITE) && !path.basename(f).startsWith("_") && !/\.(toml|json)$/.test(f) && fs.existsSync(f) && fs.statSync(f).isFile();
  const type = TYPES[path.extname(ok ? f : ".html")] || "application/octet-stream";
  const corps = fs.readFileSync(ok ? f : path.join(SITE, "404.html"));
  // Compression des fichiers texte, comme le font Netlify et Vercel
  if (/text|javascript|xml/.test(type) && /gzip/.test(req.headers["accept-encoding"] || "")) {
    res.writeHead(ok ? 200 : 404, { ...h, "Content-Type": type, "Content-Encoding": "gzip", "Vary": "Accept-Encoding" });
    res.end(zlib.gzipSync(corps));
  } else {
    res.writeHead(ok ? 200 : 404, { ...h, "Content-Type": type });
    res.end(corps);
  }
}).listen(PORT, "127.0.0.1", () => console.log(`Site servi sur http://127.0.0.1:${PORT}/`));
