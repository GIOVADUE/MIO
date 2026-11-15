/* LAVORAZIONI — attività del mese giorno per giorno.
   Dati salvati nel dispositivo (localStorage) con questa forma:
   { "2026-11-15": [ { id, text, stato: "todo" | "done" | "hold" } ] } */
(() => {
  'use strict';

  const KEY = 'lavorazioni-dati-v1';
  const PREFS = 'lavorazioni-prefs-v1';
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
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
  let data = load(KEY, {});
  let prefs = Object.assign({ hideEmpty: false }, load(PREFS, {}));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { toast('Impossibile salvare: memoria piena?'); } };
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch {} };

  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth();
  let filter = 'all';
  let openAdd = null; // giorno con il campo "nuova attività" aperto

  const todayKey = () => { const t = new Date(); return keyOf(t.getFullYear(), t.getMonth(), t.getDate()); };
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

  /* ---------- Disegno ---------- */
  function render() {
    $('#monthLabel').textContent = `${MESI[month]} ${year}`;
    $('#toggleEmpty').textContent = prefs.hideEmpty ? '📅 Mostra tutti i giorni' : '🧹 Mostra solo i giorni con attività';

    const n = daysIn(year, month);
    const count = { all: 0, todo: 0, done: 0, hold: 0 };
    for (let d = 1; d <= n; d++) for (const t of data[keyOf(year, month, d)] || []) { count.all++; count[t.stato]++; }

    $('#stats').innerHTML = [['all', 'Tutte'], ['todo', 'Da fare'], ['done', 'Concluse'], ['hold', 'In sospeso']]
      .map(([id, l]) => `<button class="chip ${filter === id ? 'on' : ''}" data-filter="${id}">${l}<b>${count[id]}</b></button>`).join('');

    const main = $('#days');
    main.innerHTML = '';
    const tk = todayKey();
    let shown = 0;

    for (let d = 1; d <= n; d++) {
      const k = keyOf(year, month, d);
      const all = data[k] || [];
      const tasks = filter === 'all' ? all : all.filter(t => t.stato === filter);
      const isToday = k === tk;
      if ((prefs.hideEmpty || filter !== 'all') && !tasks.length && !isToday && openAdd !== k) continue;
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

      if (tasks.length) {
        const cols = document.createElement('div');
        cols.className = 'cols';
        cols.innerHTML = '<span>Attività</span>' + STATI.map(s => `<span>${s.label}</span>`).join('');
        sec.appendChild(cols);
        for (const t of tasks) sec.appendChild(taskRow(t));
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
    const inp = main.querySelector('.new-row input');
    if (inp) inp.focus();
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

  const findTask = (day, id) => (data[day] || []).find(t => t.id === id);

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
      const t = findTask(day, box.closest('.task').dataset.id);
      if (!t) return;
      t.stato = box.dataset.stato;
      save();
      if (navigator.vibrate) navigator.vibrate(8);
      render();
    }
  });

  $('#days').addEventListener('submit', e => {
    e.preventDefault();
    const sec = e.target.closest('.day');
    const inp = e.target.querySelector('input');
    const text = inp.value.trim();
    if (!text) { openAdd = null; render(); return; }
    (data[sec.dataset.day] ||= []).push({ id: uid(), text, stato: 'todo' });
    save();
    render(); // il campo resta aperto per aggiungere la successiva
  });

  $('#days').addEventListener('input', e => {
    if (e.target.classList.contains('task-text')) autosize(e.target);
  });

  // Salvataggio del testo modificato (vuoto = chiede se eliminare)
  $('#days').addEventListener('focusout', e => {
    if (!e.target.classList.contains('task-text')) return;
    const day = e.target.closest('.day').dataset.day;
    const t = findTask(day, e.target.closest('.task').dataset.id);
    if (!t) return;
    const v = e.target.value.trim();
    if (!v) {
      if (confirm('Eliminare questa attività?')) { removeTask(day, t.id); return; }
      e.target.value = t.text;
      return;
    }
    if (v !== t.text) { t.text = v; save(); }
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
    taskSheet(row.closest('.day').dataset.day, row.dataset.id);
  });
  $('#days').addEventListener('touchstart', e => {
    const row = e.target.closest('.task');
    if (!row || e.target.closest('.box')) return;
    pressTimer = setTimeout(() => { pressTimer = null; document.activeElement?.blur(); taskSheet(row.closest('.day').dataset.day, row.dataset.id); }, 550);
  }, { passive: true });
  ['touchend', 'touchmove', 'touchcancel'].forEach(ev => $('#days').addEventListener(ev, () => { clearTimeout(pressTimer); pressTimer = null; }, { passive: true }));

  function removeTask(day, id) {
    data[day] = (data[day] || []).filter(t => t.id !== id);
    if (!data[day].length) delete data[day];
    save(); render(); toast('Attività eliminata');
  }

  function moveTask(day, id, deltaDays) {
    const t = findTask(day, id);
    if (!t) return;
    const [y, m, d] = day.split('-').map(Number);
    const dt = new Date(y, m - 1, d + deltaDays);
    const nk = keyOf(dt.getFullYear(), dt.getMonth(), dt.getDate());
    data[day] = data[day].filter(x => x.id !== id);
    if (!data[day].length) delete data[day];
    (data[nk] ||= []).push(t);
    save(); render();
    toast(`Spostata a ${GIORNI[dt.getDay()]} ${dt.getDate()} ${MESI[dt.getMonth()]}`);
  }

  function taskSheet(day, id) {
    const t = findTask(day, id);
    if (!t) return;
    const back = document.createElement('div');
    back.className = 'sheet-back';
    back.innerHTML = `<div class="sheet">
      <h3></h3>
      <button data-a="next">➡️ Sposta al giorno dopo</button>
      <button data-a="prev">⬅️ Sposta al giorno prima</button>
      <button data-a="dup">📄 Duplica nel giorno dopo</button>
      <button data-a="del" class="danger">🗑 Elimina</button>
      <button data-a="x" class="cancel">Annulla</button></div>`;
    back.querySelector('h3').textContent = t.text;
    back.addEventListener('click', e => {
      const a = e.target.closest('button')?.dataset.a;
      if (!a && e.target !== back) return;
      back.remove();
      if (a === 'next') moveTask(day, id, 1);
      if (a === 'prev') moveTask(day, id, -1);
      if (a === 'del') removeTask(day, id);
      if (a === 'dup') {
        const [y, m, d] = day.split('-').map(Number);
        const dt = new Date(y, m - 1, d + 1);
        (data[keyOf(dt.getFullYear(), dt.getMonth(), dt.getDate())] ||= []).push({ id: uid(), text: t.text, stato: 'todo' });
        save(); render(); toast('Duplicata nel giorno dopo');
      }
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
  document.addEventListener('touchstart', e => { if (e.target.closest('input, textarea, .sheet-back')) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
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

  /* ---------- Menu ---------- */
  const menu = $('#menu');
  $('#menuBtn').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });

  menu.addEventListener('click', async e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    menu.hidden = true;

    if (act === 'today') goToday();
    if (act === 'toggleEmpty') { prefs.hideEmpty = !prefs.hideEmpty; savePrefs(); render(); }

    if (act === 'copyPending') {
      const n = daysIn(year, month);
      const next = new Date(year, month + 1, 1);
      const nn = daysIn(next.getFullYear(), next.getMonth());
      let c = 0;
      for (let d = 1; d <= n; d++) for (const t of data[keyOf(year, month, d)] || []) {
        if (t.stato === 'done') continue;
        const nk = keyOf(next.getFullYear(), next.getMonth(), Math.min(d, nn));
        (data[nk] ||= []).push({ id: uid(), text: t.text, stato: t.stato });
        c++;
      }
      if (!c) { toast('Nessuna attività da portare avanti'); return; }
      save();
      toast(`${c} attività copiate in ${MESI[next.getMonth()]}`);
    }

    if (act === 'share') {
      const lines = [`LAVORAZIONI — ${MESI[month]} ${year}`];
      const sym = { todo: '☐ Da fare', done: '☑ Conclusa', hold: '⏸ In sospeso' };
      for (let d = 1; d <= daysIn(year, month); d++) {
        const list = data[keyOf(year, month, d)] || [];
        if (!list.length) continue;
        lines.push('', `${GIORNI[new Date(year, month, d).getDay()]} ${d}`);
        for (const t of list) lines.push(`  ${sym[t.stato]} — ${t.text}`);
      }
      const text = lines.join('\n');
      if (navigator.share) { try { await navigator.share({ title: 'LAVORAZIONI', text }); } catch {} }
      else if (navigator.clipboard) { await navigator.clipboard.writeText(text); toast('Riepilogo copiato negli appunti'); }
    }

    if (act === 'export') {
      const blob = new Blob([JSON.stringify({ app: 'LAVORAZIONI', versione: 1, data }, null, 2)], { type: 'application/json' });
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
      if (!confirm(`Eliminare tutte le attività di ${MESI[month]} ${year}?`)) return;
      for (let d = 1; d <= daysIn(year, month); d++) delete data[keyOf(year, month, d)];
      save(); render(); toast('Mese svuotato');
    }
  });

  $('#importFile').onchange = async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const d = j.data || j;
      if (typeof d !== 'object' || Array.isArray(d)) throw 0;
      if (!confirm('Ripristinare il backup? Le attività attuali saranno sostituite.')) return;
      data = d; save(); render(); toast('Backup ripristinato');
    } catch { toast('File di backup non valido'); }
  };

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // Aggiornamento automatico quando cambia il giorno (app lasciata aperta)
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.activeElement?.matches('input, textarea')) render(); });

  render();
  setTimeout(goToday, 50);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
