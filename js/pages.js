/* Pagine stile Notion (versione semplificata) */
const Pages = {
  seed() {
    return [{
      id: 'benvenuto', icon: '👋', title: 'Benvenuto in MIO', updated: Date.now(),
      content: `
<p>MIO è il tuo spazio personale: pagine, notizie, posta, turni, note e calendario in un unico posto.</p>
<h2>Come scrivere</h2>
<ul>
<li>Usa la barra degli strumenti sopra il testo per titoli, elenchi, citazioni e caselle di controllo.</li>
<li>Scorciatoie: scrivi <code># </code> per un titolo, <code>- </code> per un elenco, <code>[] </code> per una casella, <code>&gt; </code> per una citazione.</li>
</ul>
<div class="todo"><input type="checkbox" checked><span>Apri MIO</span></div>
<div class="todo"><input type="checkbox"><span>Crea la tua prima pagina con il tasto + nella barra laterale</span></div>
<div class="todo"><input type="checkbox"><span>Inserisci i colleghi nella tabella Turni</span></div>
<div class="todo"><input type="checkbox"><span>Collega Gmail dalle Impostazioni</span></div>
<blockquote>Tutto viene salvato automaticamente nel browser.</blockquote>`
    }];
  },
  all() { return Store.get('pages', null) ?? this.seed(); },
  save(list) { Store.set('pages', list); },
  get(id) { return this.all().find(p => p.id === id); },
  update(id, patch) {
    const list = this.all();
    const p = list.find(x => x.id === id);
    if (!p) return;
    Object.assign(p, patch, { updated: Date.now() });
    this.save(list);
  },
  create() {
    const p = { id: uid(), icon: '📄', title: '', content: '', updated: Date.now() };
    const list = this.all();
    list.unshift(p);
    this.save(list);
    renderPagesNav();
    location.hash = '#/pagina/' + p.id;
  },
  remove(id) {
    this.save(this.all().filter(p => p.id !== id));
    renderPagesNav();
  }
};

// Riduce le immagini (max 1200px, JPEG) per non esaurire la memoria del browser
function shrinkImage(file, max = 1200) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d');
      const png = file.type === 'image/png' && file.size < 200000;
      if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}

const EMOJI = ['📄', '📝', '📌', '📚', '💼', '🏠', '🎯', '✅', '💡', '🧠', '📊', '🗂️', '✈️', '🍝', '🏋️', '🎵', '🎬', '🛒', '💰', '❤️', '⭐', '🔥', '🌱', '🚀', '🧾', '📞', '🛠️', '🎓', '🐶', '☕'];

function renderPagesNav() {
  const nav = $('#pagesNav');
  if (!nav) return;
  nav.innerHTML = Pages.all().map(p =>
    `<a href="#/pagina/${p.id}" data-page="${p.id}"><span class="ico">${esc(p.icon)}</span><span class="ellipsis">${esc(p.title || 'Senza titolo')}</span></a>`
  ).join('');
  markActiveNav();
}

Views.pagina = {
  title: 'Pagina',
  render(view, id) {
    const page = Pages.get(id);
    if (!page) { location.hash = '#/dashboard'; return; }
    view.innerHTML = `
      <div class="view page">
        <div class="page-top">
          <button class="page-icon" id="pIcon" title="Cambia icona">${esc(page.icon)}</button>
          <div class="spacer"></div>
          <span class="muted small" id="pSaved"></span>
          <button class="icon-btn" id="pDel" title="Elimina pagina" aria-label="Elimina pagina">🗑️</button>
        </div>
        <h1 class="page-title" id="pTitle" contenteditable="true" data-placeholder="Senza titolo" spellcheck="false">${esc(page.title)}</h1>
        <div class="toolbar" id="pTools">
          <button data-block="P" title="Testo">Aa</button>
          <button data-block="H2" title="Titolo">T1</button>
          <button data-block="H3" title="Sottotitolo">T2</button>
          <span class="sep"></span>
          <button data-cmd="bold" title="Grassetto"><b>B</b></button>
          <button data-cmd="italic" title="Corsivo"><i>I</i></button>
          <button data-cmd="underline" title="Sottolineato"><u>U</u></button>
          <button data-cmd="strikeThrough" title="Barrato"><s>S</s></button>
          <span class="sep"></span>
          <button data-cmd="insertUnorderedList" title="Elenco puntato">•</button>
          <button data-cmd="insertOrderedList" title="Elenco numerato">1.</button>
          <button data-act="todo" title="Casella di controllo">☑</button>
          <button data-block="BLOCKQUOTE" title="Citazione">❝</button>
          <button data-block="PRE" title="Codice">&lt;/&gt;</button>
          <button data-cmd="insertHorizontalRule" title="Divisore">—</button>
          <button data-act="link" title="Link">🔗</button>
          <button data-act="image" title="Immagine (puoi anche incollarla o trascinarla)">🖼️</button>
        </div>
        <div class="editor" id="pEditor" contenteditable="true" data-placeholder="Inizia a scrivere…">${page.content}</div>
        <div class="tpl-box" id="pTpl" hidden>
          <div class="sec-label">Oppure inizia con un modello</div>
          <div class="tpl-grid">${TEMPLATES.map((t, i) => `<button class="tpl" data-t="${i}"><span>${t.icon}</span>${esc(t.name)}</button>`).join('')}</div>
        </div>
      </div>`;

    const titleEl = $('#pTitle', view);
    const editor = $('#pEditor', view);
    const saved = $('#pSaved', view);
    document.execCommand('defaultParagraphSeparator', false, 'p');

    const save = debounce(() => {
      Pages.update(id, { title: titleEl.textContent.trim(), content: editor.innerHTML });
      saved.textContent = 'Salvato';
      renderPagesNav();
    }, 400);
    const dirty = () => { saved.textContent = '…'; save(); syncTpl(); };

    // Modelli: visibili solo finché la pagina è vuota
    const tplBox = $('#pTpl', view);
    function syncTpl() {
      tplBox.hidden = !!(editor.textContent.trim() || $('img', editor) || titleEl.textContent.trim());
      view.firstElementChild.classList.toggle('is-empty', !tplBox.hidden);
    }
    syncTpl();
    tplBox.onclick = e => {
      const b = e.target.closest('.tpl');
      if (!b) return;
      const t = TEMPLATES[b.dataset.t], now = new Date();
      titleEl.textContent = t.title(now);
      editor.innerHTML = t.html(now).trim();
      Pages.update(id, { icon: t.icon, title: titleEl.textContent, content: editor.innerHTML });
      $('#pIcon', view).textContent = t.icon;
      renderPagesNav();
      syncTpl();
      const first = editor.querySelector('li, .todo span, p');
      if (first) { editor.focus(); placeCaret(first); }
    };

    // Immagini: pulsante, incolla, trascina. Vengono ridimensionate per non riempire la memoria.
    let savedRange = null;
    const keepRange = () => { const s = getSelection(); if (s.rangeCount && editor.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); };
    editor.addEventListener('keyup', keepRange);
    editor.addEventListener('mouseup', keepRange);
    async function insertImages(files) {
      for (const f of files) {
        if (!f.type.startsWith('image/')) { toast('Si possono inserire solo immagini'); continue; }
        try {
          const src = await shrinkImage(f);
          editor.focus();
          if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
          document.execCommand('insertHTML', false, `<img class="pimg" data-size="l" src="${src}" alt="">`);
          keepRange();
        } catch { toast('Impossibile leggere questa immagine'); }
      }
      dirty();
    }
    editor.addEventListener('paste', e => {
      const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); keepRange(); insertImages(files); }
    });
    editor.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
    editor.addEventListener('drop', e => {
      const files = [...(e.dataTransfer?.files || [])];
      if (!files.length) return;
      e.preventDefault();
      const r = document.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (r) savedRange = r;
      insertImages(files);
    });

    // Clic su un'immagine: dimensione o elimina
    editor.addEventListener('click', e => {
      const img = e.target.closest('img.pimg');
      $('.img-pop')?.remove();
      if (!img) return;
      const pop = el(`<div class="img-pop">
        <button data-s="s">Piccola</button><button data-s="m">Media</button><button data-s="l">Grande</button><button data-s="del">🗑️</button></div>`);
      const r = img.getBoundingClientRect();
      pop.style.top = Math.max(r.top + 8, 8) + 'px';
      pop.style.left = (r.left + 8) + 'px';
      document.body.appendChild(pop);
      pop.onclick = ev => {
        const s = ev.target.closest('button')?.dataset.s;
        if (!s) return;
        if (s === 'del') img.remove(); else img.dataset.size = s;
        pop.remove();
        dirty();
      };
      setTimeout(() => document.addEventListener('mousedown', function off(ev) {
        if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('mousedown', off); }
      }));
    });

    titleEl.addEventListener('input', dirty);
    titleEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); editor.focus(); }
    });
    titleEl.addEventListener('paste', e => {
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\n/g, ' '));
    });
    editor.addEventListener('input', dirty);
    if (!page.title) titleEl.focus();

    // Caselle di controllo: salviamo lo stato nell'HTML
    editor.addEventListener('click', e => {
      if (e.target.matches('input[type=checkbox]')) {
        e.target.toggleAttribute('checked', e.target.checked);
        dirty();
      }
    });

    // Barra strumenti (mousedown per non perdere la selezione)
    $('#pTools', view).addEventListener('mousedown', e => {
      const b = e.target.closest('button');
      if (!b) return;
      e.preventDefault();
      if (document.activeElement !== editor) editor.focus();
      if (b.dataset.block) document.execCommand('formatBlock', false, b.dataset.block);
      else if (b.dataset.cmd) document.execCommand(b.dataset.cmd, false, null);
      else if (b.dataset.act === 'todo') insertTodo();
      else if (b.dataset.act === 'image') {
        pickFile('image/*').then(f => f && insertImages([f]));
        return;
      }
      else if (b.dataset.act === 'link') {
        const url = prompt('Indirizzo del link:', 'https://');
        if (url) document.execCommand('createLink', false, url);
      }
      dirty();
    });

    // I link nell'editor si aprono con Ctrl/Cmd+clic
    editor.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (a && (e.ctrlKey || e.metaKey)) window.open(a.href, '_blank', 'noopener');
    });

    // Scorciatoie stile Markdown all'inizio di una riga (# titolo, - elenco, [] casella, > citazione)
    editor.addEventListener('keydown', e => {
      if (e.key !== ' ') return;
      const sel = getSelection();
      if (!sel.rangeCount || !sel.isCollapsed) return;
      const node = sel.anchorNode;
      if (node.nodeType !== 3 || node.previousSibling) return;
      const before = node.textContent.slice(0, sel.anchorOffset);
      const map = { '#': 'H2', '##': 'H3', '>': 'BLOCKQUOTE', '```': 'PRE', '-': 'UL', '*': 'UL', '1.': 'OL', '[]': 'todo' };
      const m = map[before];
      if (!m) return;
      // il blocco di primo livello che contiene il cursore deve essere un paragrafo semplice
      let block = node;
      while (block.parentNode !== editor) block = block.parentNode;
      if (block !== node && (!/^(P|DIV)$/.test(block.tagName) || block.classList.contains('todo'))) return;
      if (block !== node && block.firstChild !== node) return;
      e.preventDefault();
      node.textContent = node.textContent.slice(before.length);
      let out, inner;
      if (m === 'UL' || m === 'OL') { out = document.createElement(m); inner = out.appendChild(document.createElement('li')); }
      else if (m === 'todo') { out = el('<div class="todo"><input type="checkbox"><span></span></div>'); inner = out.lastElementChild; }
      else { out = inner = document.createElement(m); }
      if (block === node) inner.appendChild(node.cloneNode());
      else while (block.firstChild) inner.appendChild(block.firstChild);
      if (!inner.textContent) inner.innerHTML = '<br>';
      block.replaceWith(out);
      const r = document.createRange();
      r.setStart(inner.firstChild.nodeType === 3 ? inner.firstChild : inner, 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      dirty();
    });

    // Invio su una casella vuota → esce dall'elenco di caselle
    editor.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      // Invio su una citazione vuota → torna al testo normale
      const quote = getSelection().anchorNode?.parentElement?.closest?.('blockquote') || (getSelection().anchorNode?.nodeName === 'BLOCKQUOTE' ? getSelection().anchorNode : null);
      if (quote && quote.parentNode === editor && !quote.textContent.trim()) {
        e.preventDefault();
        const p = el('<p><br></p>');
        quote.replaceWith(p);
        placeCaret(p);
        dirty();
        return;
      }
      const todo = getSelection().anchorNode?.parentElement?.closest('.todo');
      if (!todo) return;
      e.preventDefault();
      const empty = !todo.textContent.trim();
      const next = empty ? el('<p><br></p>') : el('<div class="todo"><input type="checkbox"><span><br></span></div>');
      todo.after(next);
      if (empty) todo.remove();
      placeCaret(empty ? next : next.lastElementChild);
      dirty();
    });

    function insertTodo() {
      document.execCommand('insertHTML', false, '<div class="todo"><input type="checkbox"><span id="__todo">&#8203;</span></div>');
      const s = $('#__todo', editor);
      if (s) { s.removeAttribute('id'); placeCaret(s); }
    }
    function placeCaret(node) {
      const r = document.createRange();
      r.selectNodeContents(node);
      r.collapse(false);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }

    // Icona della pagina
    $('#pIcon', view).onclick = e => {
      const pop = el(`<div class="emoji-pop">${EMOJI.map(x => `<button>${x}</button>`).join('')}</div>`);
      const rect = e.currentTarget.getBoundingClientRect();
      pop.style.top = rect.bottom + 6 + 'px';
      pop.style.left = rect.left + 'px';
      document.body.appendChild(pop);
      const off = ev => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('mousedown', off); } };
      setTimeout(() => document.addEventListener('mousedown', off));
      pop.onclick = ev => {
        const b = ev.target.closest('button');
        if (!b) return;
        Pages.update(id, { icon: b.textContent });
        $('#pIcon', view).textContent = b.textContent;
        renderPagesNav();
        pop.remove();
        document.removeEventListener('mousedown', off);
      };
    };

    $('#pDel', view).onclick = () => {
      if (!confirm('Eliminare questa pagina?')) return;
      Pages.remove(id);
      location.hash = '#/dashboard';
    };
  }
};
