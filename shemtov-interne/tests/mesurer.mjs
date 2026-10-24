#!/usr/bin/env node
// Mesures Lighthouse du site Shemtov Foch (téléphone et ordinateur), servi en local avec compression
// et en-têtes de production. Écrit shemtov-interne/rapports/performance.md.
//
//   LIGHTHOUSE=<chemin du binaire lighthouse> CHROME_PATH=<chromium> node shemtov-interne/tests/mesurer.mjs
//   FORMATS=mobile PAGES=/,/nos-rayons.html …   mesure partielle (le rapport n'est pas réécrit)
//
// Ce sont des mesures de laboratoire (throttling simulé de Lighthouse), pas des données de terrain :
// les valeurs réelles dépendront de l'hébergeur et du réseau des visiteurs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, "../..");
const RAPPORT = path.join(RACINE, "shemtov-interne", "rapports", "performance.md");
const LH = process.env.LIGHTHOUSE || "lighthouse";
const PORT = 8611;
const TOUTES = ["/", "/le-magasin.html", "/nos-rayons.html", "/infos-pratiques.html", "/faq.html", "/contact.html", "/mentions-legales.html", "/confidentialite.html"];
const PAGES = process.env.PAGES ? process.env.PAGES.split(",") : TOUTES;
const FORMATS = process.env.FORMATS ? process.env.FORMATS.split(",") : ["mobile", "desktop"];
const PARTIEL = !!(process.env.PAGES || process.env.FORMATS);

const serveur = spawn(process.execPath, [path.join(ICI, "serveur.mjs"), String(PORT)], { stdio: "ignore" });
await new Promise((ok) => setTimeout(ok, 800));

const lignes = [];
try {
  for (const format of FORMATS) {
    for (const p of PAGES) {
      // Rapports bruts : dossier SORTIE_LH (ne pas déplacer TMPDIR : Chrome y crée un socket au chemin limité à 107 caractères)
      const sortie = path.join(process.env.SORTIE_LH || os.tmpdir(), `lh-${format}-${p.replace(/\W/g, "_")}.json`);
      const args = [`http://127.0.0.1:${PORT}${p}`, "--quiet", "--output=json", `--output-path=${sortie}`,
        "--only-categories=performance,accessibility,best-practices,seo", '--chrome-flags=--headless=new --no-sandbox'];
      if (format === "desktop") args.push("--preset=desktop");
      // Lighthouse échoue parfois à enregistrer la trace (NO_NAVSTART) : jusqu'à 3 essais
      for (let essai = 1; ; essai++) {
        try { execFileSync(LH, args, { stdio: "pipe", timeout: 180000 }); break; }
        catch (e) { if (essai === 3) throw e; console.log(`nouvel essai (${format} ${p})`); }
      }
      const r = JSON.parse(fs.readFileSync(sortie, "utf8"));
      const a = r.audits, c = r.categories;
      const ms = (k) => (a[k].numericValue / 1000).toFixed(2).replace(".", ",") + " s";
      lignes.push(`| ${format === "mobile" ? "Téléphone" : "Ordinateur"} | ${p} | ${Math.round(c.performance.score * 100)} | ${Math.round(c.accessibility.score * 100)} | ` +
        `${Math.round(c["best-practices"].score * 100)} | ${Math.round(c.seo.score * 100)} | ${ms("first-contentful-paint")} | ${ms("largest-contentful-paint")} | ` +
        `${a["cumulative-layout-shift"].numericValue.toFixed(3).replace(".", ",")} | ${Math.round(a["total-blocking-time"].numericValue)} ms | ${Math.round(a["total-byte-weight"].numericValue / 1024)} Ko |`);
      console.log(lignes.at(-1));
    }
  }
} finally {
  serveur.kill();
}
if (PARTIEL) process.exit(0);
const version = execFileSync(LH, ["--version"]).toString().trim();
fs.writeFileSync(RAPPORT, `# Mesures de performance (Lighthouse ${version})\n\n` +
  `Mesures du ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (heure de Paris), serveur local avec compression gzip et en-têtes de production.\n` +
  `Téléphone : profil mobile par défaut de Lighthouse (réseau 4G lent et processeur ralentis, simulés). Ordinateur : préréglage « desktop ».\n` +
  `Mesures de laboratoire : les valeurs réelles dépendront de l'hébergeur (CDN, HTTP/2) et du réseau des visiteurs. ` +
  `L'INP ne se mesure qu'avec de vrais visiteurs (Search Console, après la mise en ligne) ; le TBT en est l'indicateur de laboratoire.\n\n` +
  `| Format | Page | Performance | Accessibilité | Bonnes pratiques | SEO | FCP | LCP | CLS | TBT | Poids |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n` +
  lignes.join("\n") + "\n");
console.log("Rapport : " + RAPPORT);
