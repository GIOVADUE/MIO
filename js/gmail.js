/* Dashboard Gmail (sola lettura) tramite Google Identity Services + Gmail API */
const Gmail = {
  token: null,
  exp: 0,

  restore() {
    try {
      const s = JSON.parse(sessionStorage.getItem('mio.gmailToken') || 'null');
      if (s && s.exp > Date.now()) { this.token = s.token; this.exp = s.exp; }
    } catch { /* niente */ }
  },
  configured() { return !!Settings.get().gmailClientId; },
  connected() { return !!this.token && Date.now() < this.exp; },

  loadGis() {
    return new Promise((res, rej) => {
      if (window.google?.accounts?.oauth2) return res();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = () => res();
      s.onerror = () => rej(new Error('Impossibile caricare il servizio di accesso Google'));
      document.head.appendChild(s);
    });
  },

  async connect() {
    const cid = Settings.get().gmailClientId;
    if (!cid) throw new Error('Inserisci prima il Client ID nelle Impostazioni');
    await this.loadGis();
    return new Promise((res, rej) => {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: cid,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: r => {
          if (r.error) return rej(new Error(r.error_description || r.error));
          this.token = r.access_token;
          this.exp = Date.now() + (Number(r.expires_in) - 60) * 1000;
          try { sessionStorage.setItem('mio.gmailToken', JSON.stringify({ token: this.token, exp: this.exp })); } catch { /* niente */ }
          res();
        },
        error_callback: e => rej(new Error(e.message || e.type || 'Accesso annullato'))
      });
      tc.requestAccessToken();
    });
  },

  disconnect() {
    if (this.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(this.token, () => {});
    this.token = null;
    this.exp = 0;
    try { sessionStorage.removeItem('mio.gmailToken'); } catch { /* niente */ }
  },

  async api(path) {
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + path, { headers: { Authorization: 'Bearer ' + this.token } });
    if (r.status === 401) { this.disconnect(); throw new Error('Sessione Gmail scaduta: ricollegati'); }
    if (!r.ok) throw new Error('Errore Gmail (' + r.status + ')');
    return r.json();
  },

  async messages(q = 'in:inbox', n = 20) {
    const list = await this.api(`messages?maxResults=${n}&q=${encodeURIComponent(q)}`);
    const msgs = await Promise.all((list.messages || []).map(m =>
      this.api(`messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`)));
    return msgs.map(m => {
      const h = name => m.payload?.headers?.find(x => x.name.toLowerCase() === name)?.value || '';
      const from = h('from');
      return {
        id: m.id, threadId: m.threadId,
        from: (from.replace(/<.*>/, '').replace(/"/g, '').trim() || from),
        subject: h('subject') || '(nessun oggetto)',
        snippet: decodeEntities(m.snippet || ''),
        date: new Date(Number(m.internalDate)),
        unread: m.labelIds?.includes('UNREAD'),
        starred: m.labelIds?.includes('STARRED')
      };
    });
  },

  async stats() {
    const [inbox, profile] = await Promise.all([this.api('labels/INBOX'), this.api('profile')]);
    return { unread: inbox.messagesUnread, total: inbox.messagesTotal, email: profile.emailAddress };
  },

  link(m) { return `https://mail.google.com/mail/u/0/#inbox/${m.threadId}`; },

  row(m) {
    return `<a class="mail-row ${m.unread ? 'unread' : ''}" href="${this.link(m)}" target="_blank" rel="noopener">
      <span class="mail-from">${m.starred ? '⭐ ' : ''}${esc(m.from)}</span>
      <span class="mail-body"><b>${esc(m.subject)}</b> <span class="muted">— ${esc(m.snippet)}</span></span>
      <span class="mail-date">${esc(timeAgo(m.date))}</span>
    </a>`;
  },

  setupHelp() {
    const origin = location.protocol.startsWith('http') ? location.origin : 'https://TUONOME.github.io';
    return `
      <div class="card guide">
        <h3>Collega Gmail in 5 passi</h3>
        <ol>
          <li>Apri <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud Console</a> e crea un progetto (es. "MIO").</li>
          <li>Attiva la <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noopener">Gmail API</a>.</li>
          <li>In <b>Schermata consenso OAuth</b> scegli "Esterno", compila nome e email, e aggiungi te stesso tra gli <b>utenti di test</b>.</li>
          <li>In <b>Credenziali → Crea credenziali → ID client OAuth</b> scegli "Applicazione web" e in <b>Origini JavaScript autorizzate</b> inserisci: <code>${esc(origin)}</code></li>
          <li>Copia l'<b>ID client</b> e incollalo in <a href="#/impostazioni">Impostazioni</a>.</li>
        </ol>
        <p class="muted small">L'accesso è in sola lettura e avviene direttamente tra il tuo browser e Google: nessun server intermedio.
        Gmail non funziona aprendo il file dal computer (file://): pubblica l'app su GitHub Pages (vedi README).</p>
      </div>`;
  }
};
Gmail.restore();

Views.gmail = {
  title: 'Gmail',
  render(view) {
    const filters = [['in:inbox', 'Posta in arrivo'], ['is:unread in:inbox', 'Da leggere'], ['is:starred', 'Speciali'], ['is:important', 'Importanti'], ['in:sent', 'Inviati']];
    let q = filters[0][0];

    const head = `
      <div class="view-head">
        <h1>✉️ Gmail</h1>
        <a class="btn primary" href="https://mail.google.com/mail/?view=cm&fs=1" target="_blank" rel="noopener">✏️ Scrivi</a>
        <a class="btn ghost" href="https://mail.google.com/" target="_blank" rel="noopener">Apri Gmail ↗</a>
      </div>`;

    if (!Gmail.configured()) {
      view.innerHTML = `<div class="view narrow">${head}${Gmail.setupHelp()}</div>`;
      return;
    }
    if (!Gmail.connected()) {
      view.innerHTML = `<div class="view narrow">${head}
        <div class="card center-card">
          <div class="big-emoji">✉️</div>
          <p>Collega il tuo account per vedere la posta qui.</p>
          <button class="btn primary" id="gConnect">Accedi con Google</button>
        </div></div>`;
      $('#gConnect', view).onclick = async () => {
        try { await Gmail.connect(); Views.gmail.render(view); } catch (e) { toast(e.message); }
      };
      return;
    }

    view.innerHTML = `
      <div class="view">${head}
        <div class="stats" id="gStats"><div class="loading">…</div></div>
        <div class="row gap wrap">
          <div class="chips" id="gFilters">${filters.map(([k, l]) => `<button class="chip" data-q="${esc(k)}">${l}</button>`).join('')}</div>
          <form id="gSearch" class="search grow"><input type="search" placeholder="Cerca nella posta (es. from:mario)" aria-label="Cerca nella posta"></form>
          <button class="btn ghost" id="gOut">Esci</button>
        </div>
        <div class="card flush" id="gList"></div>
      </div>`;

    const list = $('#gList', view);
    async function loadList() {
      $$('#gFilters .chip', view).forEach(c => c.classList.toggle('on', c.dataset.q === q));
      list.innerHTML = '<div class="loading">Caricamento posta…</div>';
      try {
        const msgs = await Gmail.messages(q);
        list.innerHTML = msgs.length ? msgs.map(m => Gmail.row(m)).join('') : '<div class="empty">Nessun messaggio</div>';
      } catch (e) {
        list.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
        if (!Gmail.connected()) setTimeout(() => Views.gmail.render(view), 1500);
      }
    }
    Gmail.stats().then(s => {
      $('#gStats', view).innerHTML = `
        <div class="stat"><span class="stat-n">${s.unread}</span><span class="stat-l">da leggere</span></div>
        <div class="stat"><span class="stat-n">${s.total}</span><span class="stat-l">in arrivo</span></div>
        <div class="stat wide"><span class="stat-l">Account</span><span class="ellipsis">${esc(s.email)}</span></div>`;
    }).catch(() => { $('#gStats', view).innerHTML = ''; });

    $('#gFilters', view).onclick = e => { const c = e.target.closest('.chip'); if (c) { q = c.dataset.q; loadList(); } };
    $('#gSearch', view).onsubmit = e => { e.preventDefault(); const v = $('input', e.target).value.trim(); if (v) { q = v; loadList(); } };
    $('#gOut', view).onclick = () => { Gmail.disconnect(); Views.gmail.render(view); };
    loadList();
  }
};
