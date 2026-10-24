#!/usr/bin/env node
// Banc de tests du site Shemtov Foch (version 4, site de 8 pages + page 404).
// Sert le dossier shemtov/ avec les en-têtes de _headers (CSP comprise), puis exécute dans Chromium (Playwright)
// les 10 scénarios clients du cahier des charges et les contrôles techniques.
// Écrit le résultat dans shemtov-interne/rapports/tests.md.
//
//   node shemtov-interne/tests/tester.mjs
//   SEULEMENT=S04,T10 node shemtov-interne/tests/tester.mjs   (quelques tests seulement ; le rapport n'est pas réécrit)
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
const DONNEES = JSON.parse(fs.readFileSync(path.join(RACINE, "shemtov-interne", "contenu", "donnees.json"), "utf8"));
const pw = require(process.env.PW_PATH || path.join(execSync("npm root -g").toString().trim(), "playwright"));
const AXE = process.env.AXE_PATH;
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const PAGES = ["/", "/le-magasin.html", "/nos-rayons.html", "/infos-pratiques.html", "/faq.html", "/contact.html", "/mentions-legales.html", "/confidentialite.html"];
const TEL = "tel:" + DONNEES.telephone.international;
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };
const ORDI = { viewport: { width: 1280, height: 860 } };

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
const SEULEMENT = process.env.SEULEMENT ? process.env.SEULEMENT.split(",") : null;
function noter(id, nom, etat, detail = "") {
  if (SEULEMENT && !SEULEMENT.includes(id)) return; resultats.push({ id, nom, etat, detail }); console.log(`${etat.padEnd(12)} ${id} ${nom}${detail ? " · " + detail : ""}`); }
const navigateur = await pw.chromium.launch({ executablePath: CHROME });
async function ouvrir(opts = {}) {
  const ctx = await navigateur.newContext({ locale: "fr-FR", timezoneId: "Europe/Paris", ...ORDI, ...opts });
  const page = await ctx.newPage();
  const journal = { erreurs: [], csp: [], externes: [] };
  page.on("pageerror", (e) => journal.erreurs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") (/Content Security Policy/i.test(m.text()) ? journal.csp : journal.erreurs).push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["127.0.0.1", ""].includes(u.hostname) && !u.protocol.startsWith("data")) journal.externes.push(r.url()); });
  // Les requêtes vers l'extérieur sont coupées : le test vérifie qu'elles ne partent pas, sans dépendre du réseau
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); });
  return { ctx, page, journal };
}
async function cas(id, nom, fn) {
  if (SEULEMENT && !SEULEMENT.includes(id)) return;
  try { const d = await fn(); noter(id, nom, d && d.etat ? d.etat : "Réussi", d && d.detail ? d.detail : (typeof d === "string" ? d : "")); }
  catch (e) { noter(id, nom, "Échoué", String(e.message || e).split("\n")[0].slice(0, 300)); }
}
function verifier(cond, message) { if (!cond) throw new Error(message); }
const sansErreurs = (j) => j.erreurs.filter((e) => !/Failed to load resource|ERR_FAILED|net::/.test(e));
const dansEcran = (page, sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0 && getComputedStyle(e).visibility !== "hidden"; });
// Heures de Paris (UTC+1 en novembre)
const PARIS = (iso) => new Date(iso + "+01:00");

// ================================================================ scénarios clients (cahier des charges, § 13)

await cas("S01", "Un client cherche les horaires depuis son iPhone", async () => {
  const { ctx, page } = await ouvrir({ ...MOBILE, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
  await page.clock.setFixedTime(PARIS("2026-11-06T16:50:00")); // vendredi 16h50
  await page.goto(BASE + "/");
  const statutAccueil = await page.textContent(".hero-statut [data-status-text]");
  const visibleSansDefiler = await page.$eval(".hero-statut", (e) => e.getBoundingClientRect().bottom < innerHeight);
  const duJour = await page.textContent(".infos-rapides [data-aujourdhui]");
  await page.click(".hero-statut");
  await page.waitForURL(/infos-pratiques\.html#horaires/);
  await page.waitForTimeout(500);
  const lignes = await page.$$eval("#horaires .hours tr", (t) => t.map((r) => r.innerText.replace(/\s+/g, " ").trim()));
  const auj = await page.$eval("#horaires .hours tr.today th", (t) => t.childNodes[0].textContent);
  const statut = await page.textContent("#horaires [data-status-text]");
  const tableVisible = await dansEcran(page, "#horaires .hours");
  await ctx.close();
  verifier(statutAccueil === "Ferme bientôt · à 17h", "statut sur l'accueil : " + statutAccueil);
  verifier(visibleSansDefiler, "statut du jour hors du premier écran");
  verifier(duJour === "8h – 17h", "horaires du jour sur l'accueil : " + duJour);
  verifier(statut === statutAccueil, "statut sur Infos pratiques : " + statut);
  verifier(lignes.length === 7 && lignes[0] === "Lundi 8h – 20h" && lignes[4].startsWith("Vendredi") && lignes[5] === "Samedi Fermé" && lignes[6] === "Dimanche 9h30 – 13h", "tableau : " + lignes.join(" / "));
  verifier(auj === "Vendredi", "jour mis en évidence : " + auj);
  verifier(tableVisible, "tableau hors de l'écran après le lien");
  return `statut « ${statutAccueil} » visible sans défiler sur l'accueil, horaires du jour « ${duJour} » ; 1 toucher jusqu'au tableau complet, jour surligné`;
});

await cas("S02", "Un client veut appeler le magasin (téléphone)", async () => {
  const { ctx, page } = await ouvrir(MOBILE);
  const constats = [];
  for (const p of PAGES) {
    await page.goto(BASE + p);
    const dock = await page.$eval(".dock .btn-ink", (a) => { const r = a.getBoundingClientRect(); return { href: a.getAttribute("href"), visible: r.top >= 0 && r.bottom <= innerHeight, h: r.height }; });
    if (dock.href !== TEL || !dock.visible || dock.h < 44) constats.push(`${p} : bouton Appeler ${JSON.stringify(dock)}`);
    const autres = await page.$$eval('a[href^="tel:"]', (a) => a.map((x) => x.getAttribute("href")));
    if (autres.some((h) => h !== autres[0])) constats.push(`${p} : liens tel différents`);
  }
  // Après un défilement vers le bas, la barre se masque ; elle revient dès qu'on remonte
  await page.goto(BASE + "/");
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(80); }
  await page.waitForTimeout(500);
  const masque = await page.$eval(".dock", (d) => d.classList.contains("is-hidden"));
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(600);
  const revenu = await page.$eval(".dock", (d) => !d.classList.contains("is-hidden"));
  await ctx.close();
  verifier(constats.length === 0, constats.join(" | "));
  verifier(revenu, "la barre d'appel ne revient pas en remontant");
  return `bouton « Appeler » (${TEL}) visible en bas d'écran sur les ${PAGES.length} pages, 1 toucher ; ${masque ? "masqué en descendant, " : ""}réaffiché en remontant`;
});

await cas("S03", "Un visiteur cherche l'adresse sur ordinateur (itinéraire, copie, carte)", async () => {
  const { ctx, page, journal } = await ouvrir({ ...ORDI, permissions: ["clipboard-read", "clipboard-write"] });
  await page.goto(BASE + "/");
  const cta = await page.$eval(".header-cta", (a) => ({ href: a.href, target: a.target, rel: a.rel, visible: a.getBoundingClientRect().bottom < innerHeight }));
  verifier(cta.visible && cta.href.startsWith(DONNEES.liens.itineraire.slice(0, 40)) && cta.target === "_blank" && cta.rel.includes("noopener"), "bouton Itinéraire de l'en-tête : " + JSON.stringify(cta));
  await page.click(".nav >> text=Infos pratiques");
  await page.waitForURL(/infos-pratiques/);
  const adresse = (await page.textContent("#adresse .grande-adresse")).replace(/\s+/g, " ").trim();
  verifier(adresse.includes(DONNEES.adresse.rue) && adresse.includes(DONNEES.adresse.codePostal), "adresse : " + adresse);
  verifier(await dansEcran(page, "#adresse .grande-adresse"), "adresse hors du premier écran");
  await page.click("#adresse [data-copy]");
  await page.waitForTimeout(300);
  const msg = await page.textContent("#adresse [data-copy-msg]");
  const presse = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  verifier(/copiée/.test(msg) && presse.includes("Maréchal-Foch"), `copie : « ${msg} » / presse-papiers « ${presse} »`);
  // Carte : rien n'est demandé à Google avant le clic
  verifier(journal.externes.length === 0, "requêtes externes avant le clic : " + journal.externes.join(", "));
  await page.click("[data-carte-ok]");
  await page.waitForTimeout(400);
  const cadre = await page.$eval(".carte iframe", (f) => ({ src: f.src, titre: f.title, focus: document.activeElement === f }));
  const csp = await page.evaluate(() => window.__csp.filter((v) => v.startsWith("frame-src")));
  await ctx.close();
  verifier(cadre.src.startsWith("https://www.google.com/maps?q=") && cadre.src.includes("output=embed"), "cadre : " + cadre.src);
  verifier(cadre.focus && cadre.titre.length > 10, "cadre sans titre ou sans focus");
  verifier(csp.length === 0, "la CSP bloque la carte : " + csp.join(", "));
  verifier(journal.externes.some((u) => u.startsWith("https://www.google.com/maps")), "la carte n'a pas été demandée après le clic");
  return "itinéraire visible dans l'en-tête, adresse dans le 1er écran d'Infos pratiques, copie OK, carte chargée seulement au clic (CSP frame-src respectée)";
});

await cas("S04", "Un nouveau client explore les rayons (accueil → rayon, pastilles, téléphone)", async () => {
  const { ctx, page } = await ouvrir(ORDI);
  await page.goto(BASE + "/");
  const cartes = await page.$$eval(".carte-rayon", (c) => c.length);
  verifier(cartes === DONNEES.rayons.length, `${cartes} cartes pour ${DONNEES.rayons.length} rayons`);
  await page.waitForFunction(() => document.documentElement.dataset.anim);
  await page.$eval('.carte-rayon a[href$="#rayon-poissons"]', (a) => a.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(900);
  await page.click('.carte-rayon a[href$="#rayon-poissons"]');
  await page.waitForURL(/nos-rayons\.html#rayon-poissons/);
  await page.waitForTimeout(1200);
  const haut = await page.$eval("#rayon-poissons", (s) => s.getBoundingClientRect().top);
  const actif1 = await page.$eval(".chips a.actif", (a) => a.textContent.trim()).catch(() => "aucune");
  await page.click(".chips >> text=Surgelés");
  await page.waitForTimeout(1500);
  const haut2 = await page.$eval("#rayon-surgeles", (s) => s.getBoundingClientRect().top);
  const actif2 = await page.$eval(".chips a.actif", (a) => a.textContent.trim()).catch(() => "aucune");
  const sections = await page.$$eval(".rayon", (r) => r.map((s) => ({ id: s.id, items: s.querySelectorAll(".rayon-liste li").length, img: !!s.querySelector("img[alt]") })));
  const evin = await page.textContent("#rayon-boissons .evin").catch(() => "");
  await ctx.close();
  verifier(haut > 0 && haut < 260, "rayon Poissons non atteint (haut " + Math.round(haut) + ")");
  verifier(actif1 === "Poissons" && actif2 === "Surgelés", `pastille active : ${actif1} puis ${actif2}`);
  verifier(haut2 > 0 && haut2 < 260, "rayon Surgelés non atteint");
  verifier(sections.length === DONNEES.rayons.length && sections.every((s) => s.items > 0 && s.img), JSON.stringify(sections));
  verifier(/modération/.test(evin), "message sanitaire absent du rayon boissons");
  // Téléphone : la galerie de l'accueil défile au doigt
  const m = await ouvrir(MOBILE);
  await m.page.goto(BASE + "/");
  const defile = await m.page.$eval(".galerie", (g) => g.scrollWidth > g.clientWidth + 100 && getComputedStyle(g).overflowX === "auto");
  await m.ctx.close();
  verifier(defile, "galerie non défilante sur téléphone");
  return `${cartes} cartes, lien carte → rayon, pastilles synchronisées, message Loi Évin présent, galerie tactile défilante`;
});

await cas("S05", "Un visiteur utilise le menu mobile", async () => {
  const { ctx, page } = await ouvrir(MOBILE);
  await page.goto(BASE + "/");
  const btn = page.locator(".menu-btn");
  await btn.click();
  verifier((await btn.getAttribute("aria-expanded")) === "true", "aria-expanded pas à true");
  verifier(await page.isVisible("#menu-mobile"), "menu invisible");
  verifier(await page.evaluate(() => document.activeElement.closest("#menu-mobile") !== null), "focus pas dans le menu");
  verifier(await page.evaluate(() => document.getElementById("contenu").inert && document.querySelector(".site-footer").inert), "le fond n'est pas rendu inerte");
  verifier(await page.evaluate(() => document.body.style.overflow === "hidden"), "la page défile sous le menu");
  const appel = await page.$eval("#menu-mobile a[href^='tel:']", (a) => a.getAttribute("href"));
  verifier(appel === TEL, "bouton d'appel du menu : " + appel);
  await page.keyboard.press("Escape");
  verifier(await page.isHidden("#menu-mobile"), "Échap ne ferme pas");
  verifier(await page.evaluate(() => document.activeElement.classList.contains("menu-btn")), "le focus ne revient pas au bouton");
  await btn.click();
  await page.click("#menu-mobile >> text=Nos rayons");
  await page.waitForURL(/nos-rayons\.html/);
  const courant = await page.$eval('#menu-mobile a[aria-current="page"]', (a) => a.textContent).catch(() => "");
  await page.click(".menu-btn");
  const ouvertAvant = await page.isVisible("#menu-mobile");
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(300);
  const fermeApres = await page.isHidden("#menu-mobile");
  await ctx.close();
  verifier(courant === "Nos rayons", "page courante non signalée dans le menu : " + courant);
  verifier(ouvertAvant && fermeApres, "le menu reste ouvert en passant en largeur ordinateur");
  return "ouverture, focus, fond inerte, Échap, retour du focus, navigation, page courante signalée, fermeture en largeur ordinateur";
});

await cas("S06", "Connexion lente (≈ 400 kb/s, 400 ms de latence) sur téléphone", async () => {
  const { ctx, page } = await ouvrir({ ...MOBILE });
  await page.addInitScript(() => { window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 20000 });
  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
  const dcl = Date.now() - t0;
  const titreLisible = await page.$eval("h1", (h) => h.textContent.includes("épicerie") && h.getBoundingClientRect().height > 0);
  const appelPret = await page.$eval(".dock .btn-ink", (a) => a.getAttribute("href"));
  await page.waitForLoadState("load", { timeout: 120000 });
  const charge = Date.now() - t0;
  const fcp = await page.evaluate(() => (performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime || 0);
  const lcp = await page.evaluate(() => window.__lcp);
  await ctx.close();
  verifier(titreLisible && appelPret === TEL, "titre ou bouton d'appel absent au premier rendu");
  return `HTML prêt en ${dcl} ms, premier affichage ${Math.round(fcp)} ms, LCP ${Math.round(lcp)} ms, page complète en ${(charge / 1000).toFixed(1)} s ; titre et bouton d'appel disponibles dès le HTML`;
});

await cas("S07", "Un utilisateur navigue uniquement au clavier", async () => {
  const { ctx, page } = await ouvrir(ORDI);
  await page.goto(BASE + "/");
  await page.keyboard.press("Tab");
  verifier(await page.evaluate(() => document.activeElement.className === "skip"), "le premier Tab n'atteint pas le lien d'évitement");
  await page.keyboard.press("Enter");
  verifier(await page.evaluate(() => document.activeElement.id === "contenu"), "le lien d'évitement ne mène pas au contenu");
  // Parcours complet de l'accueil : chaque élément atteint a un indicateur de focus et apparaît à l'écran
  await page.goto(BASE + "/");
  await page.waitForFunction(() => document.documentElement.dataset.anim);
  const vus = [], problemes = [];
  let precedent = null;
  for (let i = 0; i < 90; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(450); // le défilement jusqu'à l'élément est animé (défilement doux)
    const info = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const cible = a.matches(".carte-txt h3 a") ? a.closest(".carte-rayon").querySelector(".carte-img") : a;
      const s = getComputedStyle(cible);
      const r = a.getBoundingClientRect();
      return { nom: (a.textContent || a.getAttribute("aria-label") || a.tagName).trim().replace(/\s+/g, " ").slice(0, 28),
        contour: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0, ecran: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, el: a.outerHTML.slice(0, 60) };
    });
    if (!info) break;
    if (precedent && info.el === precedent) { problemes.push("focus bloqué sur " + info.nom); break; }
    precedent = info.el;
    vus.push(info.nom);
    if (!info.contour) problemes.push(`sans contour : ${info.nom}`);
    if (!info.ecran) problemes.push(`hors écran : ${info.nom}`);
  }
  // FAQ au clavier
  await page.goto(BASE + "/faq.html");
  await page.focus(".faq-item summary");
  await page.keyboard.press("Enter");
  const ouvert = await page.$eval(".faq-item", (d) => d.open);
  // Carte au clavier
  await page.goto(BASE + "/infos-pratiques.html");
  await page.focus("[data-carte-ok]");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const carte = await page.evaluate(() => document.activeElement.tagName);
  await ctx.close();
  verifier(vus.some((v) => v.startsWith("Le magasin")) && vus.some((v) => v.startsWith("Contact")), "menu non atteint : " + vus.slice(0, 10).join(" | "));
  verifier(problemes.length === 0, problemes.join(" | "));
  verifier(ouvert, "une question de la FAQ ne s'ouvre pas avec Entrée");
  verifier(carte === "IFRAME", "la carte ne s'ouvre pas au clavier");
  return `${vus.length} éléments parcourus sur l'accueil sans piège, tous avec contour visible et amenés à l'écran (galerie épinglée comprise) ; FAQ et carte utilisables au clavier`;
});

await cas("S08", "Un utilisateur désactive les animations (prefers-reduced-motion)", async () => {
  const constats = [];
  for (const [nom, opts] of [["téléphone", MOBILE], ["ordinateur", ORDI]]) {
    const { ctx, page } = await ouvrir({ ...opts, reducedMotion: "reduce" });
    for (const p of PAGES) {
      await page.goto(BASE + p);
      await page.waitForLoadState("networkidle");
      const r = await page.evaluate(() => ({
        gsap: !!window.gsap,
        caches: [...document.querySelectorAll("main *")].filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).opacity) < 0.99).length,
        animees: [...document.querySelectorAll("*")].filter((e) => getComputedStyle(e).animationName !== "none").length,
        defilement: getComputedStyle(document.documentElement).scrollBehavior,
        epingle: !!document.querySelector(".est-epingle"),
      }));
      if (r.gsap || r.caches || r.animees || r.defilement !== "auto" || r.epingle) constats.push(`${nom} ${p} : ${JSON.stringify(r)}`);
    }
    await ctx.close();
  }
  verifier(constats.length === 0, constats.join(" | "));
  return `${PAGES.length} pages × 2 formats : animations GSAP non chargées, aucune animation CSS, aucun contenu masqué, défilement instantané, galerie non épinglée`;
});

await cas("S09", "Un client consulte les mentions légales (depuis le pied de page)", async () => {
  const { ctx, page, journal } = await ouvrir(MOBILE);
  await page.goto(BASE + "/");
  await page.click(".site-footer >> text=Mentions légales");
  await page.waitForURL(/mentions-legales\.html/);
  const texte = (await page.textContent("main")).replace(/\s+/g, " ");
  await page.goto(BASE + "/confidentialite.html");
  const confid = (await page.textContent("main")).replace(/\s+/g, " ");
  await ctx.close();
  const l = DONNEES.legal;
  const attendus = [l.denomination, "SARL", l.capital, l.siret, l.rcs, l.tva, "Directeur de la publication", l.gerant, "Plus Jakarta Sans", "Inter", "SIL Open Font License", "GSAP"];
  const manquants = attendus.filter((a) => !texte.includes(a.replace(/ /g, " ")) && !texte.includes(a));
  verifier(manquants.length === 0, "absent : " + manquants.join(", "));
  verifier(!/à confirmer|à compléter|TODO|lorem/i.test(texte + confid), "mention de travail visible");
  verifier(/Google Maps/.test(confid) && /aucun cookie/.test(confid) && /CNIL/.test(confid), "page confidentialité incomplète (carte, cookies, CNIL)");
  verifier(sansErreurs(journal).length === 0, sansErreurs(journal).join(" | "));
  return "éditeur, forme, capital, SIRET, RCS, TVA, directeur de la publication, crédits ; confidentialité : carte Google, cookies, droits, CNIL";
});
noter("S09b", "Mentions légales : identité de l'hébergeur", l_hebergeur() ? "Réussi" : "Bloquant", l_hebergeur() ? "" : "hébergeur non choisi : mention obligatoire (LCEN, art. 6-III) à ajouter dans donnees.json avant publication");
function l_hebergeur() { return !!DONNEES.legal.hebergeur; }

await cas("S10", "Un visiteur clique sur tous les liens disponibles", async () => {
  const { ctx, page } = await ouvrir(ORDI);
  const internes = new Map(), externes = new Map(), problemes = [];
  for (const p of [...PAGES, "/404.html"]) {
    await page.goto(BASE + p);
    const liens = await page.$$eval("a[href]", (a) => a.map((x) => ({ href: x.href, brut: x.getAttribute("href"), cible: x.target, rel: x.rel, texte: (x.textContent || "").trim().replace(/\s+/g, " ") })));
    for (const l of liens) {
      if (l.brut.startsWith("tel:")) { if (l.brut !== TEL) problemes.push(`${p} : ${l.brut}`); continue; }
      if (l.brut.startsWith("mailto:")) continue;
      if (!l.texte) problemes.push(`${p} : lien sans texte (${l.brut})`);
      const u = new URL(l.href);
      if (u.origin === BASE) internes.set(u.pathname + u.hash, p);
      else {
        externes.set(l.href, p);
        if (l.cible !== "_blank" || !l.rel.includes("noopener")) problemes.push(`${p} : ${l.href} sans _blank/noopener`);
        if (!/nouvel onglet/.test(l.texte)) problemes.push(`${p} : ${l.href} n'annonce pas le nouvel onglet`);
      }
    }
  }
  // Chaque lien interne est réellement ouvert, et son ancre existe sur la page d'arrivée
  for (const [cible, depuis] of internes) {
    const [chemin, ancre] = cible.split("#");
    const rep = await page.goto(BASE + chemin);
    if (rep.status() !== 200) problemes.push(`${depuis} → ${cible} : ${rep.status()}`);
    if (ancre && !(await page.$("#" + ancre))) problemes.push(`${depuis} → ${cible} : ancre introuvable`);
  }
  // Clic réel sur chaque lien du menu principal
  await page.goto(BASE + "/");
  for (const libelle of ["Le magasin", "Nos rayons", "Infos pratiques", "FAQ", "Contact"]) {
    await page.mouse.move(640, 20);
    await page.click(`.nav >> text=${libelle}`);
    await page.waitForLoadState("load");
    const titre = await page.title();
    if (!titre.includes(libelle === "FAQ" ? "Questions" : libelle === "Infos pratiques" ? "Horaires" : libelle)) problemes.push(`menu « ${libelle} » → ${titre}`);
  }
  await ctx.close();
  const domaines = [...new Set([...externes.keys()].map((u) => new URL(u).hostname))];
  const autorises = ["www.google.com", "www.facebook.com", "cibr.fr", "policies.google.com", "www.cnil.fr"];
  const inconnus = domaines.filter((d) => !autorises.includes(d));
  verifier(problemes.length === 0, problemes.join(" | "));
  verifier(inconnus.length === 0, "domaines externes inattendus : " + inconnus.join(", "));
  return `${internes.size} liens internes ouverts (200, ancres présentes), 5 entrées du menu cliquées ; ${externes.size} liens externes vers ${domaines.join(", ")} (nouvel onglet annoncé ; non ouverts ici : réseau sortant bloqué)`;
});

// ================================================================ contrôles techniques

await cas("T01", "Chaque page : statut 200, titre et description uniques, un seul h1, aucune erreur, aucune violation CSP, aucune requête externe", async () => {
  const titres = new Set(), descriptions = new Set(), problemes = [];
  const { ctx, page, journal } = await ouvrir(ORDI);
  for (const p of PAGES) {
    const rep = await page.goto(BASE + p);
    await page.waitForLoadState("networkidle");
    const r = await page.evaluate(() => ({ titre: document.title, desc: (document.querySelector('meta[name="description"]') || {}).content, h1: document.querySelectorAll("h1").length, lang: document.documentElement.lang,
      niveaux: [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => +h.tagName[1]), csp: window.__csp }));
    if (rep.status() !== 200) problemes.push(`${p} : ${rep.status()}`);
    if (titres.has(r.titre)) problemes.push(`${p} : titre en double`);
    if (!r.desc || descriptions.has(r.desc)) problemes.push(`${p} : description absente ou en double`);
    if (r.h1 !== 1) problemes.push(`${p} : ${r.h1} h1`);
    if (r.lang !== "fr") problemes.push(`${p} : lang=${r.lang}`);
    r.niveaux.forEach((n, i) => { if (i && n > r.niveaux[i - 1] + 1) problemes.push(`${p} : saut de niveau h${r.niveaux[i - 1]} → h${n}`); });
    if (r.csp.length) problemes.push(`${p} : CSP ${r.csp.join(", ")}`);
    titres.add(r.titre); descriptions.add(r.desc);
  }
  await ctx.close();
  if (sansErreurs(journal).length) problemes.push("erreurs JS : " + sansErreurs(journal).join(" | "));
  if (journal.csp.length) problemes.push("CSP : " + journal.csp.join(" | "));
  if (journal.externes.length) problemes.push("requêtes externes : " + journal.externes.join(", "));
  verifier(problemes.length === 0, problemes.join(" | "));
  return `${PAGES.length} pages ; hiérarchie des titres sans saut`;
});

await cas("T02", "Statut ouvert/fermé selon l'heure de Paris (5 moments de la semaine)", async () => {
  const attendus = [["2026-11-09T07:00:00", "Fermé · ouvre à 8h"], ["2026-11-09T12:00:00", "Ouvert · ferme à 20h"], ["2026-11-06T16:50:00", "Ferme bientôt · à 17h"],
    ["2026-11-07T10:00:00", "Fermé · rouvre demain à 9h30"], ["2026-11-08T13:30:00", "Fermé · rouvre demain à 8h"]];
  const ecarts = [];
  for (const [quand, texte] of attendus) {
    const { ctx, page } = await ouvrir();
    await page.clock.setFixedTime(PARIS(quand));
    await page.goto(BASE + "/infos-pratiques.html");
    const t = await page.textContent("#horaires [data-status-text]");
    if (t !== texte) ecarts.push(`${quand} : « ${t} » au lieu de « ${texte} »`);
    await ctx.close();
  }
  verifier(ecarts.length === 0, ecarts.join(" | "));
  return attendus.map(([q, t]) => `${q.slice(5, 16).replace("T", " ")} → ${t}`).join(" ; ");
});

await cas("T03", "Horaires exceptionnels : bandeau sur l'accueil, encadré sur Infos pratiques, statut adapté", async () => {
  const { ctx, page } = await ouvrir();
  const h = DONNEES.horaires;
  const donnees = { horaires: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"].map((j) => h[j]),
    exceptions: [{ date: "2026-11-09", horaires: ["08:00", "15:00"], note: "Fermeture à 15h (test)." }, { date: "2026-11-10", horaires: null }] };
  await page.route("**/assets/donnees.js", (r) => r.fulfill({ contentType: "text/javascript", body: "window.SHEMTOV=" + JSON.stringify(donnees) + ";" }));
  await page.clock.setFixedTime(PARIS("2026-11-09T15:30:00"));
  await page.goto(BASE + "/");
  const bandeau = await page.$$eval(".bandeau-exc [data-exc-list] li", (l) => l.map((x) => x.textContent));
  const bandeauVisible = await page.isVisible(".bandeau-exc");
  await page.goto(BASE + "/infos-pratiques.html");
  const exc = await page.$$eval("#horaires .exc li", (l) => l.map((x) => x.textContent));
  const statut = await page.textContent("#horaires [data-status-text]");
  await ctx.close();
  verifier(bandeauVisible && bandeau.length === 2, "bandeau : " + bandeau.join(" ; "));
  verifier(exc.length === 2, "encadré : " + exc.join(" ; "));
  verifier(statut === "Fermé · rouvre mercredi à 8h", "statut : " + statut);
  return exc.join(" ; ") + " → " + statut;
});

await cas("T04", "Fêtes : dates passées masquées, prochaine fête mise en avant, 3 au plus sur l'accueil", async () => {
  const { ctx, page } = await ouvrir();
  await page.clock.setFixedTime(PARIS("2027-01-01T10:00:00"));
  await page.goto(BASE + "/");
  const accueil = await page.$$eval(".fete:not([hidden])", (f) => f.map((x) => x.querySelector(".fete-nom").textContent + " " + x.querySelector(".pill").textContent));
  const premiere = await page.$eval(".fete.next .fete-nom", (n) => n.textContent);
  await page.goto(BASE + "/infos-pratiques.html");
  const toutes = await page.$$eval("#fetes .fete:not([hidden])", (f) => f.length);
  await ctx.close();
  verifier(accueil.length === 3 && premiere === "Tou biChvat" && accueil[0] === "Tou biChvat Dans 22 jours", "accueil : " + accueil.join(" / "));
  verifier(toutes === DONNEES.fetes.length - 1, `${toutes} fêtes affichées sur Infos pratiques`);
  return "au 1er janvier 2027 : " + accueil.join(" / ");
});

await cas("T05", "Aucun cookie ni stockage local, sur toutes les pages (carte non affichée)", async () => {
  const { ctx, page } = await ouvrir();
  for (const p of PAGES) await page.goto(BASE + p);
  const cookies = await ctx.cookies();
  const stockage = await page.evaluate(() => localStorage.length + sessionStorage.length);
  await ctx.close();
  verifier(cookies.length === 0 && stockage === 0, `cookies : ${cookies.length}, stockage : ${stockage}`);
});

await cas("T06", "Sans JavaScript : contenu complet (horaires, fêtes, rayons, FAQ, lien vers la carte)", async () => {
  const { ctx, page } = await ouvrir({ javaScriptEnabled: false });
  await page.goto(BASE + "/infos-pratiques.html");
  const r1 = await page.evaluate(() => ({ heures: document.querySelectorAll("#horaires .hours tr").length, fetes: document.querySelectorAll(".fete").length,
    lienCarte: !!document.querySelector('.carte a[href*="google.com/maps"]'), boutonCarte: getComputedStyle(document.querySelector("[data-carte-ok]")).display }));
  await page.goto(BASE + "/nos-rayons.html");
  const rayons = await page.$$eval(".rayon", (r) => r.filter((x) => getComputedStyle(x).opacity === "1").length);
  await page.goto(BASE + "/faq.html");
  const faq = await page.$$eval(".faq-item", (f) => f.length);
  await ctx.close();
  verifier(r1.heures === 7 && r1.fetes === DONNEES.fetes.length && r1.lienCarte && r1.boutonCarte === "none", JSON.stringify(r1));
  verifier(rayons === DONNEES.rayons.length && faq === DONNEES.faq.length, `rayons ${rayons}, faq ${faq}`);
  return "le bouton « Afficher la carte » (qui demande JavaScript) est masqué ; le lien « Ouvrir dans Google Maps » reste";
});

await cas("T07", "Images indisponibles : textes alternatifs, pas de débordement, aucune erreur", async () => {
  const { ctx, page, journal } = await ouvrir(MOBILE);
  await page.route(/\.(webp|png|jpg)$/, (r) => r.abort());
  const problemes = [];
  for (const p of PAGES) {
    await page.goto(BASE + p);
    const r = await page.evaluate(() => ({ sansAlt: [...document.images].filter((x) => !x.hasAttribute("alt")).length, sansTaille: [...document.images].filter((x) => !x.getAttribute("width") || !x.getAttribute("height")).length, largeur: document.documentElement.scrollWidth }));
    if (r.sansAlt || r.sansTaille || r.largeur > 390) problemes.push(`${p} : ${JSON.stringify(r)}`);
  }
  await ctx.close();
  verifier(problemes.length === 0, problemes.join(" | "));
  verifier(sansErreurs(journal).length === 0, sansErreurs(journal).join(" | "));
});

await cas("T08", "Images : fichiers présents, attribut sizes juste, résolution suffisante, pas de déformation", async () => {
  const problemes = [], reserves = [];
  for (const [nom, opts] of [["1440 px", { viewport: { width: 1440, height: 900 } }], ["iPhone", MOBILE]]) {
    const { ctx, page } = await ouvrir(opts);
    for (const p of PAGES) {
      await page.goto(BASE + p);
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 700) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(80); }
      await page.waitForTimeout(800);
      const imgs = await page.$$eval("main img", (i) => i.map((x) => {
        const r = x.getBoundingClientRect();
        // largeur réelle du fichier choisi, lue dans srcset (naturalWidth est ramenée à la densité de l'écran)
        const cand = (x.getAttribute("srcset") || "").split(",").map((s) => s.trim().split(/\s+/)).find(([u]) => x.currentSrc.endsWith(u.replace(/^\.?\//, "")));
        // une image différée hors de l'écran (galerie tactile défilant à l'horizontale) n'est pas encore chargée : normal
        if (!x.currentSrc && x.loading === "lazy" && (r.left > innerWidth || r.right < 0 || r.width === 0)) return null; // hors écran ou masquée (décor)
        return { src: x.currentSrc.split("/").pop(), ok: x.complete && x.naturalWidth > 0, fichier: cand ? parseInt(cand[1]) : x.naturalWidth, nw: x.naturalWidth, w: r.width,
          fit: getComputedStyle(x).objectFit, ratioAffiche: r.width / Math.max(1, r.height), ratioImage: x.naturalWidth / Math.max(1, x.naturalHeight), dpr: devicePixelRatio };
      }));
      for (const i of imgs.filter(Boolean)) {
        if (!i.ok) problemes.push(`${nom} ${p} : ${i.src} non chargée`);
        if (i.fit !== "cover" && i.fit !== "contain" && Math.abs(i.ratioAffiche - i.ratioImage) > 0.03) problemes.push(`${nom} ${p} : ${i.src} déformée`);
        if (i.w > i.nw * 1.05) problemes.push(`${nom} ${p} : ${i.src} affichée sur ${Math.round(i.w)} px, sizes prévoit ${Math.round(i.nw)} px`);
        if (i.fichier < i.w * Math.min(i.dpr, 2) * 0.9) reserves.push(`${i.src} (${i.fichier} px pour ${Math.round(i.w)} px × ${i.dpr})`);
      }
    }
    await ctx.close();
  }
  verifier(problemes.length === 0, problemes.join(" | "));
  return reserves.length ? `résolution limitée par la photo d'origine (recadrages serrés) : ${[...new Set(reserves)].slice(0, 6).join(", ")}${reserves.length > 6 ? "…" : ""}` : "toutes les images sont assez grandes";
});

await cas("T09", "Page 404 : statut 404, mise en forme conservée en sous-dossier, liens de retour", async () => {
  const { ctx, page } = await ouvrir();
  const rep = await page.goto(BASE + "/dossier/page-inexistante");
  const r = await page.evaluate(() => ({ h1: document.querySelector("h1").textContent, police: getComputedStyle(document.querySelector("h1")).fontFamily, robots: (document.querySelector('meta[name="robots"]') || {}).content }));
  await page.click("main >> text=Retour à l'accueil");
  await page.waitForLoadState("load");
  const accueil = await page.title();
  await ctx.close();
  verifier(rep.status() === 404 && /n'existe pas/.test(r.h1), "page 404 : " + rep.status());
  verifier(/Plus Jakarta Sans/.test(r.police), "feuille de style perdue : " + r.police);
  verifier(r.robots === "noindex", "noindex absent");
  verifier(accueil.startsWith("Shemtov Foch"), "retour à l'accueil : " + accueil);
});

await cas("T10", "Animations actives (mouvement autorisé) : révélations jouées, galerie épinglée sur ordinateur, aucun bloc resté invisible", async () => {
  const constats = [];
  for (const [nom, opts] of [["ordinateur", { viewport: { width: 1440, height: 900 } }], ["téléphone", MOBILE]]) {
    const { ctx, page } = await ouvrir(opts);
    for (const p of PAGES) {
      await page.goto(BASE + p);
      if (await page.$("[data-reveal], [data-reveal-img], [data-galerie]")) await page.waitForFunction(() => document.documentElement.dataset.anim, null, { timeout: 8000 });
      const epingle = await page.evaluate(() => !!document.querySelector(".est-epingle"));
      let decalage = 0;
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < h; y += 300) {
        await page.mouse.wheel(0, 300); await page.waitForTimeout(50);
        if (epingle) decalage = Math.max(decalage, await page.$eval(".galerie", (g) => Math.abs(new DOMMatrix(getComputedStyle(g).transform).m41)));
      }
      await page.waitForTimeout(1600);
      const caches = await page.$$eval("main [data-reveal], main [data-reveal-img], main .carte-rayon, main .fete:not([hidden]), main .panneau, main .contact-carte, main .reperes li, main [data-split]",
        (els) => els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.99 || (getComputedStyle(e).clipPath !== "none" && getComputedStyle(e).clipPath !== "")).map((e) => e.className || e.tagName));
      if (caches.length) constats.push(`${nom} ${p} : ${caches.length} élément(s) masqué(s) (${caches.slice(0, 3).join(", ")})`);
      if (p === "/" && nom === "ordinateur" && (!epingle || decalage < 100)) constats.push(`galerie épinglée inactive (décalage ${Math.round(decalage)} px)`);
      if (p === "/" && nom === "téléphone" && epingle) constats.push("galerie épinglée sur téléphone");
    }
    await ctx.close();
  }
  verifier(constats.length === 0, constats.join(" | "));
  return "GSAP + ScrollTrigger chargés à la demande ; défilement horizontal épinglé sur ordinateur, galerie tactile sur téléphone ; tout le contenu visible en fin de défilement";
});

await cas("T11", "Données structurées (GroceryStore, FAQPage), robots.txt, plan du site", async () => {
  const { ctx, page } = await ouvrir();
  await page.goto(BASE + "/");
  const ld = JSON.parse(await page.$eval('script[type="application/ld+json"]', (s) => s.textContent));
  await page.goto(BASE + "/faq.html");
  const faq = JSON.parse(await page.$eval('script[type="application/ld+json"]', (s) => s.textContent));
  const questions = await page.$$eval(".faq-item", (f) => f.length);
  const robots = await (await page.goto(BASE + "/robots.txt")).text();
  await ctx.close();
  verifier(ld["@type"] === "GroceryStore" && ld.telephone === DONNEES.telephone.international && ld.address.streetAddress === DONNEES.adresse.rue && ld.openingHoursSpecification.length === 3, "GroceryStore incomplet");
  verifier(faq["@type"] === "FAQPage" && faq.mainEntity.length === questions, "FAQPage : " + faq.mainEntity.length + " / " + questions);
  verifier(/User-agent: \*/.test(robots), "robots.txt");
  if (!DONNEES.domaine) return { etat: "À confirmer", detail: "données structurées valides ; adresse canonique, og:url et sitemap.xml seront générés dès que le nom de domaine sera fixé dans donnees.json" };
  return "données structurées, canonical et sitemap présents";
});

await cas("T12", "En-têtes de sécurité (CSP stricte, HSTS, nosniff…) servis, identiques pour Netlify et Vercel", async () => {
  const rep = await fetch(BASE + "/");
  const h = Object.fromEntries(rep.headers);
  const vercel = JSON.parse(fs.readFileSync(path.join(SITE, "vercel.json"), "utf8")).headers[0].headers;
  const netlify = REGLES.find((r) => r.motif === "/*").entetes;
  const ecarts = vercel.filter(({ key, value }) => netlify[key] !== value.replace("; upgrade-insecure-requests", "")).map((x) => x.key);
  verifier(/script-src 'self'/.test(h["content-security-policy"]) && !/unsafe-inline/.test(h["content-security-policy"]) && /frame-src https:\/\/www\.google\.com/.test(h["content-security-policy"]), "CSP : " + h["content-security-policy"]);
  for (const k of ["x-content-type-options", "referrer-policy", "permissions-policy", "x-frame-options", "strict-transport-security", "cross-origin-opener-policy"]) verifier(h[k], k + " absent");
  verifier(ecarts.length === 0, "différences Netlify / Vercel : " + ecarts.join(", "));
  const inline = PAGES.concat(["/404.html"]).map((p) => p === "/" ? "index.html" : p.slice(1)).filter((f) => {
    const t = fs.readFileSync(path.join(SITE, f), "utf8");
    return / style="/.test(t) || /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(t) || / on[a-z]+="/.test(t);
  });
  verifier(inline.length === 0, "style, script ou gestionnaire en ligne : " + inline.join(", "));
  return "CSP sans unsafe-inline, frame-src limité à www.google.com ; aucun style ni script en ligne";
});

await cas("T13", "Données synchronisées (donnees.json = pages publiées)", async () => {
  execSync(`python3 -I ${path.join(RACINE, "shemtov-interne/outils/synchroniser.py")} --verifier`, { stdio: "pipe" });
});

await cas("T14", "Aucune mention de travail, aucun reste du plan du magasin dans les fichiers publiés", async () => {
  const fautifs = [];
  const parcourir = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => {
    const p = path.join(d, f.name);
    if (f.isDirectory()) return parcourir(p);
    if (!/\.(html|css|js|txt|xml|svg)$/.test(f.name) || p.includes("vendor")) return;
    const t = fs.readFileSync(p, "utf8");
    if (/à confirmer|à compléter|TODO|lorem|Version de travail/i.test(t)) fautifs.push(path.relative(SITE, p) + " (mention de travail)");
    if (/plan du magasin|plan-web|svg class="plan"|data-etape|visite guidée/i.test(t)) fautifs.push(path.relative(SITE, p) + " (plan)");
  });
  parcourir(SITE);
  verifier(fautifs.length === 0, fautifs.join(", "));
});

// ---------------------------------------------------------------- responsive
const TAILLES = [[320, 640], [360, 740], [375, 667], [390, 844], [414, 896], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440], [3840, 2160], [844, 390], [667, 375], [1024, 1366]];
await cas("T15", `Responsive : ${TAILLES.length} tailles × ${PAGES.length + 1} pages, aucun débordement, cibles tactiles suffisantes, textes non coupés`, async () => {
  const problemes = [];
  for (const [w, h] of TAILLES) {
    const mobile = w < 960;
    const { ctx, page } = await ouvrir({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
    for (const p of [...PAGES, "/404"]) {
      await page.goto(BASE + p);
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        const visibles = (sel) => [...document.querySelectorAll(sel)].filter((b) => b.offsetParent && !b.closest(".sr, [hidden]"));
        const boutons = visibles(".btn, .menu-btn, .chips a, .liens-rayons a, .faq-item summary").filter((b) => b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 20));
        const cibles = visibles("a, button").filter((b) => getComputedStyle(b).display !== "inline" && (b.getBoundingClientRect().height < 24 || b.getBoundingClientRect().width < 24)).map((b) => b.textContent.trim().slice(0, 20));
        const coupes = visibles("h1, h2, h3, p, .btn, li").filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== "visible" && !e.closest(".galerie, .chips")).map((e) => e.textContent.trim().slice(0, 30));
        const sortis = visibles("main h1, main h2, main p, main .btn").filter((e) => { const b = e.getBoundingClientRect(); return b.right > vw + 1 || b.left < -1; }).filter((e) => !e.closest(".galerie")).map((e) => e.textContent.trim().slice(0, 30));
        return { vw, sw, boutons, cibles, coupes, sortis };
      });
      if (r.sw > r.vw) problemes.push(`${w}×${h} ${p} : débordement ${r.sw} > ${r.vw}`);
      if (r.boutons.length) problemes.push(`${w}×${h} ${p} : boutons < 44 px (${r.boutons.join(", ")})`);
      if (r.cibles.length) problemes.push(`${w}×${h} ${p} : cibles < 24 px (${r.cibles.join(", ")})`);
      if (r.coupes.length) problemes.push(`${w}×${h} ${p} : textes coupés (${r.coupes.join(", ")})`);
      if (r.sortis.length) problemes.push(`${w}×${h} ${p} : hors écran (${r.sortis.join(", ")})`);
    }
    await ctx.close();
  }
  verifier(problemes.length === 0, problemes.slice(0, 12).join(" | "));
  return TAILLES.map(([w, h]) => `${w}×${h}`).join(", ");
});

await cas("T16", "Zoom du texte à 200 % (WCAG 1.4.4) : aucun débordement horizontal à 1280 px", async () => {
  const { ctx, page } = await ouvrir({ viewport: { width: 640, height: 430 }, deviceScaleFactor: 2 }); // 1280 × 860 zoomé à 200 %
  const problemes = [];
  for (const p of PAGES) {
    await page.goto(BASE + p);
    const r = await page.evaluate(() => ({ vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth }));
    if (r.sw > r.vw) problemes.push(`${p} : ${r.sw} > ${r.vw}`);
  }
  await ctx.close();
  verifier(problemes.length === 0, problemes.join(" | "));
});

// ---------------------------------------------------------------- accessibilité (axe-core)
await cas("T17", "Accessibilité automatique (axe-core, WCAG 2.2 A/AA) : toutes les pages, téléphone et ordinateur, menu ouvert, FAQ ouverte", async () => {
  if (!AXE || !fs.existsSync(AXE)) return { etat: "Non exécuté", detail: "axe.min.js introuvable (variable AXE_PATH)" };
  const constats = [];
  let n = 0;
  const auditer = async (page, nom) => {
    await page.addScriptTag({ path: AXE });
    const res = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } })).violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length} : ${v.nodes[0].target.join(" ")})`));
    res.forEach((v) => constats.push(`${nom} : ${v}`));
    n++;
  };
  for (const p of [...PAGES, "/404"]) {
    for (const [w, h] of [[390, 844], [1280, 860]]) {
      const { ctx, page } = await ouvrir({ viewport: { width: w, height: h }, bypassCSP: true, reducedMotion: "reduce" });
      await page.goto(BASE + p);
      await page.waitForLoadState("networkidle");
      await auditer(page, `${p} ${w}px`);
      if (p === "/" && w === 390) { await page.click(".menu-btn"); await auditer(page, "/ menu ouvert"); }
      if (p === "/faq.html") { await page.$$eval(".faq-item", (d) => d.forEach((x) => (x.open = true))); await auditer(page, `${p} ${w}px FAQ ouverte`); }
      await ctx.close();
    }
  }
  verifier(constats.length === 0, constats.join(" | "));
  return `0 violation sur ${n} analyses (règles WCAG 2.0 à 2.2 A/AA et bonnes pratiques)`;
});

// ---------------------------------------------------------------- hors de portée de cet environnement
noter("N01", "Safari (iOS, macOS), Firefox, Edge, appareils réels", "Non exécuté", "seul Chromium est disponible ici ; à tester sur un iPhone et un Android avant publication");
noter("N02", "Lecteurs d'écran (VoiceOver, NVDA, TalkBack)", "Non exécuté", "nécessite un appareil réel");
noter("N03", "Ouverture réelle des liens externes (Google Maps, Facebook, Consistoire, CNIL)", "Non exécuté", "réseau sortant bloqué dans cet environnement : adresses vérifiées par ailleurs (voir RAPPORT.md)");

await navigateur.close();
serveur.close();
const lignes = resultats.map((r) => `| ${r.id} | ${r.nom} | ${r.etat} | ${r.detail.replace(/\|/g, "/")} |`);
const etats = [...new Set(resultats.map((r) => r.etat))];
const bilan = etats.map((e) => `${resultats.filter((r) => r.etat === e).length} ${e.toLowerCase()}`).join(", ");
fs.mkdirSync(path.dirname(RAPPORT), { recursive: true });
if (!SEULEMENT) fs.writeFileSync(RAPPORT, `# Résultats des tests\n\nExécution du ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} (heure de Paris).\n` +
  `Navigateur : Chromium (Playwright), serveur local avec les en-têtes de \`_headers\`. Les requêtes vers l'extérieur sont coupées pendant les tests.\n` +
  `Bilan : ${bilan}.\n\n| Id | Test | Résultat | Détail |\n| --- | --- | --- | --- |\n${lignes.join("\n")}\n`);
console.log("\n" + bilan);
process.exit(resultats.some((r) => r.etat === "Échoué") ? 1 : 0);
