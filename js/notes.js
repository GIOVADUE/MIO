/* Note stile Google Keep */
const NOTE_COLORS = ['default', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'brown', 'gray'];

const Notes = {
  seed() {
    return [
      { id: uid(), title: 'Spesa', text: '', items: [{ text: 'Latte', done: false }, { text: 'Pane', done: true }, { text: 'Caffè', done: false }], color: 'yellow', pinned: true, updated: Date.now() },
      { id: uid(), title: 'Idea', text: 'Le note si salvano da sole.\nTocca una nota per modificarla.', items: null, color: 'teal', pinned: false, updated: Date.now() - 1000 }
    ];
  },
  all() {
    let l = Store.get('notes', null);
    if (!l) { l = this.seed(); this.save(l); }
    return l;
  },
  save(l) { Store.set('notes', l); },
  add(n) {
    const note = { id: uid(), title: '', text: '', items: null, color: 'default', pinned: false, updated: Date.now(), ...n };
    const l = this.all();
    l.unshift(note);
    this.save(l);
    return note;
  },
  put(note) {
    const l = this.all(), i = l.findIndex(x => x.id === note.id);
    note.updated = Date.now();
    if (i >= 0) l[i] = note; else l.unshift(note);
    this.save(l);
  },
  remove(id) { this.save(this.all().filter(x => x.id !== id)); },
  isEmpty(n) { return !n.title.trim() && !n.text.trim() && !(n.items || []).some(i => i.text.trim()); },

  card(n) {
    const body = n.items
      ? `<ul class="nc-list">${n.items.slice(0, 8).map((it, i) => `<li class="${it.done ? 'done' : ''}"><input type="checkbox" data-i="${i}" ${it.done ? 'checked' : ''}><span>${esc(it.text)}</span></li>`).join('')}
         ${n.items.length > 8 ? `<li class="muted">+ altri ${n.items.length - 8}</li>` : ''}</ul>`
      : `<div class="nc-text">${linkify(esc(n.text))}</div>`;
    return `<div class="note-card c-${n.color}" data-id="${n.id}" tabindex="0">
      <button class="nc-pin ${n.pinned ? 'on' : ''}" title="${n.pinned ? 'Sblocca' : 'Fissa'}" aria-label="Fissa">📌</button>
      ${n.title ? `<div class="nc-title">${esc(n.title)}</div>` : ''}
      ${body}
    </div>`;
  },

  editor(note, onDone) {
    const n = JSON.parse(JSON.stringify(note));
    const m = openModal(`<div class="note-edit c-${n.color}">
        <input class="ne-title" placeholder="Titolo" value="${esc(n.title)}" aria-label="Titolo">
        <div class="ne-body"></div>
        <div class="ne-bar">
          <div class="ne-colors">${NOTE_COLORS.map(c => `<button class="dot c-${c} ${c === n.color ? 'on' : ''}" data-c="${c}" title="${c}" aria-label="Colore ${c}"></button>`).join('')}</div>
          <div class="row gap">
            <button class="icon-btn" data-a="list" title="Elenco con caselle">☑</button>
            <button class="icon-btn" data-a="pin" title="Fissa">📌</button>
            <button class="icon-btn" data-a="del" title="Elimina">🗑️</button>
            <button class="btn ghost" data-a="close">Chiudi</button>
          </div>
        </div></div>`, { cls: 'note-modal', onClose: finish });
    const wrap = $('.note-edit', m.el), body = $('.ne-body', m.el);
    let deleted = false;

    function drawBody() {
      $('[data-a=pin]', m.el).classList.toggle('on', n.pinned);
      if (!n.items) {
        body.innerHTML = `<textarea class="ne-text" placeholder="Scrivi una nota…" aria-label="Testo">${esc(n.text)}</textarea>`;
        const ta = $('textarea', body);
        const grow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
        ta.oninput = () => { n.text = ta.value; grow(); };
        setTimeout(grow);
        return;
      }
      body.innerHTML = `<ul class="ne-list">${n.items.map((it, i) => `<li><input type="checkbox" data-i="${i}" ${it.done ? 'checked' : ''}>
        <input class="ne-item ${it.done ? 'done' : ''}" data-i="${i}" value="${esc(it.text)}" aria-label="Elemento"><button class="icon-btn sm" data-x="${i}" aria-label="Rimuovi">×</button></li>`).join('')}
        <li class="ne-add"><span>+</span><input placeholder="Elemento dell'elenco" aria-label="Nuovo elemento"></li></ul>`;
      $('.ne-add input', body).oninput = e => {
        n.items.push({ text: e.target.value, done: false });
        drawBody();
        const last = $$('.ne-item', body).pop();
        last.focus();
        last.setSelectionRange(last.value.length, last.value.length);
      };
    }
    body.addEventListener('input', e => { if (e.target.matches('.ne-item')) n.items[e.target.dataset.i].text = e.target.value; });
    body.addEventListener('change', e => { if (e.target.type === 'checkbox') { n.items[e.target.dataset.i].done = e.target.checked; drawBody(); } });
    body.addEventListener('click', e => { const x = e.target.closest('[data-x]'); if (x) { n.items.splice(+x.dataset.x, 1); drawBody(); } });
    body.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.matches('.ne-item')) {
        e.preventDefault();
        const i = +e.target.dataset.i;
        n.items.splice(i + 1, 0, { text: '', done: false });
        drawBody();
        $$('.ne-item', body)[i + 1].focus();
      }
    });
    $('.ne-title', m.el).oninput = e => { n.title = e.target.value; };
    $('.ne-colors', m.el).onclick = e => {
      const b = e.target.closest('.dot');
      if (!b) return;
      wrap.classList.remove('c-' + n.color);
      n.color = b.dataset.c;
      wrap.classList.add('c-' + n.color);
      $$('.dot', m.el).forEach(d => d.classList.toggle('on', d === b));
    };
    $('.ne-bar', m.el).addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'list') {
        if (n.items) { n.text = n.items.map(i => i.text).filter(Boolean).join('\n'); n.items = null; }
        else { n.items = n.text.split('\n').filter(t => t.trim()).map(t => ({ text: t, done: false })); n.text = ''; }
        drawBody();
      } else if (a === 'pin') { n.pinned = !n.pinned; drawBody(); }
      else if (a === 'del') { deleted = true; m.close(); }
      else if (a === 'close') m.close();
    });

    function finish() {
      if (n.items) n.items = n.items.filter(i => i.text.trim());
      if (deleted || Notes.isEmpty(n)) { Notes.remove(n.id); if (deleted) toast('Nota eliminata'); }
      else if (JSON.stringify(n) !== JSON.stringify(note) || !Notes.all().some(x => x.id === n.id)) Notes.put(n);
      onDone && onDone();
    }
    drawBody();
    setTimeout(() => (n.title || n.text || n.items ? null : $('.ne-text', body)?.focus()));
  }
};

function linkify(s) {
  return s.replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.length > 50 ? u.slice(0, 50) + '…' : u}</a>`);
}

Views.note = {
  title: 'Note',
  render(view) {
    let filter = '';
    view.innerHTML = `
      <div class="view">
        <div class="view-head">
          <h1>💡 Note</h1>
          <form class="search" onsubmit="return false"><input type="search" id="nqFilter" placeholder="Cerca nelle note" aria-label="Cerca nelle note"></form>
        </div>
        <div class="composer">
          <button class="composer-input" id="nNew">Scrivi una nota…</button>
          <button class="icon-btn" id="nNewList" title="Nuovo elenco" aria-label="Nuovo elenco">☑</button>
        </div>
        <div id="nAll"></div>
      </div>`;
    const all = $('#nAll', view);

    function paint() {
      const f = filter.toLowerCase();
      const list = Notes.all().filter(n => !f || (n.title + ' ' + n.text + ' ' + (n.items || []).map(i => i.text).join(' ')).toLowerCase().includes(f));
      const pinned = list.filter(n => n.pinned), other = list.filter(n => !n.pinned);
      const sec = (label, arr) => arr.length ? `${label ? `<div class="sec-label">${label}</div>` : ''}<div class="masonry">${arr.map(n => Notes.card(n)).join('')}</div>` : '';
      all.innerHTML = list.length
        ? sec(pinned.length ? 'Fissate' : '', pinned) + sec(pinned.length && other.length ? 'Altre' : '', other)
        : `<div class="empty"><div class="big-emoji">💡</div>${filter ? 'Nessuna nota trovata' : 'Le note che aggiungi appariranno qui'}</div>`;
    }

    $('#nqFilter', view).oninput = e => { filter = e.target.value; paint(); };
    $('#nNew', view).onclick = () => Notes.editor({ id: uid(), title: '', text: '', items: null, color: 'default', pinned: false }, paint);
    $('#nNewList', view).onclick = () => Notes.editor({ id: uid(), title: '', text: '', items: [], color: 'default', pinned: false }, paint);
    all.addEventListener('click', e => {
      const card = e.target.closest('.note-card');
      if (!card || e.target.closest('a')) return;
      const note = Notes.all().find(n => n.id === card.dataset.id);
      if (e.target.closest('.nc-pin')) { note.pinned = !note.pinned; Notes.put(note); return paint(); }
      if (e.target.matches('input[type=checkbox]')) { note.items[e.target.dataset.i].done = e.target.checked; Notes.put(note); return paint(); }
      Notes.editor(note, paint);
    });
    all.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.note-card')) e.target.click(); });
    paint();
  }
};
