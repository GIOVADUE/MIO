/* Sincronizzazione tra dispositivi (Google Drive, cartella privata dell'app) e lettura di Google Calendar */
const Sync = {
  FILE: 'mio-dati.json',
  busy: false,

  localChanged() { return Number(localStorage.getItem('mio.__changed')) || 0; },
  lastSynced() { return Number(localStorage.getItem('mio.__synced')) || 0; },
  enabled() { return Settings.get().autoSync && Gmail.has('drive'); },

  snapshot() {
    const data = {};
    Store.keys().forEach(k => {
      if (!Store.local.includes(k.slice(4))) data[k] = localStorage.getItem(k);
    });
    return { app: 'MIO', version: 1, savedAt: Date.now(), data };
  },

  async findFile() {
    const q = encodeURIComponent(`name='${this.FILE}'`);
    const r = await Gmail.gfetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,appProperties,modifiedTime)`);
    return (await r.json()).files[0] || null;
  },

  async push(file) {
    if (file === undefined) file = await this.findFile();
    const snap = this.snapshot();
    const b = 'mio' + uid();
    const meta = file ? { appProperties: { savedAt: String(snap.savedAt) } }
      : { name: this.FILE, parents: ['appDataFolder'], appProperties: { savedAt: String(snap.savedAt) } };
    const body = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(snap)}\r\n--${b}--`;
    const url = file ? `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    await Gmail.gfetch(url, { method: file ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${b}` }, body });
    localStorage.setItem('mio.__synced', snap.savedAt);
    localStorage.setItem('mio.__changed', snap.savedAt);
    this.status('Salvato su Google Drive');
  },

  async pull(file) {
    if (file === undefined) file = await this.findFile();
    if (!file) throw new Error('Su Google Drive non ci sono ancora dati di MIO');
    const snap = await (await Gmail.gfetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`)).json();
    if (snap.app !== 'MIO' || !snap.data) throw new Error('File di sincronizzazione non valido');
    // scrittura diretta: non deve far ripartire il salvataggio automatico
    Object.entries(snap.data).forEach(([k, v]) => { if (k.startsWith('mio.')) localStorage.setItem(k, v); });
    localStorage.setItem('mio.__synced', snap.savedAt);
    localStorage.setItem('mio.__changed', snap.savedAt);
    this.status('Dati scaricati da Google Drive');
  },

  // confronta i dati locali con quelli su Drive e decide cosa fare
  async run({ interactive = false } = {}) {
    if (this.busy || !Gmail.has('drive')) return;
    this.busy = true;
    try {
      const file = await this.findFile();
      const remote = Number(file?.appProperties?.savedAt) || 0;
      const local = this.localChanged(), synced = this.lastSynced();
      if (!file) return await this.push(null);
      const remoteNew = remote > synced, localNew = local > synced;
      if (!synced && remote) {
        // primo collegamento di questo dispositivo: di solito si vogliono i dati già salvati
        const useRemote = confirm('Su Google Drive ci sono già dati di MIO salvati da un altro dispositivo.\n\nOK = usa quei dati (consigliato)\nAnnulla = sostituiscili con i dati di questo dispositivo');
        if (useRemote) { await this.pull(file); location.reload(); } else await this.push(file);
      } else if (remoteNew && localNew) {
        const useRemote = confirm('Ci sono modifiche sia su questo dispositivo sia su un altro.\n\nOK = usa i dati di Google Drive (le modifiche fatte qui andranno perse)\nAnnulla = usa i dati di questo dispositivo');
        if (useRemote) { await this.pull(file); location.reload(); } else await this.push(file);
      } else if (remoteNew) {
        await this.pull(file);
        location.reload();
      } else if (localNew) {
        await this.push(file);
      } else if (interactive) {
        this.status('Già sincronizzato');
      }
    } catch (e) {
      this.status('Errore: ' + e.message);
      if (interactive) toast(e.message);
    } finally {
      this.busy = false;
    }
  },

  status(msg) {
    const s = `${msg} · ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    try { sessionStorage.setItem('mio.syncStatus', s); } catch { /* niente */ }
    const el = $('#syncStatus');
    if (el) el.textContent = s;
  },
  lastStatus() { try { return sessionStorage.getItem('mio.syncStatus') || ''; } catch { return ''; } }
};

// dopo l'accesso: sincronizza; a ogni modifica: salva su Drive dopo qualche secondo
document.addEventListener('mio:google', () => { if (Settings.get().autoSync) Sync.run(); });
document.addEventListener('mio:changed', debounce(() => { if (Sync.enabled() && !Sync.busy) Sync.run(); }, 4000));

/* Google Calendar (sola lettura) */
const GCal = {
  cache: {}, // 'YYYY-MM' -> { t, items }

  enabled() { return Settings.get().showGoogleCal && Gmail.has('calendar'); },
  monthKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },

  forDate(key) {
    const c = this.cache[key.slice(0, 7)];
    return c && this.enabled() ? c.items.filter(e => e.date === key) : [];
  },

  // carica il mese se serve; chiama onLoaded solo quando arrivano dati nuovi
  ensure(date, onLoaded) {
    if (!this.enabled()) return;
    const k = this.monthKey(date), c = this.cache[k];
    if (c && (c.loading || Date.now() - c.t < 5 * 60 * 1000)) return;
    this.cache[k] = { ...(c || { items: [] }), loading: true };
    this.load(date).then(items => {
      this.cache[k] = { t: Date.now(), items };
      onLoaded && onLoaded();
    }).catch(e => {
      this.cache[k] = { t: Date.now(), items: c?.items || [] };
      toast('Google Calendar: ' + e.message);
    });
  },

  async load(date) {
    const min = new Date(date.getFullYear(), date.getMonth(), 1), max = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const cals = (await (await Gmail.gfetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?fields=items(id,backgroundColor,selected,primary)')).json())
      .items.filter(c => c.selected || c.primary);
    const lists = await Promise.all(cals.map(async c => {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.id)}/events?singleEvents=true&orderBy=startTime&maxResults=250` +
        `&timeMin=${encodeURIComponent(min.toISOString())}&timeMax=${encodeURIComponent(max.toISOString())}`;
      const evs = (await (await Gmail.gfetch(url)).json()).items || [];
      return evs.filter(e => e.status !== 'cancelled').flatMap(e => this.toItems(e, c.backgroundColor || '#4285f4'));
    }));
    return lists.flat();
  },

  toItems(e, color) {
    const base = { kind: 'google', title: e.summary || '(senza titolo)', place: e.location || '', color, link: e.htmlLink };
    if (e.start.date) { // tutto il giorno, anche su più giorni (la fine è esclusa)
      const out = [];
      for (let d = parseYmd(e.start.date), end = parseYmd(e.end.date); d < end && out.length < 62; d = addDays(d, 1)) {
        out.push({ ...base, allDay: true, date: ymd(d) });
      }
      return out;
    }
    const s = new Date(e.start.dateTime), f = new Date(e.end.dateTime);
    const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return [{ ...base, allDay: false, date: ymd(s), start: hm(s), end: hm(f) }];
  }
};
