/* Notifications brèves : sauvegardes, exports, erreurs. */
import { icon } from './icons.js';
import { esc } from './util.js';

let host = null;
function root(){
  if (!host){
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

const ICONS = { ok:'checkCircle', bad:'warning', warn:'warning', info:'info' };

export function toast(message, type = 'ok', { duration = 2600, action } = {}){
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(ICONS[type] || 'info')}<span class="grow">${esc(message)}</span>`;
  if (action){
    const b = document.createElement('button');
    b.className = 'btn sm ghost';
    b.style.color = '#fff';
    b.textContent = action.label;
    b.onclick = () => { close(); action.fn(); };
    el.appendChild(b);
  }
  root().appendChild(el);
  let timer = setTimeout(close, duration);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => { timer = setTimeout(close, 1200); });

  function close(){
    clearTimeout(timer);
    if (!el.isConnected) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }
  return close;
}

export const saved = (what = 'Modifications enregistrées') => toast(what, 'ok', { duration: 1700 });
export const failed = (what) => toast(what, 'bad', { duration: 4200 });
