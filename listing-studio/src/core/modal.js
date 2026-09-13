/* Modales, confirmations et invites. Toute suppression passe par `confirm`. */
import { esc, $ } from './util.js';
import { icon } from './icons.js';

let rootEl = null;
const stack = [];

function root(){
  if (!rootEl){
    rootEl = document.createElement('div');
    rootEl.className = 'modal-root';
    rootEl.innerHTML = '<div class="modal-back"></div>';
    document.body.appendChild(rootEl);
    rootEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-back')) top()?.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && stack.length) top().close();
    });
  }
  return rootEl;
}
const top = () => stack[stack.length - 1];

/**
 * @param {{title:string, subtitle?:string, body:string|Node, footer?:string|Node,
 *          size?:'', wide?:boolean, full?:boolean, onMount?:Function, onClose?:Function,
 *          dismissable?:boolean}} opts
 */
export function openModal(opts){
  const r = root();
  const el = document.createElement('div');
  el.className = `modal ${opts.wide ? 'wide' : ''} ${opts.full ? 'full' : ''}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="modal-head">
      <div>
        <h3>${esc(opts.title || '')}</h3>
        ${opts.subtitle ? `<div class="muted" style="font-size:12.8px;margin-top:3px">${esc(opts.subtitle)}</div>` : ''}
      </div>
      ${opts.dismissable === false ? '' : `<button class="icon-btn" data-close aria-label="Fermer">${icon('x')}</button>`}
    </div>
    <div class="modal-body"></div>`;
  const body = $('.modal-body', el);
  if (typeof opts.body === 'string') body.innerHTML = opts.body;
  else if (opts.body) body.appendChild(opts.body);

  if (opts.footer){
    const f = document.createElement('div');
    f.className = 'modal-foot';
    if (typeof opts.footer === 'string') f.innerHTML = opts.footer;
    else f.appendChild(opts.footer);
    el.appendChild(f);
  }

  r.appendChild(el);
  r.classList.add('on');
  document.body.style.overflow = 'hidden';

  const handle = {
    el, body,
    close(result){
      const i = stack.indexOf(handle);
      if (i >= 0) stack.splice(i, 1);
      el.remove();
      if (!stack.length){ r.classList.remove('on'); document.body.style.overflow = ''; }
      opts.onClose?.(result);
    },
  };
  stack.push(handle);
  el.querySelector('[data-close]')?.addEventListener('click', () => handle.close());
  opts.onMount?.(handle);
  setTimeout(() => (el.querySelector('[autofocus], .btn.primary, .input') || el).focus?.(), 30);
  return handle;
}

export function confirm({ title = 'Confirmer', message = '', confirmLabel = 'Confirmer',
                          cancelLabel = 'Annuler', danger = false, detail = '' } = {}){
  return new Promise(res => {
    let done = false;
    const h = openModal({
      title,
      body: `<p class="muted">${esc(message)}</p>${detail ? `<div class="callout warn" style="margin-top:14px">${icon('warning')}<div>${esc(detail)}</div></div>` : ''}`,
      footer: `<button class="btn" data-no>${esc(cancelLabel)}</button>
               <button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(confirmLabel)}</button>`,
      onClose(){ if (!done) res(false); },
      onMount(h2){
        h2.el.querySelector('[data-no]').onclick = () => { done = true; h2.close(); res(false); };
        h2.el.querySelector('[data-yes]').onclick = () => { done = true; h2.close(); res(true); };
      },
    });
    void h;
  });
}

export function promptText({ title = 'Saisir', label = '', value = '', placeholder = '',
                             confirmLabel = 'Valider', multiline = false } = {}){
  return new Promise(res => {
    let done = false;
    openModal({
      title,
      body: `<div class="field">
          ${label ? `<label for="pm-i">${esc(label)}</label>` : ''}
          ${multiline
            ? `<textarea id="pm-i" class="textarea" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
            : `<input id="pm-i" class="input" value="${esc(value)}" placeholder="${esc(placeholder)}" autofocus>`}
        </div>`,
      footer: `<button class="btn" data-no>Annuler</button>
               <button class="btn primary" data-yes>${esc(confirmLabel)}</button>`,
      onClose(){ if (!done) res(null); },
      onMount(h){
        const input = h.el.querySelector('#pm-i');
        const ok = () => { done = true; const v = input.value.trim(); h.close(); res(v || null); };
        h.el.querySelector('[data-yes]').onclick = ok;
        h.el.querySelector('[data-no]').onclick = () => { done = true; h.close(); res(null); };
        input.addEventListener('keydown', e => { if (e.key === 'Enter' && !multiline) ok(); });
        setTimeout(() => input.focus(), 40);
      },
    });
  });
}

export const closeAllModals = () => { while (stack.length) top().close(); };
