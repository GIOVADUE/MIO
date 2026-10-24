/* Tempo: organizza lavoro e vita personale (blocchi orari, priorità, timer, bilancio) */
const QUADRANTI = [
  ['q1', 'Fai subito', 'Urgente e importante'],
  ['q2', 'Pianifica', 'Importante, non urgente'],
  ['q3', 'Delega o sbriga', 'Urgente, non importante'],
  ['q4', 'Elimina', 'Né urgente né importante']
];
const toMin = s => { const [h, m] = (s || '0:0').split(':').map(Number); return h * 60 + m; };
const fromMin = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

const Tempo = {
  seed() {
    const areas = [
      { id: 'lavoro', name: 'Lavoro', kind: 'work', color: '#2383e2', goal: 40 },
      { id: 'progetti', name: 'Progetti', kind: 'work', color: '#8b5cf6', goal: 5 },
      { id: 'famiglia', name: 'Famiglia e amici', kind: 'personal', color: '#f59e0b', goal: 10 },
      { id: 'salute', name: 'Sport e salute', kind: 'personal', color: '#10b981', goal: 4 },
      { id: 'me', name: 'Tempo per me', kind: 'personal', color: '#ec4899', goal: 5 }
    ];
    const tasks = [
      { id: uid(), title: 'Preparare la riunione di lunedì', area: 'lavoro', prio: 'q1', est: 60, done: false },
      { id: uid(), title: 'Palestra', area: 'salute', prio: 'q2', est: 60, done: false },
      { id: uid(), title: 'Chiamare i genitori', area: 'famiglia', prio: 'q2', est: 30, done: false },
      { id: uid(), title: 'Rispondere alle email', area: 'lavoro', prio: 'q3', est: 30, done: false }
    ];
    const today = ymd(new Date());
    const blocks = [
      { id: uid(), date: today, start: '09:00', end: '10:30', title: 'Lavoro concentrato', area: 'lavoro' },
      { id: uid(), date: today, start: '19:00', end: '20:00', title: 'Passeggiata', area: 'salute' }
    ];
    return { areas, tasks, blocks, log: [] };
  },
  data() {
    let d = Store.get('tempo', null);
    if (!d) { d = this.seed(); this.save(d); }
    return d;
  },
  save(d) { Store.set('tempo', d); },
  area(d, id) { return d.areas.find(a => a.id === id) || { id: '', name: 'Senza area', kind: 'personal', color: '#9b9a97', goal: 0 }; },
  blocksFor(d, key) { return d.blocks.filter(b => b.date === key).sort((a, b) => a.start.localeCompare(b.start)); },
  hours(b) { let m = toMin(b.end) - toMin(b.start); if (m <= 0) m += 1440; return m / 60; },

  // ore del giorno per area (blocchi) + ore del mio turno di lavoro
  dayHours(d, date) {
    const out = {};
    this.blocksFor(d, ymd(date)).forEach(b => { out[b.area] = (out[b.area] || 0) + this.hours(b); });
    const s = Turni.myShift(date);
    const shift = s && s.type ? Turni.hours(s.type) : 0;
    return { byArea: out, shift };
  },

  /* ----- Blocco orario: crea o modifica ----- */
  blockSheet(b, onDone) {
    const d = this.data(), isNew = !b.id;
    const m = openModal(`
      <h3>${isNew ? 'Nuovo blocco' : 'Modifica blocco'}</h3>
      <label class="field"><span>Cosa fai</span><input id="bTitle" value="${esc(b.title || '')}" placeholder="Es. Lavoro concentrato"></label>
      <label class="field"><span>Area</span><select id="bArea">${d.areas.map(a => `<option value="${a.id}" ${a.id === b.area ? 'selected' : ''}>${esc(a.name)} · ${a.kind === 'work' ? 'lavoro' : 'personale'}</option>`).join('')}</select></label>
      <div class="tp-3">
        <label class="field"><span>Giorno</span><input type="date" id="bDate" value="${b.date}"></label>
        <label class="field"><span>Inizio</span><input type="time" id="bStart" value="${b.start}"></label>
        <label class="field"><span>Fine</span><input type="time" id="bEnd" value="${b.end}"></label>
      </div>
      <div class="modal-actions">
        ${isNew ? '' : '<button class="btn danger" data-a="del">Elimina</button><button class="btn" data-a="focus">▶ Concentrati</button><div class="spacer"></div>'}
        <button class="btn ghost" data-a="cancel">Annulla</button>
        <button class="btn primary" data-a="save">${isNew ? 'Aggiungi' : 'Salva'}</button>
      </div>`);
    const box = m.el;
    $('#bStart', box).addEventListener('change', () => {
      const s = $('#bStart', box).value, f = $('#bEnd', box);
      if (s && (!f.value || f.value <= s)) f.value = fromMin(Math.min(toMin(s) + 60, 1439));
    });
    box.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      const dd = this.data();
      if (a === 'cancel') return m.close();
      if (a === 'del') dd.blocks = dd.blocks.filter(x => x.id !== b.id);
      if (a === 'focus') { m.close(); return Timer.start({ taskId: b.taskId, area: b.area, label: b.title }); }
      if (a === 'save') {
        const out = { ...b, id: b.id || uid(), title: $('#bTitle', box).value.trim() || this.area(dd, $('#bArea', box).value).name,
          area: $('#bArea', box).value, date: $('#bDate', box).value || b.date, start: $('#bStart', box).value, end: $('#bEnd', box).value };
        if (!out.start || !out.end) return toast('Indica inizio e fine');
        dd.blocks = dd.blocks.filter(x => x.id !== out.id);
        dd.blocks.push(out);
      }
      this.save(dd);
      m.close();
      onDone && onDone();
    });
    if (isNew) setTimeout(() => $('#bTitle', box).focus(), 50);
  },

  /* ----- Attività: crea o modifica ----- */
  taskSheet(t, onDone) {
    const d = this.data(), isNew = !t.id;
    const m = openModal(`
      <h3>${isNew ? 'Nuova attività' : 'Modifica attività'}</h3>
      <label class="field"><span>Attività</span><input id="kTitle" value="${esc(t.title || '')}"></label>
      <label class="field"><span>Area</span><select id="kArea">${d.areas.map(a => `<option value="${a.id}" ${a.id === t.area ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
      <label class="field"><span>Priorità</span><select id="kPrio">${QUADRANTI.map(([q, l, s]) => `<option value="${q}" ${q === t.prio ? 'selected' : ''}>${l} (${s.toLowerCase()})</option>`).join('')}</select></label>
      <label class="field"><span>Durata stimata (minuti)</span><input type="number" id="kEst" min="5" step="5" value="${t.est || 60}"></label>
      <div class="modal-actions">
        ${isNew ? '' : '<button class="btn danger" data-a="del">Elimina</button><div class="spacer"></div>'}
        <button class="btn ghost" data-a="cancel">Annulla</button>
        <button class="btn primary" data-a="save">${isNew ? 'Aggiungi' : 'Salva'}</button>
      </div>`);
    const box = m.el;
    box.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      const dd = this.data();
      if (a === 'cancel') return m.close();
      if (a === 'del') dd.tasks = dd.tasks.filter(x => x.id !== t.id);
      if (a === 'save') {
        const title = $('#kTitle', box).value.trim();
        if (!title) return toast("Scrivi il nome dell'attività");
        const out = { done: false, ...t, id: t.id || uid(), title, area: $('#kArea', box).value, prio: $('#kPrio', box).value, est: Math.max(5, +$('#kEst', box).value || 60) };
        const i = dd.tasks.findIndex(x => x.id === out.id);
        if (i >= 0) dd.tasks[i] = out; else dd.tasks.push(out);
      }
      this.save(dd);
      m.close();
      onDone && onDone();
    });
    setTimeout(() => $('#kTitle', box).focus(), 50);
  },

  /* ----- Aree: nome, lavoro/personale, colore, obiettivo settimanale ----- */
  areasSheet(onDone) {
    const d = this.data();
    let areas = JSON.parse(JSON.stringify(d.areas));
    const m = openModal(`<h3>Aree della tua vita</h3>
      <p class="muted small">Ogni blocco e attività appartiene a un'area. L'obiettivo è quante ore a settimana vuoi dedicarle.</p>
      <div id="aRows"></div>
      <button class="btn sm" data-a="add">+ Area</button>
      <div class="modal-actions"><button class="btn ghost" data-a="cancel">Annulla</button><button class="btn primary" data-a="save">Salva</button></div>`);
    const rows = $('#aRows', m.el);
    const draw = () => {
      rows.innerHTML = areas.map((a, i) => `<div class="tp-area-row">
        <input type="color" data-i="${i}" data-k="color" value="${a.color}" aria-label="Colore">
        <input data-i="${i}" data-k="name" value="${esc(a.name)}" aria-label="Nome">
        <select data-i="${i}" data-k="kind" aria-label="Tipo"><option value="work" ${a.kind === 'work' ? 'selected' : ''}>Lavoro</option><option value="personal" ${a.kind !== 'work' ? 'selected' : ''}>Personale</option></select>
        <input type="number" min="0" data-i="${i}" data-k="goal" value="${a.goal || 0}" aria-label="Obiettivo ore a settimana" title="Ore a settimana">
        <button class="icon-btn sm" data-x="${i}" aria-label="Rimuovi">×</button></div>`).join('');
    };
    rows.addEventListener('input', e => {
      const { i, k } = e.target.dataset;
      if (k) areas[i][k] = k === 'goal' ? +e.target.value || 0 : e.target.value;
    });
    m.el.addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      if (x) { areas.splice(+x.dataset.x, 1); return draw(); }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'add') { areas.push({ id: uid(), name: 'Nuova area', kind: 'personal', color: '#64748b', goal: 0 }); draw(); }
      if (a === 'cancel') m.close();
      if (a === 'save') {
        const dd = this.data();
        dd.areas = areas.filter(a => a.name.trim());
        this.save(dd);
        m.close();
        onDone && onDone();
      }
    });
    draw();
  }
};

/* Timer di concentrazione (Pomodoro). Continua anche se cambi sezione. */
const Timer = {
  state() { return Store.get('tempoTimer', null); },
  set(s) { Store.set('tempoTimer', s); document.dispatchEvent(new Event('mio:timer')); },
  left(s = this.state()) { return !s ? 0 : s.pausedLeft != null ? s.pausedLeft : Math.max(0, s.endsAt - Date.now()); },
  start({ taskId = '', area = '', label = '', len } = {}) {
    Reminders.askPermission();
    len = len || Store.get('tempoLen', 25);
    this.set({ mode: 'focus', len, taskId, area, label, endsAt: Date.now() + len * 60000, pausedLeft: null });
    if (location.hash !== '#/tempo') location.hash = '#/tempo';
  },
  pause() { const s = this.state(); if (s && s.pausedLeft == null) { s.pausedLeft = this.left(s); this.set(s); } },
  resume() { const s = this.state(); if (s && s.pausedLeft != null) { s.endsAt = Date.now() + s.pausedLeft; s.pausedLeft = null; this.set(s); } },
  stop(logIt) {
    const s = this.state();
    if (s && s.mode === 'focus' && logIt) {
      const min = Math.round((s.len * 60000 - this.left(s)) / 60000);
      if (min >= 1) this.log(s, min);
    }
    this.set(null);
  },
  log(s, min) {
    const d = Tempo.data();
    d.log.push({ id: uid(), date: ymd(new Date()), area: s.area, taskId: s.taskId, min });
    // tiene lo storico degli ultimi 120 giorni
    const cut = ymd(addDays(new Date(), -120));
    d.log = d.log.filter(l => l.date >= cut);
    Tempo.save(d);
  },
  notify(title, body) {
    toast(`⏰ ${title}`);
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body, icon: 'icons/icon-192.png', tag: 'mio-timer' }); } catch { /* niente */ }
  },
  tick() {
    const s = this.state();
    if (!s || s.pausedLeft != null || Date.now() < s.endsAt) return;
    if (s.mode === 'focus') {
      this.log(s, s.len);
      const brk = s.len >= 50 ? 10 : 5;
      this.set({ ...s, mode: 'break', endsAt: Date.now() + brk * 60000, pausedLeft: null, brk });
      this.notify('Sessione finita: fai una pausa', `${s.len} minuti${s.label ? ' su ' + s.label : ''} registrati`);
    } else {
      this.set(null);
      this.notify('Pausa finita', 'Pronto per un’altra sessione?');
    }
  }
};
setInterval(() => Timer.tick(), 1000);

Views.tempo = {
  title: 'Tempo',
  render(view) {
    let mode = Store.get('tempoMode', 'day');
    let anchor = new Date();
    const HOUR = 48; // pixel per ora nella giornata

    view.innerHTML = `
      <div class="view wide">
        <div class="view-head">
          <h1>⏱️ Tempo</h1>
          <div class="seg" id="tpMode"><button data-m="day">Giornata</button><button data-m="week">Bilancio settimana</button></div>
        </div>
        <div class="row gap wrap tp-bar">
          <button class="btn" id="tpPrev" aria-label="Precedente">‹</button>
          <button class="btn" id="tpToday">Oggi</button>
          <button class="btn" id="tpNext" aria-label="Successivo">›</button>
          <strong id="tpRange" class="range"></strong>
          <div class="spacer"></div>
          <button class="btn" id="tpAreas">🎨 Aree</button>
        </div>
        <div id="tpBody"></div>
      </div>`;
    const body = $('#tpBody', view);

    function paint() {
      $$('#tpMode button', view).forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      if (mode === 'day') {
        $('#tpRange', view).textContent = fullDate(anchor);
        paintDay();
      } else {
        const s = startOfWeek(anchor), e = addDays(s, 6);
        $('#tpRange', view).textContent = `${s.getDate()} ${MESI[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MESI[e.getMonth()].slice(0, 3)} ${e.getFullYear()}`;
        paintWeek();
      }
    }

    /* ===== Giornata: timer + priorità + blocchi orari ===== */
    function paintDay() {
      const d = Tempo.data(), key = ymd(anchor);
      body.innerHTML = `<div class="tp-day">
        <div class="tp-side">
          <section class="card tp-timer" id="tpTimer"></section>
          <section class="card">
            <div class="row gap"><h3 class="grow">Priorità</h3><button class="btn sm" id="tpAddTask">+ Attività</button></div>
            <form class="tp-quick" id="tpQuick"><input placeholder="Aggiungi un'attività e premi Invio" aria-label="Nuova attività"></form>
            <div class="tp-matrix">${QUADRANTI.map(([q, l, s]) => {
              const list = d.tasks.filter(t => t.prio === q);
              return `<div class="tp-quad ${q}" data-q="${q}"><div class="tp-qhead"><b>${l}</b><span class="muted small">${s}</span></div>
                ${list.map(t => { const a = Tempo.area(d, t.area); return `<div class="tp-task ${t.done ? 'done' : ''}" draggable="true" data-id="${t.id}">
                  <input type="checkbox" ${t.done ? 'checked' : ''} aria-label="Fatto">
                  <span class="dot-sm" style="background:${a.color}" title="${esc(a.name)}"></span>
                  <span class="grow tp-ttl">${esc(t.title)}</span>
                  ${t.done ? '' : `<button class="icon-btn sm" data-a="plan" title="Metti nella giornata" aria-label="Pianifica">📅</button>
                  <button class="icon-btn sm" data-a="focus" title="Avvia il timer" aria-label="Concentrati">▶</button>`}</div>`; }).join('')
                  || '<div class="muted small tp-none">Trascina qui un\'attività</div>'}
              </div>`;
            }).join('')}</div>
            ${d.tasks.some(t => t.done) ? '<button class="link-btn small" id="tpClear">Rimuovi le attività completate</button>' : ''}
          </section>
        </div>
        <section class="card tp-plan">
          <div class="row gap"><h3 class="grow">Giornata</h3><span class="muted small">Tocca un'ora per aggiungere un blocco · trascina qui un'attività</span></div>
          <div class="tp-legend">${d.areas.map(a => `<span><i style="background:${a.color}"></i>${esc(a.name)}</span>`).join('')}<span><i class="tp-busy-i"></i>Impegni e turni</span></div>
          <div class="tp-scroll" id="tpScroll"><div class="tp-grid" id="tpGrid" style="height:${24 * HOUR}px">
            ${[...Array(24)].map((_, h) => `<div class="tp-hour" style="top:${h * HOUR}px"><span>${pad(h)}:00</span></div>`).join('')}
            <div class="tp-lane" id="tpLane"></div>
          </div></div>
        </section>
      </div>`;

      // impegni del calendario e turno (sola lettura) + blocchi
      const lane = $('#tpLane', body);
      const busy = Calendar.dayItems(anchor).filter(e => !e.allDay && e.start).map(e => ({ s: toMin(e.start), e: e.end ? toMin(e.end) : toMin(e.start) + 60, title: e.title, busy: true }));
      const blocks = Tempo.blocksFor(d, key).map(b => ({ s: toMin(b.start), e: toMin(b.end), b }));
      const items = [...busy, ...blocks].map(x => ({ ...x, e: x.e <= x.s ? 1440 : x.e })).sort((a, b) => a.s - b.s);
      // colonne affiancate per gli elementi sovrapposti
      let group = [], groupEnd = -1;
      const flush = () => { const cols = Math.max(...group.map(x => x.col)) + 1; group.forEach(x => { x.cols = cols; }); group = []; };
      items.forEach(x => {
        if (x.s >= groupEnd && group.length) flush();
        const used = group.filter(y => y.e > x.s).map(y => y.col);
        x.col = 0; while (used.includes(x.col)) x.col++;
        group.push(x); groupEnd = Math.max(groupEnd, x.e);
      });
      if (group.length) flush();
      lane.innerHTML = items.map(x => {
        const style = `top:${x.s / 60 * HOUR}px;height:${Math.max((x.e - x.s) / 60 * HOUR - 2, 18)}px;left:calc(${x.col} * 100% / ${x.cols});width:calc(100% / ${x.cols} - 4px)`;
        if (x.busy) return `<div class="tp-block busy" style="${style}" title="${esc(x.title)}"><b>${esc(x.title)}</b><span>${fromMin(x.s)}–${fromMin(x.e % 1440)}</span></div>`;
        const a = Tempo.area(d, x.b.area);
        return `<button class="tp-block" data-id="${x.b.id}" style="${style};--c:${a.color}"><b>${esc(x.b.title)}</b><span>${x.b.start}–${x.b.end} · ${esc(a.name)}</span></button>`;
      }).join('');
      if (key === ymd(new Date())) {
        const n = new Date(), mins = n.getHours() * 60 + n.getMinutes();
        lane.insertAdjacentHTML('beforeend', `<div class="tp-now" style="top:${mins / 60 * HOUR}px"></div>`);
      }
      const first = items.length ? items[0].s / 60 : 8;
      $('#tpScroll', body).scrollTop = Math.max(0, (key === ymd(new Date()) ? Math.min(new Date().getHours() - 1, first) : first) - 0.4) * HOUR;

      const minAt = y => Math.max(0, Math.min(1410, Math.floor(y / HOUR * 2) * 30));
      lane.addEventListener('click', e => {
        const blk = e.target.closest('.tp-block[data-id]');
        if (blk) return Tempo.blockSheet(Tempo.data().blocks.find(b => b.id === blk.dataset.id), paint);
        if (e.target.closest('.tp-block')) return;
        const s = minAt(e.offsetY);
        Tempo.blockSheet({ date: key, start: fromMin(s), end: fromMin(Math.min(s + 60, 1439)), title: '', area: d.areas[0]?.id }, paint);
      });
      lane.addEventListener('dragover', e => { if (e.dataTransfer.types.includes('text/tempo-task')) { e.preventDefault(); lane.classList.add('drop'); } });
      lane.addEventListener('dragleave', () => lane.classList.remove('drop'));
      lane.addEventListener('drop', e => {
        e.preventDefault();
        lane.classList.remove('drop');
        const id = e.dataTransfer.getData('text/tempo-task');
        const y = e.clientY - lane.getBoundingClientRect().top;
        planTask(id, minAt(y));
      });

      // attività
      const matrix = $('.tp-matrix', body);
      matrix.addEventListener('dragstart', e => {
        const t = e.target.closest('.tp-task');
        if (t) e.dataTransfer.setData('text/tempo-task', t.dataset.id);
      });
      matrix.addEventListener('dragover', e => { if (e.target.closest('.tp-quad')) e.preventDefault(); });
      matrix.addEventListener('drop', e => {
        const q = e.target.closest('.tp-quad');
        const id = e.dataTransfer.getData('text/tempo-task');
        if (!q || !id) return;
        e.preventDefault();
        const dd = Tempo.data(), t = dd.tasks.find(x => x.id === id);
        if (t) { t.prio = q.dataset.q; Tempo.save(dd); paint(); }
      });
      matrix.addEventListener('click', e => {
        const row = e.target.closest('.tp-task');
        if (!row) return;
        const dd = Tempo.data(), t = dd.tasks.find(x => x.id === row.dataset.id);
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (e.target.matches('input[type=checkbox]')) { t.done = e.target.checked; t.doneAt = t.done ? ymd(new Date()) : ''; Tempo.save(dd); return paint(); }
        if (a === 'focus') return Timer.start({ taskId: t.id, area: t.area, label: t.title });
        if (a === 'plan') {
          const n = new Date();
          const next = key === ymd(n) ? Math.ceil((n.getHours() * 60 + n.getMinutes()) / 30) * 30 : 9 * 60;
          return planTask(t.id, Math.min(next, 1410), true);
        }
        Tempo.taskSheet(t, paint);
      });
      $('#tpAddTask', body).onclick = () => Tempo.taskSheet({ area: d.areas[0]?.id, prio: 'q2', est: 60 }, paint);
      $('#tpQuick', body).onsubmit = e => {
        e.preventDefault();
        const title = $('input', e.target).value.trim();
        if (!title) return;
        const dd = Tempo.data();
        dd.tasks.push({ id: uid(), title, area: dd.areas[0]?.id, prio: 'q2', est: 60, done: false });
        Tempo.save(dd);
        paint();
        $('#tpQuick input', body).focus();
      };
      const clr = $('#tpClear', body);
      if (clr) clr.onclick = () => { const dd = Tempo.data(); dd.tasks = dd.tasks.filter(t => !t.done); Tempo.save(dd); paint(); };
      paintTimer();
    }

    // crea un blocco dall'attività (dalla durata stimata)
    function planTask(id, start, ask) {
      const t = Tempo.data().tasks.find(x => x.id === id);
      if (!t) return;
      const b = { date: ymd(anchor), start: fromMin(start), end: fromMin(Math.min(start + (t.est || 60), 1439)), title: t.title, area: t.area, taskId: t.id };
      if (ask) return Tempo.blockSheet(b, paint);
      const dd = Tempo.data();
      dd.blocks.push({ ...b, id: uid() });
      Tempo.save(dd);
      toast(`📅 ${t.title} alle ${b.start}`);
      paint();
    }

    function paintTimer() {
      const box = $('#tpTimer', body);
      if (!box) return;
      const s = Timer.state(), d = Tempo.data();
      if (!s) {
        const len = Store.get('tempoLen', 25);
        const open = d.tasks.filter(t => !t.done);
        box.innerHTML = `<div class="row gap"><h3 class="grow">Timer di concentrazione</h3>
            <div class="seg" id="tmLen">${[25, 50].map(n => `<button data-n="${n}" class="${n === len ? 'on' : ''}">${n} min</button>`).join('')}</div></div>
          <div class="tp-clock">${pad(len)}:00</div>
          <div class="row gap"><select id="tmTask" class="grow tp-select" aria-label="Su cosa lavori">
              <option value="">Scegli un'attività (facoltativo)</option>${open.map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join('')}</select>
            <button class="btn primary" id="tmGo">▶ Avvia</button></div>`;
        $('#tmLen', box).onclick = e => { const b = e.target.closest('[data-n]'); if (b) { Store.set('tempoLen', +b.dataset.n); paintTimer(); } };
        $('#tmGo', box).onclick = () => {
          const t = d.tasks.find(x => x.id === $('#tmTask', box).value);
          Timer.start(t ? { taskId: t.id, area: t.area, label: t.title } : { area: d.areas[0]?.id, label: '' });
        };
        return;
      }
      const left = Math.ceil(Timer.left(s) / 1000), a = Tempo.area(d, s.area);
      const total = s.mode === 'focus' ? s.len * 60 : (s.brk || 5) * 60;
      box.innerHTML = `<div class="row gap"><h3 class="grow">${s.mode === 'focus' ? '🎯 Concentrazione' : '☕ Pausa'}</h3>
          ${s.mode === 'focus' ? `<span class="tp-chip" style="--c:${a.color}">${esc(a.name)}</span>` : ''}</div>
        <div class="tp-clock">${pad(Math.floor(left / 60))}:${pad(left % 60)}</div>
        <div class="tp-progress"><i style="width:${100 - left / total * 100}%"></i></div>
        <p class="muted small">${s.mode === 'focus' ? (s.label ? esc(s.label) : 'Lavoro libero') : 'Alzati, bevi, respira. La prossima sessione parte quando vuoi.'}</p>
        <div class="row gap">
          ${s.pausedLeft != null ? '<button class="btn primary" data-t="resume">▶ Riprendi</button>' : '<button class="btn" data-t="pause">⏸ Pausa</button>'}
          <button class="btn" data-t="stop">${s.mode === 'focus' ? '■ Termina e registra' : 'Salta la pausa'}</button>
        </div>`;
      box.onclick = e => {
        const t = e.target.closest('[data-t]')?.dataset.t;
        if (t === 'pause') Timer.pause();
        if (t === 'resume') Timer.resume();
        if (t === 'stop') Timer.stop(true);
      };
    }

    /* ===== Bilancio settimana ===== */
    function paintWeek() {
      const d = Tempo.data(), mon = startOfWeek(anchor), ds = [...Array(7)].map((_, i) => addDays(mon, i));
      const keys = ds.map(ymd);
      const perArea = {}, perDay = ds.map(() => ({ work: 0, personal: 0 }));
      let shiftTot = 0;
      ds.forEach((x, i) => {
        const h = Tempo.dayHours(d, x);
        Object.entries(h.byArea).forEach(([id, v]) => {
          perArea[id] = (perArea[id] || 0) + v;
          perDay[i][Tempo.area(d, id).kind === 'work' ? 'work' : 'personal'] += v;
        });
        perDay[i].work += h.shift;
        shiftTot += h.shift;
      });
      const focus = {};
      d.log.filter(l => keys.includes(l.date)).forEach(l => { focus[l.area] = (focus[l.area] || 0) + l.min / 60; });
      const focusTot = Object.values(focus).reduce((a, b) => a + b, 0);
      const work = perDay.reduce((a, x) => a + x.work, 0), pers = perDay.reduce((a, x) => a + x.personal, 0);
      const doneN = d.tasks.filter(t => t.done && keys.includes(t.doneAt)).length;
      const pct = work + pers ? Math.round(pers / (work + pers) * 100) : 0;

      const rows = d.areas.map(a => ({ a, h: perArea[a.id] || 0, f: focus[a.id] || 0 }));
      if (shiftTot) rows.unshift({ a: { name: 'Turni di lavoro', color: '#94a3b8', goal: 0 }, h: shiftTot, f: 0 });
      const max = Math.max(1, ...rows.map(r => Math.max(r.h, r.a.goal || 0)));
      const dayMax = Math.max(1, ...perDay.map(x => x.work + x.personal));

      body.innerHTML = `
        <section class="card hours-card">
          <div class="hours-stats">
            <div><span class="hs-n">${fmtH(work)} h</span><span class="hs-l">Lavoro${shiftTot ? ` (di cui ${fmtH(shiftTot)} h di turni)` : ''}</span></div>
            <div><span class="hs-n">${fmtH(pers)} h</span><span class="hs-l">Vita personale · ${pct}% del tempo pianificato</span></div>
            <div><span class="hs-n">${fmtH(focusTot)} h</span><span class="hs-l">Concentrazione registrata col timer</span></div>
            <div><span class="hs-n">${doneN}</span><span class="hs-l">Attività completate</span></div>
          </div>
          ${work > 50 ? '<p class="tp-warn">⚠️ Più di 50 ore di lavoro questa settimana: proteggi qualche blocco per te.</p>' : ''}
          <h3>Ore per area rispetto all'obiettivo</h3>
          <div class="hbars tp-goal-bars">${rows.map(r => `<div class="hbar" tabindex="0" aria-label="${esc(r.a.name)}: ${fmtH(r.h)} ore pianificate${r.a.goal ? ' su ' + r.a.goal : ''}">
            <span class="hbar-name ellipsis"><i class="dot-sm" style="background:${r.a.color}"></i> ${esc(r.a.name)}</span>
            <span class="hbar-track"><span class="tp-track">
                <span class="hbar-fill" style="background:${r.a.color};width:${r.h / max * 100}%"></span>
                ${r.a.goal ? `<span class="tp-goal" style="left:${r.a.goal / max * 100}%" title="Obiettivo ${r.a.goal} h"></span>` : ''}
              </span>
              <span class="hbar-val">${fmtH(r.h)}${r.a.goal ? ` / ${r.a.goal}` : ''} h${r.f ? ` · 🎯 ${fmtH(r.f)}` : ''}</span></span>
          </div>`).join('')}</div>
          <p class="muted small">La barra è il tempo pianificato nei blocchi; la tacca è il tuo obiettivo settimanale; 🎯 sono le ore registrate col timer.</p>
        </section>
        <section class="card">
          <h3>Lavoro e vita, giorno per giorno</h3>
          <div class="tp-legend"><span><i class="tp-w"></i>Lavoro</span><span><i class="tp-p"></i>Personale</span></div>
          <div class="hbars">${ds.map((x, i) => { const v = perDay[i]; return `<button class="hbar tp-dayrow" data-k="${keys[i]}" aria-label="${GIORNI[x.getDay()]}: ${fmtH(v.work)} ore di lavoro, ${fmtH(v.personal)} personali">
            <span class="hbar-name">${GIORNI_BREVI[i]} ${x.getDate()}</span>
            <span class="hbar-track"><span class="tp-track"><span class="tp-w" style="width:${v.work / dayMax * 100}%"></span><span class="tp-p" style="width:${v.personal / dayMax * 100}%"></span></span>
              <span class="hbar-val">${fmtH(v.work)} · ${fmtH(v.personal)} h</span></span></button>`; }).join('')}</div>
        </section>`;
      $$('.tp-dayrow', body).forEach(b => { b.onclick = () => { anchor = parseYmd(b.dataset.k); mode = 'day'; Store.set('tempoMode', mode); paint(); }; });
    }

    $('#tpMode', view).onclick = e => { const b = e.target.closest('[data-m]'); if (b) { mode = b.dataset.m; Store.set('tempoMode', mode); paint(); } };
    $('#tpPrev', view).onclick = () => { anchor = addDays(anchor, mode === 'day' ? -1 : -7); paint(); };
    $('#tpNext', view).onclick = () => { anchor = addDays(anchor, mode === 'day' ? 1 : 7); paint(); };
    $('#tpToday', view).onclick = () => { anchor = new Date(); paint(); };
    $('#tpAreas', view).onclick = () => Tempo.areasSheet(paint);

    // aggiorna il timer ogni secondo finché la sezione è aperta
    const iv = setInterval(() => { if (!view.isConnected) return clearInterval(iv); if (mode === 'day' && Timer.state()) paintTimer(); }, 1000);
    const onTimer = () => { if (!view.isConnected) return document.removeEventListener('mio:timer', onTimer); if (mode === 'day') paintTimer(); };
    document.addEventListener('mio:timer', onTimer);
    paint();
  }
};
