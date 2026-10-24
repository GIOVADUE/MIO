/* Dashboard: riepilogo di tutte le sezioni */
Views.dashboard = {
  title: 'Dashboard',
  render(view) {
    const now = new Date(), h = now.getHours();
    const hello = h < 6 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
    const name = Settings.get().name;
    const items = Calendar.dayItems(now);
    const tomorrow = Calendar.dayItems(addDays(now, 1));
    const shifts = Turni.forDate(now);
    const pinned = Notes.all().filter(n => n.pinned).slice(0, 4);
    const tp = Tempo.data();
    const blocks = Tempo.blocksFor(tp, ymd(now)).filter(b => b.end > `${pad(h)}:${pad(now.getMinutes())}`).slice(0, 4);
    const urgent = tp.tasks.filter(t => !t.done && t.prio === 'q1').slice(0, 3);
    const timer = Timer.state();
    const pages = [...Pages.all()].sort((a, b) => b.updated - a.updated).slice(0, 5);

    const evRow = e => `<div class="mini-ev"><span class="bar" style="background:${e.color}"></span><span class="grow ellipsis">${esc(e.title)}</span><span class="muted small">${esc(Calendar.timeLabel(e))}</span></div>`;

    view.innerHTML = `
      <div class="view">
        <div class="hello">
          <div class="muted">${esc(fullDate(now))}</div>
          <h1>${hello}${name ? ', ' + esc(name) : ''} 👋</h1>
        </div>
        <div class="dash">
          <section class="card widget">
            <header><h3>🌤️ Meteo</h3></header>
            <div id="dWx"></div>
          </section>
          <section class="card widget">
            <header><h3>📅 Oggi</h3><a href="#/calendario" class="small">Calendario →</a></header>
            ${items.length ? items.map(evRow).join('') : '<p class="muted">Niente in programma oggi.</p>'}
            ${tomorrow.length ? `<div class="sec-label">Domani</div>${tomorrow.slice(0, 3).map(evRow).join('')}` : ''}
          </section>

          <section class="card widget">
            <header><h3>✉️ Gmail</h3><a href="#/gmail" class="small">Apri →</a></header>
            <div id="dMail">${Gmail.connected() ? '<div class="loading">Caricamento…</div>'
              : Gmail.configured() ? '<p class="muted">Non collegato.</p><button class="btn primary" id="dMailConnect">Accedi con Google</button>'
              : '<p class="muted">Collega Gmail per vedere qui le ultime email.</p><a class="btn" href="#/gmail">Configura</a>'}</div>
          </section>

          <section class="card widget">
            <header><h3>📊 Turni di oggi</h3><a href="#/turni" class="small">Tabella →</a></header>
            ${shifts.length ? shifts.map(s => `<div class="mini-ev"><span class="pill" style="background:${s.type ? s.type.color : '#eee'}">${esc(s.code)}</span>
              <span class="grow ellipsis">${esc(s.emp.name)}</span><span class="muted small">${esc(s.type ? Turni.label(s.type) : '')}</span></div>`).join('')
              : '<p class="muted">Nessun turno inserito per oggi.</p>'}
          </section>

          <section class="card widget">
            <header><h3>⏱️ Tempo di oggi</h3><a href="#/tempo" class="small">Pianifica →</a></header>
            ${timer ? `<a class="mini-ev" href="#/tempo"><span class="pill" style="background:#fde68a">${timer.mode === 'focus' ? '🎯' : '☕'}</span><span class="grow ellipsis">${timer.mode === 'focus' ? esc(timer.label || 'Sessione di concentrazione') : 'Pausa'}</span><span class="muted small">${timer.pausedLeft != null ? 'in pausa' : 'in corso'}</span></a>` : ''}
            ${blocks.length ? blocks.map(b => `<div class="mini-ev"><span class="bar" style="background:${Tempo.area(tp, b.area).color}"></span><span class="grow ellipsis">${esc(b.title)}</span><span class="muted small">${b.start}–${b.end}</span></div>`).join('')
              : '<p class="muted">Nessun blocco pianificato per il resto della giornata.</p>'}
            ${urgent.length ? `<div class="sec-label">Da fare subito</div>${urgent.map(t => `<div class="mini-ev"><span class="bar" style="background:${Tempo.area(tp, t.area).color}"></span><span class="grow ellipsis">${esc(t.title)}</span></div>`).join('')}` : ''}
          </section>

          <section class="card widget span2">
            <header><h3>📰 Notizie</h3><a href="#/notizie" class="small">Tutte →</a></header>
            <div id="dNews"><div class="loading">Caricamento notizie…</div></div>
          </section>

          <section class="card widget">
            <header><h3>💡 Note fissate</h3><a href="#/note" class="small">Note →</a></header>
            ${pinned.length ? `<div class="mini-notes">${pinned.map(n => `<a href="#/note" class="mini-note c-${n.color}"><b>${esc(n.title || '')}</b>
              <span>${esc(n.items ? n.items.map(i => (i.done ? '☑ ' : '☐ ') + i.text).join('\n') : n.text).slice(0, 140)}</span></a>`).join('')}</div>`
              : '<p class="muted">Fissa una nota con 📌 per vederla qui.</p>'}
          </section>

          <section class="card widget">
            <header><h3>📄 Pagine recenti</h3><button class="link-btn small" id="dNewPage">+ Nuova</button></header>
            ${pages.map(p => `<a class="mini-page" href="#/pagina/${p.id}"><span>${esc(p.icon)}</span><span class="grow ellipsis">${esc(p.title || 'Senza titolo')}</span><span class="muted small">${esc(timeAgo(new Date(p.updated)))}</span></a>`).join('')}
          </section>
        </div>
      </div>`;

    $('#dNewPage', view).onclick = () => Pages.create();
    const wx = $('#dWx', view);
    const paintWx = () => view.isConnected && Weather.widget(wx, paintWx);
    paintWx();
    GCal.ensure(now, () => view.isConnected && Views.dashboard.render(view));
    GCal.ensure(addDays(now, 1), () => view.isConnected && Views.dashboard.render(view));

    News.fetch(Settings.get().newsTopic).then(list => {
      const box = $('#dNews', view);
      if (box) box.innerHTML = `<div class="mini-news">${list.slice(0, 6).map(n => `<a href="${esc(n.link)}" target="_blank" rel="noopener">
        <span class="muted small">${esc(n.source)} · ${esc(timeAgo(n.date))}</span><span>${esc(n.title)}</span></a>`).join('')}</div>`;
    }).catch(e => { const box = $('#dNews', view); if (box) box.innerHTML = `<p class="muted">${esc(e.message)}</p>`; });

    const mailBox = $('#dMail', view);
    if (Gmail.connected()) {
      Promise.all([Gmail.stats(), Gmail.messages('in:inbox', 5)]).then(([s, msgs]) => {
        mailBox.innerHTML = `<div class="mail-count"><b>${s.unread}</b> da leggere</div>` +
          msgs.map(m => `<a class="mini-mail ${m.unread ? 'unread' : ''}" href="${Gmail.link(m)}" target="_blank" rel="noopener"><span class="ellipsis">${esc(m.from)}</span><span class="ellipsis muted">${esc(m.subject)}</span></a>`).join('');
      }).catch(e => { mailBox.innerHTML = `<p class="muted">${esc(e.message)}</p>`; });
    } else if ($('#dMailConnect', view)) {
      $('#dMailConnect', view).onclick = async () => {
        try { await Gmail.connect(); Views.dashboard.render(view); } catch (e) { toast(e.message); }
      };
    }
  }
};
