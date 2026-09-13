/* Outils transverses : DOM, formats, identifiants, presse-papiers, fichiers.
   Aucune dépendance externe — l'app doit fonctionner hors connexion. */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Échappe systématiquement tout contenu saisi par l'utilisateur. */
export function esc(v){
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/** Crée un élément à partir d'une chaîne HTML. */
export function frag(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function on(root, evt, sel, fn){
  root.addEventListener(evt, (e) => {
    const t = e.target.closest(sel);
    if (t && root.contains(t)) fn(e, t);
  });
}

export function uid(prefix = 'id'){
  const rnd = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));
  return `${prefix}_${rnd.replace(/-/g,'').slice(0, 16)}`;
}

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const round = (n, d = 0) => { const f = 10 ** d; return Math.round(n * f) / f; };
export const sum = (arr) => arr.reduce((a, b) => a + b, 0);
export const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);
export const uniq = (arr) => Array.from(new Set(arr));

export function debounce(fn, ms = 320){
  let t;
  const wrapped = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  wrapped.cancel = () => clearTimeout(t);
  wrapped.flush = (...args) => { clearTimeout(t); fn(...args); };
  return wrapped;
}

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export function slug(s){
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0, 60) || 'sans-titre';
}

export function initials(name){
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

/* ---------- Formats ---------- */
const NF = new Intl.NumberFormat('fr-FR');
export const num = (n) => NF.format(Math.round(Number(n) || 0));
export function money(n, currency = 'EUR'){
  const v = Number(n);
  if (!isFinite(v)) return '—';
  return new Intl.NumberFormat('fr-FR', { style:'currency', currency, maximumFractionDigits:0 }).format(v);
}
export function dateFR(ts, withTime = false){
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d)) return '—';
  const o = { day:'2-digit', month:'short', year:'numeric' };
  if (withTime){ o.hour = '2-digit'; o.minute = '2-digit'; }
  return d.toLocaleDateString('fr-FR', o).replace('.', '');
}
export function relTime(ts){
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j === 1) return 'hier';
  if (j < 31) return `il y a ${j} jours`;
  return dateFR(ts);
}
export function plural(n, one, many){ return `${num(n)} ${Number(n) > 1 ? many : one}`; }

/* ---------- Texte ---------- */
export const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
export function trimTo(s, max){
  const str = String(s || '');
  if (str.length <= max) return str;
  const cut = str.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' ; '), cut.lastIndexOf(', '));
  return (stop > max * 0.6 ? cut.slice(0, stop + 1) : cut.slice(0, cut.lastIndexOf(' '))).trim();
}
export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
/** Liste « a, b et c ». */
export function listFR(arr){
  const a = arr.filter(Boolean);
  if (!a.length) return '';
  if (a.length === 1) return a[0];
  return a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
}

/* ---------- Presse-papiers & fichiers ---------- */
export async function copy(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch{
    try{
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }catch{ return false; }
  }
}

export function download(filename, content, mime = 'text/plain;charset=utf-8'){
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function readFileAsDataURL(file){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(fr.error || new Error('Lecture du fichier impossible'));
    fr.readAsDataURL(file);
  });
}

export function loadImage(src){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Image illisible'));
    img.src = src;
  });
}

/* ---------- Divers ---------- */
export const deepClone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

/** Générateur pseudo-aléatoire déterministe (mode démo reproductible). */
export function seeded(seed){
  let s = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
export const pick = (arr, rnd = Math.random) => arr[Math.floor(rnd() * arr.length) % arr.length];
