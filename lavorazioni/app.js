/* LAVORAZIONI — attività del mese giorno per giorno, sincronizzate tra dispositivi.
   Copia locale (funziona anche offline): { id: { id, day, text, stato, pos, deleted, ts } }
   Copia online: database Supabase, accessibile solo con il codice personale (spazio). */
(() => {
  'use strict';

  /* ---------- Configurazione online ---------- */
  const SB_URL = 'https://yvprpoxubeyawnfntvfv.supabase.co';
  const SB_KEY = 'sb_publishable_kpKr3V1E1eF64D5wUOZxOg_du0ynPrd'; // chiave pubblica: i dati restano protetti dal codice

  const KEY = 'lavorazioni-attivita-v2';
  const OLD_KEY = 'lavorazioni-dati-v1';
  const PREFS = 'lavorazioni-prefs-v1';
  const SPACE = 'lavorazioni-codice';
  const PENDING = 'lavorazioni-da-inviare';
  const LASTPULL = 'lavorazioni-ultimo-aggiornamento';

  const STATI = [
    { id: 'todo', label: 'Da fare', mark: '•' },
    { id: 'done', label: 'Conclusa', mark: '✓' },
    { id: 'hold', label: 'In sospeso', mark: '⏸' },
  ];
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

  const $ = s => document.querySelector(s);
  const pad = n => String(n).padStart(2, '0');
  const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const uid = () => Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(36).padStart(2, '0')).join('');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
  const store = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch { toast('Impossibile salvare: memoria piena?'); } };

  let tasks = load(KEY, null);
  let pending = new Set(load(PENDING, []));
  let prefs = Object.assign({ hideEmpty: false }, load(PREFS, {}));
  const saveLocal = () => { store(KEY, tasks); store(PENDING, [...pending]); };
  const savePrefs = () => store(PREFS, prefs);

  // Passaggio dalla versione precedente (dati solo sul telefono): le attività vengono caricate online
  if (!tasks) {
    tasks = {};
    const old = load(OLD_KEY, {});
    let pos = 1;
    for (const [day, list] of Object.entries(old)) for (const t of list || []) {
      const id = uid();
      tasks[id] = { id, day, text: t.text, stato: t.stato, pos: pos++, deleted: false, ts: Date.now() };
      pending.add(id);
    }
    saveLocal();
  }

  /* ---------- Codice personale ---------- */
  // Quando un dispositivo passa a un altro codice, le sue attività ricevono nuovi identificativi
  // e vengono aggiunte a quelle già presenti con quel codice.
  function reidAll() {
    const fresh = {};
    pending = new Set();
    for (const t of Object.values(tasks)) {
      if (t.deleted) continue;
      const id = uid();
      fresh[id] = { ...t, id, ts: Date.now() };
      pending.add(id);
    }
    tasks = fresh;
  }
  const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(25)), b => ALFA[b % ALFA.length]).join('').match(/.{5}/g).join('-');
  const normCode = s => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,5}/g)?.join('-') || '';
  let space = localStorage.getItem(SPACE);
  const fromLink = new URLSearchParams(location.hash.slice(1)).get('codice');
  if (fromLink) {
    const c = normCode(fromLink);
    if (c.length >= 20 && c !== space) {
      space = c; store(SPACE, space);
      localStorage.removeItem(LASTPULL);
      // le attività già presenti su questo dispositivo vengono unite a quelle del codice
      reidAll();
      saveLocal();
      setTimeout(() => toast('Dispositivo collegato ✓'), 600);
    }
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (!space) { space = newCode(); store(SPACE, space); }
  const shareLink = () => `${location.origin}${location.pathname}#codice=${space}`;

  /* ---------- Operazioni sulle attività ---------- */
  function touch(t) { t.ts = Date.now(); tasks[t.id] = t; pending.add(t.id); saveLocal(); scheduleFlush(); }
  function addTask(day, text, stato = 'todo') { touch({ id: uid(), day, text, stato, pos: Date.now() + Math.random(), deleted: false }); }
  function removeTask(id, silent) { const t = tasks[id]; if (!t) return; t.deleted = true; touch(t); if (!silent) { render(); toast('Attività eliminata'); } }

  function byDay() {
    const m = {};
    for (const t of Object.values(tasks)) if (!t.deleted) (m[t.day] ||= []).push(t);
    for (const l of Object.values(m)) l.sort((a, b) => a.pos - b.pos);
    return m;
  }

  /* ---------- Sincronizzazione ---------- */
  let sb = null, channel = null, flushTimer = null, syncing = false, online = false;

  function setStatus(state) {
    const el = $('#syncStatus');
    const map = {
      ok: ['☁️ Sincronizzato', 'ok'], busy: ['⏳ Sincronizzo…', 'busy'],
      off: ['📴 Offline: salvo sul telefono', 'off'], err: ['⚠️ Server non raggiungibile', 'off'],
    };
    const [txt, cls] = map[state];
    el.textContent = pending.size && state !== 'busy' && state !== 'ok' ? `${txt} (${pending.size} da inviare)` : txt;
    el.className = 'sync ' + cls;
    online = state === 'ok';
  }

  async function rpc(fn, args) {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error(`${fn}: ${r.status}`);
    return r.json();
  }

  function scheduleFlush() { clearTimeout(flushTimer); flushTimer = setTimeout(sync, 300); }

  async function sync() {
    if (syncing) { scheduleFlush(); return; }
    if (!navigator.onLine) { setStatus('off'); return; }
    syncing = true;
    setStatus('busy');
    try {
      // 1) invio delle modifiche fatte su questo dispositivo
      if (pending.size) {
        const ids = [...pending];
        const sent = ids.map(id => tasks[id]).filter(Boolean).map(t => ({ ...t }));
        for (let i = 0; i < sent.length; i += 500) {
          await rpc('lav_upsert', { p_space: space, p_tasks: sent.slice(i, i + 500).map(t => ({ id: t.id, day: t.day, text: t.text, stato: t.stato, pos: t.pos, deleted: !!t.deleted, client_ts: t.ts })) });
        }
        for (const t of sent) if (tasks[t.id] && tasks[t.id].ts === t.ts) pending.delete(t.id);
        ids.forEach(id => { if (!tasks[id]) pending.delete(id); });
        saveLocal();
        if (channel) channel.send({ type: 'broadcast', event: 'changed', payload: {} }).catch(() => {});
      }
      // 2) ricezione delle modifiche fatte sugli altri dispositivi
      const since = localStorage.getItem(LASTPULL);
      const rows = await rpc('lav_list', { p_space: space, p_since: since ? new Date(Date.parse(since) - 10000).toISOString() : null });
      let changed = false, last = since;
      for (const r of rows) {
        const loc = tasks[r.id];
        if (!last || r.updated_at > last) last = r.updated_at;
        if (loc && pending.has(r.id) && loc.ts > r.client_ts) continue; // la mia modifica è più recente
        if (loc && loc.ts === r.client_ts && loc.stato === r.stato && loc.text === r.text && loc.day === r.day && !!loc.deleted === r.deleted) continue;
        tasks[r.id] = { id: r.id, day: r.day, text: r.text, stato: r.stato, pos: r.pos, deleted: r.deleted, ts: r.client_ts };
        pending.delete(r.id);
        changed = true;
      }
      if (last) store(LASTPULL, last);
      if (changed) { saveLocal(); safeRender(); }
      setStatus('ok');
    } catch (e) {
      setStatus(navigator.onLine ? 'err' : 'off');
    } finally {
      syncing = false;
    }
  }

  function startRealtime() {
    if (!window.supabase) return;
    try {
      sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      channel = sb.channel('lav-' + space, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'changed' }, () => sync())
        .subscribe(st => { if (st === 'SUBSCRIBED') sync(); });
    } catch { /* senza tempo reale si aggiorna comunque ogni pochi secondi */ }
  }
  function restartRealtime() { if (sb && channel) sb.removeChannel(channel); channel = null; startRealtime(); }

  // Controllo periodico (riserva in caso il tempo reale non sia disponibile)
  setInterval(() => { if (!document.hidden) sync(); }, 15000);
  window.addEventListener('online', sync);
  window.addEventListener('offline', () => setStatus('off'));

  /* ---------- Disegno ---------- */
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth();
  let filter = 'all';
  let openAdd = null;
  let needRender = false;
  let keepDraftEmpty = false;

  const todayKey = () => { const t = new Date(); return keyOf(t.getFullYear(), t.getMonth(), t.getDate()); };
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

  // Se stai scrivendo, aspetta che tu abbia finito prima di ridisegnare
  function safeRender() {
    if (document.activeElement?.matches('.task-text, .dialog input')) { needRender = true; return; }
    render();
  }

  function render() {
    needRender = false;
    $('#monthLabel').textContent = `${MESI[month]} ${year}`;
    $('#toggleEmpty').textContent = prefs.hideEmpty ? '📅 Mostra tutti i giorni' : '🧹 Mostra solo i giorni con attività';

    const days = byDay();
    const n = daysIn(year, month);
    const count = { all: 0, todo: 0, done: 0, hold: 0 };
    for (let d = 1; d <= n; d++) for (const t of days[keyOf(year, month, d)] || []) { count.all++; count[t.stato]++; }

    $('#stats').innerHTML = [['all', 'Tutte'], ['todo', 'Da fare'], ['done', 'Concluse'], ['hold', 'In sospeso']]
      .map(([id, l]) => `<button class="chip ${filter === id ? 'on' : ''}" data-filter="${id}">${l}<b>${count[id]}</b></button>`).join('');

    const main = $('#days');
    const scrollY = window.scrollY;
    const draft = main.querySelector('.new-row input');
    const draftText = draft ? draft.value : '';
    const draftFocus = draft && document.activeElement === draft;
    main.innerHTML = '';
    const tk = todayKey();
    let shown = 0;

    for (let d = 1; d <= n; d++) {
      const k = keyOf(year, month, d);
      const all = days[k] || [];
      const list = filter === 'all' ? all : all.filter(t => t.stato === filter);
      const isToday = k === tk;
      if ((prefs.hideEmpty || filter !== 'all') && !list.length && !isToday && openAdd !== k) continue;
      shown++;

      const wd = new Date(year, month, d).getDay();
      const done = all.filter(t => t.stato === 'done').length;
      const sec = document.createElement('section');
      sec.className = 'day' + (isToday ? ' is-today' : '') + (wd === 0 || wd === 6 ? ' weekend' : '');
      sec.id = 'd-' + k;
      sec.dataset.day = k;
      sec.innerHTML = `
        <div class="day-head">
          <div class="day-num">${d}</div>
          <div class="day-name">${GIORNI[wd]}${isToday ? ' · oggi' : ''}
            <small>${all.length ? `${done}/${all.length} concluse` : 'nessuna attività'}</small></div>
          <button class="add-btn" data-act="add">＋ Attività</button>
        </div>`;

      if (list.length) {
        const cols = document.createElement('div');
        cols.className = 'cols';
        cols.innerHTML = '<span>Attività</span>' + STATI.map(s => `<span>${s.label}</span>`).join('');
        sec.appendChild(cols);
        for (const t of list) sec.appendChild(taskRow(t));
      } else if (openAdd !== k) {
        const e = document.createElement('div');
        e.className = 'empty';
        e.textContent = filter === 'all' ? 'Tocca “＋ Attività” per aggiungerne una.' : 'Nessuna attività con questo stato.';
        sec.appendChild(e);
      }

      if (openAdd === k) {
        const row = document.createElement('form');
        row.className = 'new-row';
        row.innerHTML = '<input type="text" placeholder="Scrivi l\'attività e premi Invio" enterkeyhint="done" maxlength="300"><button type="submit">Aggiungi</button>';
        sec.appendChild(row);
      }
      main.appendChild(sec);
    }

    if (!shown) main.innerHTML = '<div class="month-empty">Nessuna attività da mostrare in questo mese.</div>';
    window.scrollTo(0, scrollY);
    const inp = main.querySelector('.new-row input');
    if (inp) {
      if (draftText && !keepDraftEmpty) inp.value = draftText;
      if (draftFocus || !draft) inp.focus({ preventScroll: true });
    }
    keepDraftEmpty = false;
  }

  function taskRow(t) {
    const row = document.createElement('div');
    row.className = 'task st-' + t.stato;
    row.dataset.id = t.id;
    const ta = document.createElement('textarea');
    ta.className = 'task-text';
    ta.rows = 1;
    ta.value = t.text;
    ta.setAttribute('aria-label', 'Attività');
    row.appendChild(ta);
    for (const s of STATI) {
      const b = document.createElement('button');
      b.className = `box ${s.id}` + (t.stato === s.id ? ' on' : '');
      b.dataset.stato = s.id;
      b.setAttribute('aria-pressed', t.stato === s.id);
      b.setAttribute('aria-label', s.label);
      b.innerHTML = `<i>${t.stato === s.id ? s.mark : ''}</i>`;
      row.appendChild(b);
    }
    requestAnimationFrame(() => autosize(ta));
    return row;
  }

  function autosize(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }

  /* ---------- Eventi ---------- */
  $('#days').addEventListener('click', e => {
    const sec = e.target.closest('.day');
    if (!sec) return;
    const day = sec.dataset.day;

    if (e.target.closest('[data-act="add"]')) {
      openAdd = openAdd === day ? null : day;
      render();
      return;
    }
    const box = e.target.closest('.box');
    if (box) {
      const t = tasks[box.closest('.task').dataset.id];
      if (!t) return;
      t.stato = box.dataset.stato;
      touch(t);
      if (navigator.vibrate) navigator.vibrate(8);
      render();
    }
  });

  $('#days').addEventListener('submit', e => {
    e.preventDefault();
    const sec = e.target.closest('.day');
    const text = e.target.querySelector('input').value.trim();
    if (!text) { openAdd = null; render(); return; }
    addTask(sec.dataset.day, text);
    keepDraftEmpty = true;
    render(); // il campo resta aperto per aggiungere la successiva
  });

  $('#days').addEventListener('input', e => {
    if (e.target.classList.contains('task-text')) autosize(e.target);
  });

  $('#days').addEventListener('focusout', e => {
    if (e.target.classList.contains('task-text')) {
      const t = tasks[e.target.closest('.task').dataset.id];
      if (t) {
        const v = e.target.value.trim();
        if (!v) {
          if (confirm('Eliminare questa attività?')) { removeTask(t.id); return; }
          e.target.value = t.text;
        } else if (v !== t.text) { t.text = v; touch(t); }
      }
    }
    setTimeout(() => { if (needRender && !document.activeElement?.matches('.task-text')) render(); }, 0);
  });

  $('#days').addEventListener('keydown', e => {
    if (e.target.classList.contains('task-text') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
  });

  // Pressione lunga (o clic destro) su un'attività: altre azioni
  let pressTimer = null;
  $('#days').addEventListener('contextmenu', e => {
    const row = e.target.closest('.task');
    if (!row) return;
    e.preventDefault();
    taskSheet(row.dataset.id);
  });
  $('#days').addEventListener('touchstart', e => {
    const row = e.target.closest('.task');
    if (!row || e.target.closest('.box')) return;
    pressTimer = setTimeout(() => { pressTimer = null; document.activeElement?.blur(); taskSheet(row.dataset.id); }, 550);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach(ev => $('#days').addEventListener(ev, () => { clearTimeout(pressTimer); pressTimer = null; }, { passive: true }));

  const shiftDay = (day, delta) => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d + delta); };
  const keyOfDate = dt => keyOf(dt.getFullYear(), dt.getMonth(), dt.getDate());

  function taskSheet(id) {
    const t = tasks[id];
    if (!t) return;
    const back = document.createElement('div');
    back.className = 'sheet-back';
    back.innerHTML = `<div class="sheet">
      <h3>${esc(t.text)}</h3>
      <button data-a="next">➡️ Sposta al giorno dopo</button>
      <button data-a="prev">⬅️ Sposta al giorno prima</button>
      <button data-a="dup">📄 Duplica nel giorno dopo</button>
      <button data-a="del" class="danger">🗑 Elimina</button>
      <button data-a="x" class="cancel">Annulla</button></div>`;
    back.addEventListener('click', e => {
      const a = e.target.closest('button')?.dataset.a;
      if (!a && e.target !== back) return;
      back.remove();
      if (a === 'next' || a === 'prev') {
        const dt = shiftDay(t.day, a === 'next' ? 1 : -1);
        t.day = keyOfDate(dt); t.pos = Date.now(); touch(t); render();
        toast(`Spostata a ${GIORNI[dt.getDay()]} ${dt.getDate()} ${MESI[dt.getMonth()]}`);
      }
      if (a === 'dup') { addTask(keyOfDate(shiftDay(t.day, 1)), t.text); render(); toast('Duplicata nel giorno dopo'); }
      if (a === 'del') removeTask(id);
    });
    document.body.appendChild(back);
  }

  $('#stats').addEventListener('click', e => {
    const c = e.target.closest('[data-filter]');
    if (!c) return;
    filter = c.dataset.filter;
    render();
  });

  function goMonth(delta) {
    const d = new Date(year, month + delta, 1);
    year = d.getFullYear(); month = d.getMonth();
    openAdd = null;
    render();
    window.scrollTo(0, 0);
  }
  $('#prevBtn').onclick = () => goMonth(-1);
  $('#nextBtn').onclick = () => goMonth(1);
  $('#monthLabel').onclick = goToday;

  // Scorrimento orizzontale per cambiare mese
  let sx = null, sy = 0;
  document.addEventListener('touchstart', e => { if (e.target.closest('input, textarea, .sheet-back, .dialog-back')) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) goMonth(dx < 0 ? 1 : -1);
  }, { passive: true });

  function goToday() {
    const t = new Date();
    year = t.getFullYear(); month = t.getMonth();
    render();
    const el = document.getElementById('d-' + todayKey());
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - $('.top').offsetHeight - 10;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  /* ---------- Collegare altri dispositivi ---------- */
  function deviceDialog() {
    const back = document.createElement('div');
    back.className = 'dialog-back';
    back.innerHTML = `<div class="dialog">
      <h2>🔗 Collega altri dispositivi</h2>
      <p>Apri questo link sul telefono, tablet o computer da collegare. Vedrà subito tutte le attività, e ogni modifica comparirà su tutti.</p>
      <div class="code-box">${esc(space)}</div>
      <button class="primary" data-a="share">📤 Invia il link (WhatsApp, email…)</button>
      <button data-a="copy">📋 Copia il link</button>
      <hr>
      <p>Hai già un codice su un altro dispositivo? Scrivilo qui:</p>
      <input type="text" id="codeInput" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" autocapitalize="characters" autocomplete="off" spellcheck="false">
      <button data-a="use">✅ Usa questo codice</button>
      <p class="hint">Tieni il codice per te: chi lo conosce può vedere e modificare le tue attività.</p>
      <button data-a="x" class="cancel">Chiudi</button></div>`;
    back.addEventListener('click', async e => {
      const a = e.target.closest('button')?.dataset.a;
      if (!a && e.target !== back) return;
      if (a === 'share') {
        const text = `Apri LAVORAZIONI con il mio codice: ${shareLink()}`;
        if (navigator.share) { try { await navigator.share({ title: 'LAVORAZIONI', text, url: shareLink() }); } catch {} }
        else { await copy(shareLink()); }
        return;
      }
      if (a === 'copy') { await copy(shareLink()); return; }
      if (a === 'use') {
        const c = normCode($('#codeInput').value);
        if (c.length < 29) { toast('Il codice deve avere 25 lettere/numeri'); return; }
        if (c === space) { toast('È già il codice di questo dispositivo'); return; }
        if (!confirm('Collegare questo dispositivo al codice inserito? Le attività già presenti qui verranno unite alle altre.')) return;
        space = c; store(SPACE, space);
        localStorage.removeItem(LASTPULL);
        reidAll();
        saveLocal();
        back.remove();
        restartRealtime();
        sync();
        toast('Dispositivo collegato ✓');
        return;
      }
      back.remove();
    });
    document.body.appendChild(back);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Link copiato'); }
    catch { prompt('Copia questo link:', text); }
  }

  /* ---------- Menu ---------- */
  const menu = $('#menu');
  $('#menuBtn').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });
  $('#syncStatus').onclick = () => { sync(); };

  menu.addEventListener('click', async e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    menu.hidden = true;
    const days = byDay();

    if (act === 'devices') deviceDialog();
    if (act === 'today') goToday();
    if (act === 'toggleEmpty') { prefs.hideEmpty = !prefs.hideEmpty; savePrefs(); render(); }

    if (act === 'copyPending') {
      const next = new Date(year, month + 1, 1);
      const nn = daysIn(next.getFullYear(), next.getMonth());
      let c = 0;
      for (let d = 1; d <= daysIn(year, month); d++) for (const t of days[keyOf(year, month, d)] || []) {
        if (t.stato === 'done') continue;
        addTask(keyOf(next.getFullYear(), next.getMonth(), Math.min(d, nn)), t.text, t.stato);
        c++;
      }
      toast(c ? `${c} attività copiate in ${MESI[next.getMonth()]}` : 'Nessuna attività da portare avanti');
    }

    if (act === 'share') {
      const lines = [`LAVORAZIONI — ${MESI[month]} ${year}`];
      const sym = { todo: '☐ Da fare', done: '☑ Conclusa', hold: '⏸ In sospeso' };
      for (let d = 1; d <= daysIn(year, month); d++) {
        const list = days[keyOf(year, month, d)] || [];
        if (!list.length) continue;
        lines.push('', `${GIORNI[new Date(year, month, d).getDay()]} ${d}`);
        for (const t of list) lines.push(`  ${sym[t.stato]} — ${t.text}`);
      }
      const text = lines.join('\n');
      if (navigator.share) { try { await navigator.share({ title: 'LAVORAZIONI', text }); } catch {} }
      else await copy(text);
    }

    if (act === 'export') {
      const out = {};
      for (const [k, l] of Object.entries(days)) out[k] = l.map(t => ({ id: t.id, text: t.text, stato: t.stato }));
      const blob = new Blob([JSON.stringify({ app: 'LAVORAZIONI', versione: 1, data: out }, null, 2)], { type: 'application/json' });
      const file = new File([blob], `lavorazioni-backup-${todayKey()}.json`, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Backup LAVORAZIONI' }); } catch {}
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    }

    if (act === 'import') $('#importFile').click();

    if (act === 'clearMonth') {
      if (!confirm(`Eliminare tutte le attività di ${MESI[month]} ${year}? Spariranno da tutti i dispositivi.`)) return;
      for (let d = 1; d <= daysIn(year, month); d++) for (const t of days[keyOf(year, month, d)] || []) removeTask(t.id, true);
      render(); toast('Mese svuotato');
    }
  });

  // Il backup viene aggiunto alle attività esistenti (quelle con lo stesso id vengono aggiornate)
  $('#importFile').onchange = async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const d = j.data || j;
      if (typeof d !== 'object' || Array.isArray(d)) throw 0;
      if (!confirm('Ripristinare il backup? Le attività del backup verranno aggiunte e sincronizzate su tutti i dispositivi.')) return;
      let pos = Date.now(), n = 0;
      for (const [day, list] of Object.entries(d)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(list)) continue;
        for (const t of list) {
          if (!t || typeof t.text !== 'string') continue;
          const id = typeof t.id === 'string' && t.id ? t.id : uid();
          tasks[id] = { id, day, text: t.text.slice(0, 1000), stato: ['todo', 'done', 'hold'].includes(t.stato) ? t.stato : 'todo', pos: pos++, deleted: false, ts: Date.now() };
          pending.add(id); n++;
        }
      }
      saveLocal(); render(); scheduleFlush(); toast(`Backup ripristinato (${n} attività)`);
    } catch { toast('File di backup non valido'); }
  };

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) { sync(); safeRender(); } });

  render();
  setTimeout(goToday, 50);
  setStatus(navigator.onLine ? 'busy' : 'off');
  startRealtime();
  sync();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
