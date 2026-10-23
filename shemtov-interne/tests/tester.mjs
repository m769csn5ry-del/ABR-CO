#!/usr/bin/env node
// Banc de tests du site Shemtov Foch.
// Sert le dossier shemtov/ avec les en-têtes de _headers (CSP comprise), puis exécute les parcours
// dans Chromium (Playwright). Écrit le résultat dans shemtov-interne/rapports/tests.md.
//
//   node shemtov-interne/tests/tester.mjs [--captures <dossier>]
//
// Prérequis : Playwright installé (npm i -g playwright) et, pour l'audit d'accessibilité,
// le fichier axe.min.js (paquet axe-core) indiqué par la variable AXE_PATH.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, "../..");
const SITE = path.join(RACINE, "shemtov");
const RAPPORT = path.join(RACINE, "shemtov-interne", "rapports", "tests.md");
const pw = require(process.env.PW_PATH || path.join(execSync("npm root -g").toString().trim(), "playwright"));
const AXE = process.env.AXE_PATH;
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const CAPTURES = process.argv.includes("--captures") ? process.argv[process.argv.indexOf("--captures") + 1] : null;

// ---------------------------------------------------------------- serveur local
function lireEntetes() {
  const regles = [];
  let courante = null;
  for (const ligne of fs.readFileSync(path.join(SITE, "_headers"), "utf8").split("\n")) {
    if (!ligne.trim() || ligne.startsWith("#")) continue;
    if (!ligne.startsWith(" ")) { courante = { motif: ligne.trim(), entetes: {} }; regles.push(courante); continue; }
    const [k, ...v] = ligne.trim().split(": ");
    // En local (http), la directive upgrade-insecure-requests casserait le chargement : elle est retirée ici seulement.
    courante.entetes[k] = v.join(": ").replace("; upgrade-insecure-requests", "");
  }
  return regles;
}
const REGLES = lireEntetes();
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
const serveur = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const fichier = path.join(SITE, path.normalize(p));
  const entetes = {};
  for (const r of REGLES) {
    if (r.motif === "/*" || (r.motif.endsWith("*") && p.startsWith(r.motif.slice(0, -1)))) Object.assign(entetes, r.entetes);
  }
  const interdit = !fichier.startsWith(SITE) || path.basename(fichier).startsWith("_") || /\.(toml|json)$/.test(fichier);
  if (!interdit && fs.existsSync(fichier) && fs.statSync(fichier).isFile()) {
    res.writeHead(200, { ...entetes, "Content-Type": TYPES[path.extname(fichier)] || "application/octet-stream" });
    fs.createReadStream(fichier).pipe(res);
  } else {
    res.writeHead(404, { ...entetes, "Content-Type": TYPES[".html"] });
    res.end(fs.readFileSync(path.join(SITE, "404.html")));
  }
});
await new Promise((ok) => serveur.listen(0, "127.0.0.1", ok));
const BASE = `http://127.0.0.1:${serveur.address().port}`;

// ---------------------------------------------------------------- outillage
const resultats = [];
function noter(id, nom, etat, detail = "") { resultats.push({ id, nom, etat, detail }); console.log(`${etat.padEnd(12)} ${id} ${nom}${detail ? " · " + detail : ""}`); }
const navigateur = await pw.chromium.launch({ executablePath: CHROME });
async function ouvrir(opts = {}) {
  const ctx = await navigateur.newContext({ locale: "fr-FR", timezoneId: "Europe/Paris", viewport: { width: 1280, height: 860 }, ...opts });
  const page = await ctx.newPage();
  const journal = { erreurs: [], csp: [], externes: [] };
  page.on("pageerror", (e) => journal.erreurs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") (/Content Security Policy/i.test(m.text()) ? journal.csp : journal.erreurs).push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["127.0.0.1", ""].includes(u.hostname) && !u.protocol.startsWith("data")) journal.externes.push(r.url()); });
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); });
  return { ctx, page, journal };
}
async function cas(id, nom, fn) {
  try { const d = await fn(); noter(id, nom, d && d.etat ? d.etat : "Réussi", d && d.detail ? d.detail : (typeof d === "string" ? d : "")); }
  catch (e) { noter(id, nom, "Échoué", String(e.message || e).split("\n")[0].slice(0, 220)); }
}
function verifier(cond, message) { if (!cond) throw new Error(message); }
const sansErreurs = (j) => j.erreurs.filter((e) => !/Failed to load resource/.test(e));

// ---------------------------------------------------------------- parcours
await cas("T01", "Ouverture du site (titre, aucune erreur, aucune violation CSP, aucune requête externe)", async () => {
  const { ctx, page, journal } = await ouvrir();
  const rep = await page.goto(BASE + "/");
  await page.waitForLoadState("networkidle");
  verifier(rep.status() === 200, "statut " + rep.status());
  verifier((await page.title()) === "Shemtov Foch · Épicerie casher à Strasbourg", "titre inattendu");
  const csp = await page.evaluate(() => window.__csp);
  verifier(sansErreurs(journal).length === 0, "erreurs JS : " + sansErreurs(journal).join(" | "));
  verifier(csp.length === 0 && journal.csp.length === 0, "violations CSP : " + csp.concat(journal.csp).join(" | "));
  verifier(journal.externes.length === 0, "requêtes externes : " + journal.externes.join(", "));
  const gsap = await page.evaluate(() => !!window.gsap && !!window.ScrollTrigger);
  await ctx.close();
  return gsap ? "GSAP et ScrollTrigger chargés depuis le site" : { etat: "Échoué", detail: "GSAP non chargé" };
});

await cas("T02", "Chargement du hero (image principale chargée, LCP mesuré en laboratoire)", async () => {
  const { ctx, page } = await ouvrir({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await page.addInitScript(() => { window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); });
  await page.goto(BASE + "/");
  await page.waitForLoadState("networkidle");
  const ok = await page.$eval(".hero-photo img", (i) => i.complete && i.naturalWidth > 0);
  const lcp = await page.evaluate(() => window.__lcp);
  await ctx.close();
  verifier(ok, "image du hero non chargée");
  return `LCP local ${Math.round(lcp)} ms (serveur local, sans limitation réseau)`;
});

await cas("T03", "Navigation entre sections (liens du menu ordinateur)", async () => {
  const { ctx, page } = await ouvrir();
  await page.goto(BASE + "/");
  for (const [lien, cible] of [["Le magasin", "#magasin"], ["Nos rayons", "#rayons"], ["Visite", "#visite"], ["Infos pratiques", "#infos"]]) {
    await page.mouse.move(640, 20); // l'en-tête masqué en descendant revient quand la souris approche du haut
    await page.waitForTimeout(450);
    await page.click(`.nav-desktop >> text=${lien}`);
    await page.waitForTimeout(900);
    const haut = await page.$eval(cible, (s) => s.getBoundingClientRect().top);
    verifier(Math.abs(haut) < 140, `${cible} non atteinte (haut = ${Math.round(haut)})`);
  }
  await ctx.close();
});

await cas("T04", "Menu mobile : ouverture, focus, Échap, fermeture au clic sur un lien", async () => {
  const { ctx, page } = await ouvrir({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(BASE + "/");
  const btn = page.locator(".menu-btn");
  await btn.click();
  verifier((await btn.getAttribute("aria-expanded")) === "true", "aria-expanded pas à true");
  verifier(await page.isVisible("#menu-mobile"), "menu invisible");
  verifier(await page.evaluate(() => document.activeElement.closest("#menu-mobile") !== null), "focus pas dans le menu");
  verifier(await page.evaluate(() => document.getElementById("contenu").inert), "le contenu n'est pas rendu inerte");
  await page.keyboard.press("Escape");
  verifier(await page.isHidden("#menu-mobile"), "Échap ne ferme pas");
  verifier(await page.evaluate(() => document.activeElement.classList.contains("menu-btn")), "le focus ne revient pas au bouton");
  await btn.click();
  await page.click("#menu-mobile >> text=Infos pratiques");
  await page.waitForTimeout(900);
  verifier(await page.isHidden("#menu-mobile"), "le menu reste ouvert après un lien");
  const haut = await page.$eval("#infos", (s) => s.getBoundingClientRect().top);
  verifier(Math.abs(haut) < 140, "section infos non atteinte");
  await ctx.close();
});

await cas("T05", "Navigation vers les rayons : une carte mène à son étape et la zone s'allume sur le plan", async () => {
  const { ctx, page } = await ouvrir();
  await page.goto(BASE + "/");
  await page.click(".univers h3 >> text=Épicerie");
  await page.waitForTimeout(1500);
  const actif = await page.$eval("svg.plan", (s) => [...s.querySelectorAll(".zone.is-active")].map((z) => z.dataset.etape).join(","));
  const vb = await page.$eval("svg.plan", (s) => s.getAttribute("viewBox"));
  await ctx.close();
  verifier(actif === "epicerie", "zone active : " + (actif || "aucune"));
  return "caméra du plan : viewBox " + vb;
});

await cas("T06", "Animations : blocs révélés au défilement, phrase mot à mot, aucun bloc resté invisible", async () => {
  const { ctx, page } = await ouvrir();
  await page.goto(BASE + "/");
  await page.waitForFunction(() => window.ScrollTrigger);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 400) { await page.mouse.wheel(0, 400); await page.waitForTimeout(60); }
  await page.waitForTimeout(1500);
  const restes = await page.$$eval("[data-reveal], .univers, .etape figure, .etape-txt", (els) => els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length);
  const mots = await page.$$eval("[data-words] .w", (w) => w.length);
  await ctx.close();
  verifier(restes === 0, `${restes} bloc(s) encore transparents après défilement complet`);
  return `${mots} mots animés dans la phrase d'introduction`;
});

await cas("T07", "Mouvement réduit : pas de GSAP, aucun élément masqué, caméra sans animation", async () => {
  const { ctx, page } = await ouvrir({ reducedMotion: "reduce" });
  await page.goto(BASE + "/");
  await page.waitForLoadState("networkidle");
  const gsap = await page.evaluate(() => !!window.gsap);
  const caches = await page.$$eval("[data-reveal], .univers, .etape figure", (els) => els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99).length);
  const anim = await page.$eval(".hero-title .line > span", (s) => getComputedStyle(s).animationName);
  await ctx.close();
  verifier(!gsap, "GSAP chargé malgré le mouvement réduit");
  verifier(caches === 0, caches + " élément(s) masqué(s)");
  verifier(anim === "none", "animation CSS active : " + anim);
});

await cas("T08", "Infos pratiques : statut calculé, 7 jours, jour en cours, horaires corrects", async () => {
  const { ctx, page } = await ouvrir();
  await page.clock.setFixedTime(new Date("2026-10-23T14:50:00Z")); // vendredi 16h50 à Paris
  await page.goto(BASE + "/");
  const statut = await page.textContent(".panel-horaires [data-status-text]");
  const lignes = await page.$$eval(".hours tr", (t) => t.map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  const auj = await page.$eval(".hours tr.today th", (t) => t.textContent);
  await ctx.close();
  verifier(statut === "Ferme bientôt · à 17h", "statut : " + statut);
  verifier(lignes.length === 7 && lignes[5] === "Samedi Fermé" && lignes[6] === "Dimanche 9h30 – 13h", "tableau : " + lignes.join(" / "));
  verifier(auj === "Vendredi", "jour surligné : " + auj);
  return lignes.join(" / ");
});

await cas("T09", "Horaires exceptionnels : encadré affiché et statut adapté", async () => {
  const { ctx, page } = await ouvrir();
  await page.route("**/assets/donnees.js", (r) => r.fulfill({ contentType: "text/javascript", body:
    'window.SHEMTOV={"horaires":[["09:30","13:00"],["08:00","20:00"],["08:00","20:00"],["08:00","20:00"],["08:00","20:00"],["08:00","17:00"],null],' +
    '"exceptions":[{"date":"2026-10-26","horaires":["08:00","15:00"],"note":"Fermeture à 15h (test)."},{"date":"2026-10-27","horaires":null}]};' }));
  await page.clock.setFixedTime(new Date("2026-10-26T14:30:00Z")); // lundi 15h30
  await page.goto(BASE + "/");
  const statut = await page.textContent(".hero [data-status-text]");
  const exc = await page.$$eval(".exc [data-exc-list] li", (l) => l.map((x) => x.textContent));
  const visible = await page.isVisible(".exc");
  await ctx.close();
  verifier(visible && exc.length === 2, "encadré : " + exc.join(" ; "));
  verifier(statut === "Fermé · rouvre mercredi à 8h", "statut : " + statut);
  return exc.join(" ; ");
});

await cas("T10", "Boutons d'appel : tous pointent vers tel:+33388119692", async () => {
  const { ctx, page } = await ouvrir();
  await page.goto(BASE + "/");
  const liens = await page.$$eval('a[href^="tel:"]', (a) => a.map((x) => x.getAttribute("href")));
  await ctx.close();
  verifier(liens.length >= 5 && liens.every((h) => h === "tel:+33388119692"), liens.join(", "));
  return liens.length + " liens d'appel";
});

await cas("T11", "Boutons itinéraire : Google Maps vers le 6 rue du Maréchal-Foch, ouverture dans un nouvel onglet", async () => {
  const { ctx, page } = await ouvrir();
  await page.goto(BASE + "/");
  const liens = await page.$$eval('a[href*="google.com/maps"]', (a) => a.map((x) => [x.getAttribute("href"), x.target, x.rel]));
  await ctx.close();
  verifier(liens.length >= 3 && liens.every(([h, t, r]) => h.includes("Mar%C3%A9chal+Foch") && t === "_blank" && r.includes("noopener")), JSON.stringify(liens));
  return liens.length + " liens";
});

await cas("T12", "Copier l'adresse : message de confirmation", async () => {
  const { ctx, page } = await ouvrir({ permissions: ["clipboard-read", "clipboard-write"] });
  await page.goto(BASE + "/");
  await page.click("[data-copy]");
  await page.waitForTimeout(300);
  const msg = await page.textContent("[data-copy-msg]");
  const presse = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "(lecture impossible)");
  await ctx.close();
  verifier(/copiée/.test(msg), "message : " + msg);
  return "presse-papiers : " + presse;
});

for (const [id, page_, attendu] of [["T13", "mentions-legales.html", "794 645 978 00014"], ["T14", "confidentialite.html", "aucun cookie"]]) {
  await cas(id, `Page ${page_} : affichage, contenu attendu, aucune mention de travail`, async () => {
    const { ctx, page, journal } = await ouvrir({ viewport: { width: 390, height: 844 } });
    const rep = await page.goto(BASE + "/" + page_);
    const texte = await page.textContent("main");
    await ctx.close();
    verifier(rep.status() === 200, "statut " + rep.status());
    verifier(texte.includes(attendu), "contenu attendu absent : " + attendu);
    verifier(!/à confirmer|à compléter|TODO/i.test(texte), "mention de travail visible");
    verifier(sansErreurs(journal).length === 0, sansErreurs(journal).join(" | "));
  });
}

await cas("T15", "Cookies et stockage : aucun cookie, aucun stockage local", async () => {
  const { ctx, page } = await ouvrir();
  await page.goto(BASE + "/");
  await page.waitForLoadState("networkidle");
  const cookies = await ctx.cookies();
  const stockage = await page.evaluate(() => localStorage.length + sessionStorage.length);
  await ctx.close();
  verifier(cookies.length === 0 && stockage === 0, `cookies : ${cookies.length}, stockage : ${stockage}`);
});

await cas("T16", "Clavier : lien d'évitement, focus visible, menu ordinateur atteignable", async () => {
  const { ctx, page } = await ouvrir();
  await page.goto(BASE + "/");
  await page.keyboard.press("Tab");
  const premier = await page.evaluate(() => document.activeElement.className);
  verifier(premier === "skip", "premier élément focalisé : " + premier);
  await page.keyboard.press("Enter");
  verifier(await page.evaluate(() => document.activeElement.id === "contenu"), "le lien d'évitement ne mène pas au contenu");
  await page.goto(BASE + "/");
  await page.keyboard.press("Tab");
  const vus = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    vus.push(await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return (a.textContent || "").trim().slice(0, 20) + (s.outlineStyle !== "none" ? "" : " (sans contour)"); }));
  }
  await ctx.close();
  verifier(vus.some((v) => v.startsWith("Le magasin")), "lien « Le magasin » non atteint : " + vus.join(" | "));
  return vus.join(" → ");
});

await cas("T17", "Rechargement et liens directs (#visite, page secondaire, 404)", async () => {
  const { ctx, page } = await ouvrir();
  await page.goto(BASE + "/#visite");
  await page.waitForTimeout(800);
  const haut = await page.$eval("#visite", (s) => s.getBoundingClientRect().top);
  await page.reload();
  await page.waitForTimeout(800);
  const rep = await page.goto(BASE + "/existe-pas/");
  const titre404 = await page.textContent("h1");
  const css404 = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  await ctx.close();
  verifier(Math.abs(haut) < 140, "#visite non atteint au chargement");
  verifier(rep.status() === 404 && /n'existe pas/.test(titre404), "page 404 : " + rep.status());
  verifier(/Figtree/.test(css404), "la page 404 perd sa feuille de style dans un sous-dossier");
});

await cas("T18", "Connexion lente (≈ 400 kb/s, 400 ms) : contenu lisible avant la fin du chargement", async () => {
  const { ctx, page } = await ouvrir({ viewport: { width: 390, height: 844 }, isMobile: true });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 20000 });
  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  const dcl = Date.now() - t0;
  const titre = await page.isVisible(".hero-title");
  await page.waitForLoadState("load", { timeout: 90000 });
  const charge = Date.now() - t0;
  await ctx.close();
  verifier(titre, "titre non visible");
  return `contenu HTML prêt en ${dcl} ms, page complète en ${charge} ms`;
});

await cas("T19", "Images indisponibles : textes alternatifs présents, mise en page intacte, aucune erreur JS", async () => {
  const { ctx, page, journal } = await ouvrir({ viewport: { width: 390, height: 844 } });
  await page.route(/\.(webp|png|jpg)$/, (r) => r.abort());
  await page.goto(BASE + "/");
  await page.waitForTimeout(800);
  const sansAlt = await page.$$eval("img", (i) => i.filter((x) => !x.hasAttribute("alt")).length);
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  await ctx.close();
  verifier(sansAlt === 0, sansAlt + " image(s) sans attribut alt");
  verifier(largeur <= 390, "débordement horizontal : " + largeur);
  verifier(sansErreurs(journal).length === 0, sansErreurs(journal).join(" | "));
});

await cas("T20", "Erreur de chargement des scripts : le site reste complet sans JavaScript", async () => {
  const { ctx, page } = await ouvrir({ javaScriptEnabled: false });
  await page.goto(BASE + "/");
  const lignes = await page.$$eval(".hours tr", (t) => t.length);
  const fetes = await page.$$eval(".fete", (f) => f.length);
  const visibles = await page.$$eval("[data-reveal], .univers", (els) => els.every((e) => getComputedStyle(e).opacity === "1"));
  await ctx.close();
  verifier(lignes === 7 && fetes === 6 && visibles, `horaires ${lignes}, fêtes ${fetes}, blocs visibles ${visibles}`);
});

noter("T21", "Fonctionnement sans WebGL", "Sans objet", "le site n'utilise pas WebGL : aucune scène 3D tant que le plan n'est pas validé");

await cas("T22", "Données synchronisées (donnees.json = pages publiées)", async () => {
  execSync(`python3 -I ${path.join(RACINE, "shemtov-interne/outils/synchroniser.py")} --verifier`, { stdio: "pipe" });
});

await cas("T23", "Aucune mention « à confirmer » dans les fichiers publiés", async () => {
  const fautifs = [];
  const parcourir = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => {
    const p = path.join(d, f.name);
    if (f.isDirectory()) return parcourir(p);
    if (/\.(html|css|js|txt|xml)$/.test(f.name) && !p.includes("vendor") && /à confirmer|à compléter|TODO|lorem/i.test(fs.readFileSync(p, "utf8"))) fautifs.push(path.relative(SITE, p));
  });
  parcourir(SITE);
  verifier(fautifs.length === 0, fautifs.join(", "));
});

await cas("T28", "Visite guidée : la zone surlignée correspond à l'étape lue (téléphone et ordinateur)", async () => {
  const ecarts = [];
  for (const [w, h, lecture] of [[390, 844, 0.72], [1440, 900, 0.4]]) {
    const { ctx, page } = await ouvrir({ viewport: { width: w, height: h }, isMobile: w < 900, reducedMotion: "reduce" });
    await page.goto(BASE + "/");
    const ids = await page.$$eval(".etape", (e) => e.map((x) => x.dataset.etape));
    for (const id of ids) {
      // place le texte de l'étape à la hauteur où on le lit
      await page.evaluate(([id, lecture]) => {
        const t = document.querySelector(`#etape-${id} .etape-txt`).getBoundingClientRect();
        window.scrollBy(0, t.top + t.height / 2 - innerHeight * lecture);
      }, [id, lecture]);
      await page.waitForTimeout(250);
      const actif = await page.$eval("svg.plan", (s) => (s.querySelector(".zone.is-active") || {}).dataset?.etape || "aucune");
      if (actif !== id) ecarts.push(`${w}px : texte « ${id} », plan « ${actif} »`);
    }
    await ctx.close();
  }
  verifier(ecarts.length === 0, ecarts.join(" | "));
  return "7 étapes × 2 largeurs";
});

// ---------------------------------------------------------------- responsive
const TAILLES = [[320, 640], [360, 740], [375, 667], [390, 844], [414, 896], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440], [844, 390], [667, 375], [1024, 1366]];
await cas("T24", `Responsive : ${TAILLES.length} tailles, aucun débordement horizontal, boutons ≥ 44 px, textes non coupés`, async () => {
  const problemes = [];
  for (const [w, h] of TAILLES) {
    const mobile = w < 900;
    const { ctx, page } = await ouvrir({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
    await page.goto(BASE + "/");
    await page.waitForLoadState("networkidle");
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      const petits = [...document.querySelectorAll(".btn, .menu-btn")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim());
      const coupes = [...document.querySelectorAll("h1, h2, h3, p, .btn")].filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible").map((e) => e.textContent.trim().slice(0, 30));
      return { vw, sw, petits, coupes };
    });
    if (r.sw > r.vw) problemes.push(`${w}×${h} : débordement ${r.sw} > ${r.vw}`);
    if (r.petits.length) problemes.push(`${w}×${h} : boutons < 44 px (${r.petits.join(", ")})`);
    if (r.coupes.length) problemes.push(`${w}×${h} : textes coupés (${r.coupes.join(", ")})`);
    if (CAPTURES && [320, 390, 768, 1440].includes(w) && h > w * 0.6) {
      fs.mkdirSync(CAPTURES, { recursive: true });
      await page.screenshot({ path: path.join(CAPTURES, `accueil-${w}.png`), fullPage: true });
    }
    await ctx.close();
  }
  verifier(problemes.length === 0, problemes.join(" | "));
  return TAILLES.map(([w, h]) => `${w}×${h}`).join(", ");
});

// ---------------------------------------------------------------- accessibilité (axe-core)
await cas("T25", "Accessibilité automatique (axe-core, règles WCAG 2.2 A/AA) sur 4 pages, mobile et ordinateur", async () => {
  if (!AXE || !fs.existsSync(AXE)) return { etat: "Non exécuté", detail: "axe.min.js introuvable (variable AXE_PATH)" };
  const constats = [];
  for (const p of ["/", "/mentions-legales.html", "/confidentialite.html", "/existe-pas"]) {
    for (const [w, h] of [[390, 844], [1280, 860]]) {
      for (const theme of ["light", "dark"]) {
        const { ctx, page } = await ouvrir({ viewport: { width: w, height: h }, bypassCSP: true, colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(BASE + p);
        await page.waitForLoadState("networkidle");
        await page.addScriptTag({ path: AXE });
        const res = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })).violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`));
        res.forEach((v) => constats.push(`${p} ${w}px ${theme} : ${v}`));
        await ctx.close();
      }
    }
  }
  verifier(constats.length === 0, constats.join(" | "));
  return "0 violation sur 16 combinaisons (4 pages × 2 largeurs × 2 thèmes)";
});

// ---------------------------------------------------------------- fin
noter("T26", "Safari iOS, Safari macOS, Firefox, Edge, appareils réels", "Non exécuté", "seul Chromium est disponible dans cet environnement");
noter("T27", "Lecteurs d'écran (VoiceOver, NVDA)", "Non exécuté", "nécessite un appareil réel");

await navigateur.close();
serveur.close();
const lignes = resultats.map((r) => `| ${r.id} | ${r.nom} | ${r.etat} | ${r.detail.replace(/\|/g, "/")} |`);
const bilan = ["Réussi", "Échoué", "Non exécuté", "Sans objet"].map((e) => `${resultats.filter((r) => r.etat === e).length} ${e.toLowerCase()}`).join(", ");
fs.mkdirSync(path.dirname(RAPPORT), { recursive: true });
fs.writeFileSync(RAPPORT, `# Résultats des tests\n\nNavigateur : Chromium (Playwright), serveur local avec les en-têtes de \`_headers\`.\nBilan : ${bilan}.\n\n| Id | Test | Résultat | Détail |\n| --- | --- | --- | --- |\n${lignes.join("\n")}\n`);
console.log("\n" + bilan);
process.exit(resultats.some((r) => r.etat === "Échoué") ? 1 : 0);
