/* Tabella turni di lavoro stile Excel */
const Turni = {
  seed() {
    const e = [{ id: 'e1', name: 'Mario Rossi' }, { id: 'e2', name: 'Giulia Bianchi' }, { id: 'e3', name: 'Luca Verdi' }];
    const types = [
      { code: 'M', label: 'Mattina', start: '06:00', end: '14:00', color: '#fde68a' },
      { code: 'P', label: 'Pomeriggio', start: '14:00', end: '22:00', color: '#bfdbfe' },
      { code: 'N', label: 'Notte', start: '22:00', end: '06:00', color: '#c4b5fd' },
      { code: 'G', label: 'Giornata', start: '09:00', end: '18:00', color: '#a7f3d0' },
      { code: 'R', label: 'Riposo', start: '', end: '', color: '#e5e7eb' },
      { code: 'F', label: 'Ferie', start: '', end: '', color: '#fbcfe8' }
    ];
    // una settimana d'esempio a partire da questo lunedì
    const grid = {};
    const mon = startOfWeek(new Date());
    const pattern = [['M', 'M', 'P', 'P', 'N', 'R', 'R'], ['P', 'P', 'N', 'R', 'M', 'M', 'R'], ['N', 'R', 'M', 'M', 'P', 'P', 'F']];
    e.forEach((emp, r) => pattern[r].forEach((c, i) => { grid[ymd(addDays(mon, i)) + '|' + emp.id] = c; }));
    return { employees: e, types, grid };
  },
  data() {
    let d = Store.get('turni', null);
    if (!d) { d = this.seed(); this.save(d); }
    return d;
  },
  save(d) { Store.set('turni', d); },
  type(d, code) { return d.types.find(t => t.code === code); },
  hours(t) {
    if (!t || !t.start || !t.end) return 0;
    const [a, b] = t.start.split(':').map(Number), [c, e] = t.end.split(':').map(Number);
    let m = (c * 60 + e) - (a * 60 + b);
    if (m <= 0) m += 1440;
    return m / 60;
  },
  forDate(date) {
    const d = this.data(), key = ymd(date);
    return d.employees.map(emp => ({ emp, type: this.type(d, d.grid[key + '|' + emp.id]), code: d.grid[key + '|' + emp.id] })).filter(x => x.code);
  },
  myShift(date) {
    const me = Settings.get().myEmployee;
    return me ? this.forDate(date).find(x => x.emp.id === me) : null;
  },
  label(t) { return t ? `${t.label}${t.start ? ` ${t.start}–${t.end}` : ''}` : ''; }
};

const fmtH = h => (Math.round(h * 10) / 10).toString().replace('.', ',');

Views.turni = {
  title: 'Turni di lavoro',
  render(view) {
    let mode = Store.get('turniMode', 'week');
    let anchor = new Date();
    let lastCell = null;

    const days = () => {
      if (mode === 'week') { const s = startOfWeek(anchor); return [...Array(7)].map((_, i) => addDays(s, i)); }
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const n = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
      return [...Array(n)].map((_, i) => addDays(first, i));
    };
    const rangeLabel = ds => mode === 'week'
      ? `${ds[0].getDate()} ${MESI[ds[0].getMonth()].slice(0, 3)} – ${ds[6].getDate()} ${MESI[ds[6].getMonth()].slice(0, 3)} ${ds[6].getFullYear()}`
      : `${MESI[anchor.getMonth()]} ${anchor.getFullYear()}`;

    view.innerHTML = `
      <div class="view wide">
        <div class="view-head">
          <h1>📊 Turni di lavoro</h1>
          <div class="seg" id="tMode"><button data-m="week">Settimana</button><button data-m="month">Mese</button></div>
        </div>
        <div class="row gap wrap sheet-bar no-print">
          <button class="btn" id="tPrev" aria-label="Precedente">‹</button>
          <button class="btn" id="tToday">Oggi</button>
          <button class="btn" id="tNext" aria-label="Successivo">›</button>
          <strong id="tRange" class="range"></strong>
          <div class="spacer"></div>
          <button class="btn" id="tAdd">+ Dipendente</button>
          <button class="btn" id="tCopy" title="Copia i turni della settimana precedente">⧉ Copia sett. prec.</button>
          <button class="btn" id="tXls">⬇️ Excel</button>
          <button class="btn" id="tCsv">⬇️ CSV</button>
          <button class="btn" id="tImp">⬆️ Importa CSV</button>
          <button class="btn" id="tPrint">🖨️</button>
        </div>
        <div class="legend no-print" id="tLegend"></div>
        <div class="sheet-wrap"><table class="sheet" id="tSheet"></table></div>
        <p class="muted small no-print">Scrivi il codice del turno in una cella (es. <b>M</b>), oppure seleziona una cella e tocca un turno nella legenda.
        Frecce e Invio per spostarti come in Excel. Doppio clic sul nome per rinominare.</p>
      </div>`;

    const sheet = $('#tSheet', view);

    function paint() {
      const d = Turni.data(), ds = days(), today = ymd(new Date());
      $$('#tMode button', view).forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      $('#tRange', view).textContent = rangeLabel(ds);
      $('#tCopy', view).style.display = mode === 'week' ? '' : 'none';
      $('#tLegend', view).innerHTML = d.types.map(t =>
        `<button class="leg" data-code="${esc(t.code)}" style="--c:${t.color}"><b>${esc(t.code)}</b> ${esc(t.label)}${t.start ? ` <span>${t.start}–${t.end}</span>` : ''}</button>`
      ).join('') + `<button class="leg" data-code="" style="--c:transparent">⌫ Svuota</button><button class="btn ghost sm" id="tTypes">Modifica turni</button>`;

      const head = `<thead><tr><th class="corner">Dipendente</th>${ds.map(x => {
        const k = ymd(x), we = x.getDay() === 0 || x.getDay() === 6;
        return `<th class="${we ? 'we' : ''} ${k === today ? 'today' : ''}"><span>${GIORNI_BREVI[(x.getDay() + 6) % 7]}</span><b>${x.getDate()}</b></th>`;
      }).join('')}<th class="tot">Ore</th></tr></thead>`;

      const body = d.employees.map((emp, r) => {
        let tot = 0;
        const cells = ds.map((x, c) => {
          const code = d.grid[ymd(x) + '|' + emp.id] || '';
          const t = Turni.type(d, code);
          tot += Turni.hours(t);
          return `<td><input class="cell ${code && !t ? 'bad' : ''}" data-r="${r}" data-c="${c}" value="${esc(code)}" maxlength="3"
            style="${t ? `background:${t.color}` : ''}" title="${esc(Turni.label(t))}" aria-label="${esc(emp.name)} ${ymd(x)}"></td>`;
        }).join('');
        return `<tr><th class="emp"><span class="emp-name" data-id="${emp.id}">${esc(emp.name)}</span><button class="del-emp no-print" data-id="${emp.id}" title="Rimuovi">×</button></th>${cells}<td class="tot">${fmtH(tot)}</td></tr>`;
      }).join('');

      const foot = `<tfoot><tr><th>Copertura</th>${ds.map(x => {
        const counts = {};
        d.employees.forEach(emp => {
          const t = Turni.type(d, d.grid[ymd(x) + '|' + emp.id]);
          if (t && t.start) counts[t.code] = (counts[t.code] || 0) + 1;
        });
        return `<td>${Object.entries(counts).map(([k, v]) => `<span>${esc(k)}${v}</span>`).join(' ')}</td>`;
      }).join('')}<td></td></tr></tfoot>`;

      sheet.innerHTML = head + `<tbody>${body || `<tr><td colspan="${ds.length + 2}" class="empty">Aggiungi un dipendente per iniziare</td></tr>`}</tbody>` + foot;
      if (lastCell) {
        const c = $(`.cell[data-r="${lastCell.r}"][data-c="${lastCell.c}"]`, sheet);
        if (c) c.focus();
      }
    }

    function setCell(r, c, code) {
      const d = Turni.data(), emp = d.employees[r], day = days()[c];
      if (!emp || !day) return;
      const k = ymd(day) + '|' + emp.id;
      code = code.trim().toUpperCase();
      if (code) d.grid[k] = code; else delete d.grid[k];
      Turni.save(d);
    }
    function move(r, c) {
      const n = $(`.cell[data-r="${r}"][data-c="${c}"]`, sheet);
      if (n) n.focus();
    }

    sheet.addEventListener('focusin', e => {
      if (!e.target.matches('.cell')) return;
      lastCell = { r: +e.target.dataset.r, c: +e.target.dataset.c };
      e.target.select();
    });
    sheet.addEventListener('input', e => {
      if (!e.target.matches('.cell')) return;
      e.target.value = e.target.value.toUpperCase();
      setCell(+e.target.dataset.r, +e.target.dataset.c, e.target.value);
      const t = Turni.type(Turni.data(), e.target.value);
      e.target.style.background = t ? t.color : '';
      e.target.classList.toggle('bad', !!e.target.value && !t);
      // se il codice è valido e univoco, passa alla cella successiva
      if (t && !Turni.data().types.some(x => x.code !== t.code && x.code.startsWith(t.code))) {
        lastCell = { r: lastCell.r, c: lastCell.c + 1 };
        paint();
      }
    });
    sheet.addEventListener('change', e => { if (e.target.matches('.cell')) paint(); });
    sheet.addEventListener('keydown', e => {
      if (!e.target.matches('.cell')) return;
      const r = +e.target.dataset.r, c = +e.target.dataset.c;
      const k = { ArrowUp: [-1, 0], ArrowDown: [1, 0], Enter: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (k) { e.preventDefault(); move(r + k[0], c + k[1]); }
      if (e.key === 'Delete' || e.key === 'Backspace') { setCell(r, c, ''); }
    });
    sheet.addEventListener('dblclick', e => {
      const n = e.target.closest('.emp-name');
      if (!n) return;
      const name = prompt('Nome del dipendente:', n.textContent);
      if (!name || !name.trim()) return;
      const d = Turni.data();
      d.employees.find(x => x.id === n.dataset.id).name = name.trim();
      Turni.save(d);
      paint();
    });
    sheet.addEventListener('click', e => {
      const b = e.target.closest('.del-emp');
      if (!b) return;
      const d = Turni.data(), emp = d.employees.find(x => x.id === b.dataset.id);
      if (!confirm(`Rimuovere ${emp.name} e tutti i suoi turni?`)) return;
      d.employees = d.employees.filter(x => x.id !== emp.id);
      Object.keys(d.grid).forEach(k => { if (k.endsWith('|' + emp.id)) delete d.grid[k]; });
      Turni.save(d);
      lastCell = null;
      paint();
    });

    // Legenda: tocca un turno per riempire la cella selezionata
    $('#tLegend', view).addEventListener('mousedown', e => {
      const b = e.target.closest('.leg');
      if (b) e.preventDefault();
    });
    $('#tLegend', view).addEventListener('click', e => {
      if (e.target.id === 'tTypes') return editTypes();
      const b = e.target.closest('.leg');
      if (!b) return;
      if (!lastCell) return toast('Seleziona prima una cella');
      setCell(lastCell.r, lastCell.c, b.dataset.code);
      if (lastCell.c < days().length - 1) lastCell = { r: lastCell.r, c: lastCell.c + 1 };
      paint();
    });

    $('#tMode', view).onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      mode = b.dataset.m;
      Store.set('turniMode', mode);
      lastCell = null;
      paint();
    };
    const shift = dir => {
      anchor = mode === 'week' ? addDays(anchor, 7 * dir) : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
      lastCell = null;
      paint();
    };
    $('#tPrev', view).onclick = () => shift(-1);
    $('#tNext', view).onclick = () => shift(1);
    $('#tToday', view).onclick = () => { anchor = new Date(); paint(); };
    $('#tAdd', view).onclick = () => {
      const name = prompt('Nome del dipendente:');
      if (!name || !name.trim()) return;
      const d = Turni.data();
      d.employees.push({ id: uid(), name: name.trim() });
      Turni.save(d);
      paint();
    };
    $('#tCopy', view).onclick = () => {
      const d = Turni.data(), ds = days();
      if (!confirm('Copiare qui i turni della settimana precedente? Le celle attuali verranno sovrascritte.')) return;
      ds.forEach(x => d.employees.forEach(emp => {
        const src = d.grid[ymd(addDays(x, -7)) + '|' + emp.id], k = ymd(x) + '|' + emp.id;
        if (src) d.grid[k] = src; else delete d.grid[k];
      }));
      Turni.save(d);
      paint();
    };

    // Esportazione
    function matrix() {
      const d = Turni.data(), ds = days();
      const head = ['Dipendente', ...ds.map(x => `${GIORNI_BREVI[(x.getDay() + 6) % 7]} ${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`), 'Ore'];
      const rows = d.employees.map(emp => {
        let tot = 0;
        const codes = ds.map(x => { const c = d.grid[ymd(x) + '|' + emp.id] || ''; tot += Turni.hours(Turni.type(d, c)); return c; });
        return [emp.name, ...codes, fmtH(tot)];
      });
      return { d, head, rows };
    }
    $('#tCsv', view).onclick = () => {
      const { head, rows } = matrix();
      const q = v => /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      const csv = '﻿' + [head, ...rows].map(r => r.map(q).join(';')).join('\r\n');
      download(`turni-${ymd(days()[0])}.csv`, csv, 'text/csv;charset=utf-8');
    };
    $('#tXls', view).onclick = () => {
      const { d, head, rows } = matrix();
      const cell = v => { const t = Turni.type(d, v); return `<td style="text-align:center;${t ? `background:${t.color}` : ''}">${esc(v)}</td>`; };
      const legend = d.types.map(t => `<tr><td style="background:${t.color}"><b>${esc(t.code)}</b></td><td>${esc(Turni.label(t))}</td></tr>`).join('');
      const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
        <table border="1"><tr>${head.map(h => `<th style="background:#f1f1ef">${esc(h)}</th>`).join('')}</tr>
        ${rows.map(r => `<tr><td><b>${esc(r[0])}</b></td>${r.slice(1, -1).map(cell).join('')}<td><b>${r[r.length - 1]}</b></td></tr>`).join('')}</table>
        <br><table border="1"><tr><th colspan="2">Legenda</th></tr>${legend}</table></body></html>`;
      download(`turni-${ymd(days()[0])}.xls`, '﻿' + html, 'application/vnd.ms-excel');
    };
    $('#tImp', view).onclick = async () => {
      const f = await pickFile('.csv,text/csv');
      if (!f) return;
      const lines = (await f.text()).replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
      const sep = lines[0].includes(';') ? ';' : ',';
      const split = l => l.split(sep).map(v => v.replace(/^"|"$/g, '').trim());
      const dates = split(lines[0]).map(h => { const m = h.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) || h.match(/(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; return m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${pad(m[2])}-${pad(m[1])}`; });
      const d = Turni.data();
      let n = 0;
      lines.slice(1).forEach(l => {
        const v = split(l);
        if (!v[0]) return;
        let emp = d.employees.find(e => e.name.toLowerCase() === v[0].toLowerCase());
        if (!emp) { emp = { id: uid(), name: v[0] }; d.employees.push(emp); }
        dates.forEach((dt, i) => { if (dt && v[i]) { d.grid[dt + '|' + emp.id] = v[i].toUpperCase(); n++; } });
      });
      Turni.save(d);
      toast(`Importati ${n} turni`);
      paint();
    };
    $('#tPrint', view).onclick = () => window.print();

    function editTypes() {
      const d = Turni.data();
      const rowHtml = t => `<div class="type-row">
        <input class="t-code" value="${esc(t.code)}" maxlength="3" placeholder="Cod." aria-label="Codice">
        <input class="t-label" value="${esc(t.label)}" placeholder="Nome" aria-label="Nome">
        <input class="t-start" type="time" value="${t.start}" aria-label="Inizio">
        <input class="t-end" type="time" value="${t.end}" aria-label="Fine">
        <input class="t-color" type="color" value="${t.color}" aria-label="Colore">
        <button class="icon-btn sm t-del" title="Elimina">×</button></div>`;
      const m = openModal(`
        <h3>Tipi di turno</h3>
        <p class="muted small">Lascia vuoti gli orari per riposo, ferie, malattia (0 ore).</p>
        <div id="typeRows">${d.types.map(rowHtml).join('')}</div>
        <button class="btn ghost" id="typeAdd">+ Aggiungi turno</button>
        <div class="modal-actions"><button class="btn" id="typeCancel">Annulla</button><button class="btn primary" id="typeSave">Salva</button></div>`);
      const rows = $('#typeRows', m.el);
      $('#typeAdd', m.el).onclick = () => rows.appendChild(el(rowHtml({ code: '', label: '', start: '', end: '', color: '#fef3c7' })));
      rows.onclick = e => { if (e.target.closest('.t-del')) e.target.closest('.type-row').remove(); };
      $('#typeCancel', m.el).onclick = m.close;
      $('#typeSave', m.el).onclick = () => {
        const types = $$('.type-row', rows).map(r => ({
          code: $('.t-code', r).value.trim().toUpperCase(), label: $('.t-label', r).value.trim(),
          start: $('.t-start', r).value, end: $('.t-end', r).value, color: $('.t-color', r).value
        })).filter(t => t.code);
        if (new Set(types.map(t => t.code)).size !== types.length) return toast('Ogni codice deve essere diverso');
        const dd = Turni.data();
        dd.types = types;
        Turni.save(dd);
        m.close();
        paint();
      };
    }

    paint();
  }
};
