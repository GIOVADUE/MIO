/* Calendario stile iPhone */
const CAL_COLORS = [['#ff3b30', 'Rosso'], ['#ff9500', 'Arancione'], ['#ffcc00', 'Giallo'], ['#34c759', 'Verde'], ['#007aff', 'Blu'], ['#af52de', 'Viola'], ['#a2845e', 'Marrone']];

const Calendar = {
  all() { return Store.get('events', []); },
  save(l) { Store.set('events', l); },
  forDate(key) {
    return this.all().filter(e => e.date === key).sort((a, b) => (a.allDay ? -1 : 0) - (b.allDay ? -1 : 0) || (a.start || '').localeCompare(b.start || ''));
  },
  // eventi + il mio turno di quel giorno
  dayItems(date) {
    const items = this.forDate(ymd(date)).map(e => ({ ...e, kind: 'event' }));
    const s = Turni.myShift(date);
    if (s && s.type && s.type.start) items.unshift({ kind: 'shift', title: `Turno: ${s.type.label}`, start: s.type.start, end: s.type.end, color: s.type.color });
    else if (s) items.unshift({ kind: 'shift', title: s.type ? s.type.label : `Turno ${s.code}`, allDay: true, color: s.type ? s.type.color : '#999' });
    return items;
  },
  timeLabel(e) { return e.allDay ? 'tutto il giorno' : `${e.start || ''}${e.end ? '–' + e.end : ''}`; },

  sheet(ev, onDone) {
    const isNew = !ev.id;
    const e = { title: '', place: '', date: ymd(new Date()), allDay: false, start: '09:00', end: '10:00', color: '#007aff', notes: '', ...ev };
    const m = openModal(`
      <div class="ios-sheet">
        <div class="ios-sheet-head">
          <button class="link-btn" data-a="cancel">Annulla</button>
          <strong>${isNew ? 'Nuovo evento' : 'Modifica evento'}</strong>
          <button class="link-btn bold" data-a="save">${isNew ? 'Aggiungi' : 'Fine'}</button>
        </div>
        <div class="ios-group">
          <input id="eTitle" placeholder="Titolo" value="${esc(e.title)}" aria-label="Titolo">
          <input id="ePlace" placeholder="Luogo" value="${esc(e.place)}" aria-label="Luogo">
        </div>
        <div class="ios-group">
          <label class="ios-row"><span>Tutto il giorno</span><input type="checkbox" class="switch" id="eAll" ${e.allDay ? 'checked' : ''}></label>
          <label class="ios-row"><span>Data</span><input type="date" id="eDate" value="${e.date}"></label>
          <label class="ios-row time-row"><span>Inizio</span><input type="time" id="eStart" value="${e.start}"></label>
          <label class="ios-row time-row"><span>Fine</span><input type="time" id="eEnd" value="${e.end}"></label>
        </div>
        <div class="ios-group">
          <div class="ios-row"><span>Calendario</span><div class="cal-colors">${CAL_COLORS.map(([c, n]) => `<button class="dot ${c === e.color ? 'on' : ''}" style="background:${c}" data-c="${c}" title="${n}" aria-label="${n}"></button>`).join('')}</div></div>
        </div>
        <div class="ios-group"><textarea id="eNotes" placeholder="Note" rows="3" aria-label="Note">${esc(e.notes)}</textarea></div>
        ${isNew ? '' : '<div class="ios-group"><button class="ios-danger" data-a="del">Elimina evento</button></div>'}
      </div>`, { cls: 'sheet-modal' });
    const box = m.el;
    const sync = () => $$('.time-row', box).forEach(r => { r.style.display = $('#eAll', box).checked ? 'none' : ''; });
    $('#eAll', box).onchange = sync;
    sync();
    $('.cal-colors', box).onclick = x => {
      const b = x.target.closest('.dot');
      if (!b) return;
      e.color = b.dataset.c;
      $$('.cal-colors .dot', box).forEach(d => d.classList.toggle('on', d === b));
    };
    box.addEventListener('click', x => {
      const a = x.target.closest('[data-a]')?.dataset.a;
      if (a === 'cancel') m.close();
      if (a === 'del') {
        Calendar.save(Calendar.all().filter(y => y.id !== e.id));
        m.close();
        onDone(e.date);
      }
      if (a === 'save') {
        const out = {
          ...e, id: e.id || uid(), title: $('#eTitle', box).value.trim() || 'Nuovo evento', place: $('#ePlace', box).value.trim(),
          allDay: $('#eAll', box).checked, date: $('#eDate', box).value || e.date,
          start: $('#eStart', box).value, end: $('#eEnd', box).value, notes: $('#eNotes', box).value
        };
        const l = Calendar.all().filter(y => y.id !== out.id);
        l.push(out);
        Calendar.save(l);
        m.close();
        onDone(out.date);
      }
    });
    if (isNew) setTimeout(() => $('#eTitle', box).focus(), 50);
  }
};

Views.calendario = {
  title: 'Calendario',
  render(view) {
    let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let selected = new Date();

    view.innerHTML = `
      <div class="view narrow">
        <div class="ios-cal">
          <div class="ios-top">
            <button class="link-btn red" id="cToday">Oggi</button>
            <div class="spacer"></div>
            <button class="ios-plus" id="cAdd" aria-label="Nuovo evento">+</button>
          </div>
          <div class="ios-head">
            <h1 id="cTitle"></h1>
            <div class="ios-arrows">
              <button class="link-btn red" id="cPrev" aria-label="Mese precedente">‹</button>
              <button class="link-btn red" id="cNext" aria-label="Mese successivo">›</button>
            </div>
          </div>
          <div class="ios-wd">${['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((x, i) => `<span class="${i > 4 ? 'we' : ''}">${x}</span>`).join('')}</div>
          <div class="ios-grid" id="cGrid"></div>
          <div class="ios-day">
            <div class="ios-day-title" id="cDayTitle"></div>
            <div id="cEvents"></div>
          </div>
        </div>
      </div>`;

    const grid = $('#cGrid', view);

    function paint() {
      const today = ymd(new Date()), sel = ymd(selected);
      $('#cTitle', view).innerHTML = `${MESI[month.getMonth()]} <span>${month.getFullYear()}</span>`;
      const lead = (month.getDay() + 6) % 7;
      const n = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      const events = Calendar.all();
      let html = '<span class="ios-cell empty"></span>'.repeat(lead);
      for (let d = 1; d <= n; d++) {
        const date = new Date(month.getFullYear(), month.getMonth(), d), k = ymd(date);
        const dots = events.filter(e => e.date === k).slice(0, 3).map(e => `<i style="background:${e.color}"></i>`);
        const s = Turni.myShift(date);
        if (s) dots.unshift(`<i class="shift" style="background:${s.type ? s.type.color : '#999'}"></i>`);
        const we = date.getDay() === 0 || date.getDay() === 6;
        html += `<button class="ios-cell ${k === today ? 'today' : ''} ${k === sel ? 'sel' : ''} ${we ? 'we' : ''}" data-d="${k}">
          <span class="num">${d}</span><span class="dots">${dots.slice(0, 3).join('')}</span></button>`;
      }
      grid.innerHTML = html;

      $('#cDayTitle', view).textContent = fullDate(selected);
      const items = Calendar.dayItems(selected);
      $('#cEvents', view).innerHTML = items.length
        ? items.map(e => `<div class="ios-ev ${e.kind}" ${e.id ? `data-id="${e.id}"` : ''}>
            <span class="bar" style="background:${e.color}"></span>
            <div class="ios-ev-main"><div class="ios-ev-title">${esc(e.title)}</div>${e.place ? `<div class="muted small">${esc(e.place)}</div>` : ''}</div>
            <div class="ios-ev-time">${esc(Calendar.timeLabel(e))}</div></div>`).join('')
        : '<div class="ios-none">Nessun evento</div>';
    }

    const go = dir => { month = new Date(month.getFullYear(), month.getMonth() + dir, 1); paint(); };
    $('#cPrev', view).onclick = () => go(-1);
    $('#cNext', view).onclick = () => go(1);
    $('#cToday', view).onclick = () => { selected = new Date(); month = new Date(selected.getFullYear(), selected.getMonth(), 1); paint(); };
    grid.onclick = e => {
      const c = e.target.closest('.ios-cell[data-d]');
      if (!c) return;
      if (c.dataset.d === ymd(selected)) return Calendar.sheet({ date: c.dataset.d }, done);
      selected = parseYmd(c.dataset.d);
      paint();
    };
    const done = date => { selected = parseYmd(date); month = new Date(selected.getFullYear(), selected.getMonth(), 1); paint(); };
    $('#cAdd', view).onclick = () => Calendar.sheet({ date: ymd(selected) }, done);
    $('#cEvents', view).onclick = e => {
      const r = e.target.closest('.ios-ev');
      if (!r) return;
      if (r.classList.contains('shift')) { location.hash = '#/turni'; return; }
      const ev = Calendar.all().find(x => x.id === r.dataset.id);
      if (ev) Calendar.sheet(ev, done);
    };

    // scorri a sinistra/destra per cambiare mese
    let sx = null;
    grid.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    grid.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      sx = null;
    });
    paint();
  }
};
