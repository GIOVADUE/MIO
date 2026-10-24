/* Ricerca globale stile Notion (Ctrl/Cmd + K) */
const Search = {
  index() {
    const out = [];
    const tmp = document.createElement('div');
    Pages.all().forEach(p => {
      tmp.innerHTML = p.content;
      out.push({ icon: p.icon, title: p.title || 'Senza titolo', sub: 'Pagina', text: tmp.textContent, href: '#/pagina/' + p.id });
    });
    Notes.all().forEach(n => out.push({
      icon: '💡', title: n.title || (n.text || (n.items || []).map(i => i.text).join(', ')).slice(0, 60) || 'Nota', sub: 'Nota',
      text: n.text + ' ' + (n.items || []).map(i => i.text).join(' '), href: '#/note'
    }));
    Calendar.all().forEach(e => out.push({
      icon: '📅', title: e.title, sub: `Evento · ${fullDate(parseYmd(e.date))}`, text: (e.place || '') + ' ' + (e.notes || ''), href: '#/calendario'
    }));
    const tp = Tempo.data();
    tp.tasks.forEach(t => out.push({ icon: t.done ? '✅' : '⏱️', title: t.title, sub: `Attività · ${Tempo.area(tp, t.area).name}`, text: '', href: '#/tempo' }));
    Turni.data().employees.forEach(emp => out.push({ icon: '📊', title: emp.name, sub: 'Dipendente nei turni', text: '', href: '#/turni' }));
    [['🏠', 'Dashboard', '#/dashboard'], ['📰', 'Notizie', '#/notizie'], ['✉️', 'Gmail', '#/gmail'], ['📊', 'Turni di lavoro', '#/turni'],
     ['💡', 'Note', '#/note'], ['📅', 'Calendario', '#/calendario'], ['⏱️', 'Tempo', '#/tempo'], ['⚙️', 'Impostazioni', '#/impostazioni']]
      .forEach(([icon, title, href]) => out.push({ icon, title, sub: 'Sezione', text: '', href }));
    return out;
  },

  open() {
    if ($('.modal-back.in .search-modal')) return;
    const all = this.index();
    let results = [], sel = 0;
    const m = openModal(`
      <div class="sx-head"><span>🔍</span><input id="sxQ" placeholder="Cerca pagine, note, eventi…" aria-label="Cerca" autocomplete="off"></div>
      <div class="sx-list" id="sxList"></div>
      <div class="sx-foot muted small">↑↓ per scegliere · Invio per aprire · Esc per chiudere</div>`, { cls: 'search-modal' });
    const q = $('#sxQ', m.el), list = $('#sxList', m.el);

    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    function paint() {
      const words = norm(q.value).split(/\s+/).filter(Boolean);
      results = words.length
        ? all.map(r => {
            const t = norm(r.title), x = norm(r.text);
            if (!words.every(w => t.includes(w) || x.includes(w))) return null;
            return { ...r, score: words.filter(w => t.includes(w)).length * 2 + (t.startsWith(words[0]) ? 1 : 0) };
          }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 30)
        : all.filter(r => r.sub === 'Pagina' || r.sub === 'Sezione').slice(0, 12);
      sel = Math.min(sel, Math.max(results.length - 1, 0));
      list.innerHTML = results.length
        ? results.map((r, i) => `<a class="sx-item ${i === sel ? 'on' : ''}" href="${r.href}" data-i="${i}">
            <span class="sx-ico">${esc(r.icon)}</span><span class="grow ellipsis">${esc(r.title)}</span><span class="muted small ellipsis">${esc(r.sub)}</span></a>`).join('')
        : '<div class="empty">Nessun risultato</div>';
      $('.sx-item.on', list)?.scrollIntoView({ block: 'nearest' });
    }
    q.addEventListener('input', () => { sel = 0; paint(); });
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); paint(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); paint(); }
      if (e.key === 'Enter' && results[sel]) { e.preventDefault(); location.hash = results[sel].href; m.close(); }
    });
    list.addEventListener('click', () => m.close());
    paint();
    q.focus();
  }
};

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); Search.open(); }
});
