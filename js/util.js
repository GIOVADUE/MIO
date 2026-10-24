/* Utility condivise da tutte le sezioni */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const startOfWeek = d => addDays(d, -((d.getDay() + 6) % 7));
const sameDay = (a, b) => ymd(a) === ymd(b);

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const GIORNI_BREVI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']; // da lunedì

function fullDate(d) {
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}

function timeAgo(date) {
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (isNaN(s)) return '';
  if (s < 60) return 'ora';
  if (s < 3600) return `${Math.floor(s / 60)} min fa`;
  if (s < 86400) return `${Math.floor(s / 3600)} h fa`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} g fa`;
  return `${date.getDate()} ${MESI[date.getMonth()].slice(0, 3).toLowerCase()}`;
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* Salvataggio locale (localStorage). Tutto resta nel tuo browser. */
const Store = {
  get(key, def) {
    try { const v = localStorage.getItem('mio.' + key); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(key, val) {
    try {
      localStorage.setItem('mio.' + key, JSON.stringify(val));
      if (!Store.local.includes(key)) {
        localStorage.setItem('mio.__changed', Date.now());
        document.dispatchEvent(new Event('mio:changed'));
      }
    } catch (e) {
      toast(e && e.name === 'QuotaExceededError'
        ? 'Spazio esaurito: elimina qualche immagine o esporta un backup'
        : 'Impossibile salvare: memoria del browser non disponibile');
    }
  },
  // chiavi che restano su questo dispositivo e non vengono sincronizzate
  local: ['turniMode', 'calMode', 'tempoMode', 'tempoLen', 'tempoTimer', 'firedAlerts', '__changed', '__synced'],
  keys() {
    try { return Object.keys(localStorage).filter(k => k.startsWith('mio.')); } catch { return []; }
  }
};

function toast(msg) {
  let box = $('#toasts');
  if (!box) { box = el('<div id="toasts"></div>'); document.body.appendChild(box); }
  const t = el(`<div class="toast">${esc(msg)}</div>`);
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

/* Finestra modale generica. Restituisce { el, close } */
function openModal(content, { cls = '', onClose } = {}) {
  const back = el(`<div class="modal-back"><div class="modal ${cls}" role="dialog" aria-modal="true"></div></div>`);
  const box = back.firstElementChild;
  if (typeof content === 'string') box.innerHTML = content; else box.appendChild(content);
  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add('in'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    onClose && onClose();
    back.classList.remove('in');
    setTimeout(() => back.remove(), 180);
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  return { el: box, close };
}

function download(filename, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function pickFile(accept) {
  return new Promise(res => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    i.onchange = () => res(i.files[0] || null);
    i.click();
  });
}

function decodeEntities(s) {
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}

/* Registro delle viste: ogni sezione aggiunge Views.nome = { title, render(container, param) } */
const Views = {};
