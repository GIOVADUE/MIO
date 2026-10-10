/* Impostazioni dell'app */
const Settings = {
  defaults: { name: '', theme: 'auto', gmailClientId: '', myEmployee: '', newsTopic: 'top' },
  get() { return { ...this.defaults, ...Store.get('settings', {}) }; },
  set(patch) { Store.set('settings', { ...this.get(), ...patch }); applyTheme(); },
};

function applyTheme() {
  const t = Settings.get().theme;
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const n = Settings.get().name;
  const ws = $('#wsName');
  if (ws) ws.textContent = n ? `MIO di ${n}` : 'MIO';
}

Views.impostazioni = {
  title: 'Impostazioni',
  render(view) {
    const s = Settings.get();
    const emps = Turni.data().employees;
    view.innerHTML = `
      <div class="view narrow">
        <div class="view-head"><h1>⚙️ Impostazioni</h1></div>

        <section class="card form">
          <h3>Generale</h3>
          <label class="field"><span>Il tuo nome</span>
            <input id="sName" value="${esc(s.name)}" placeholder="Es. Giovanni"></label>
          <label class="field"><span>Tema</span>
            <select id="sTheme">
              <option value="auto">Automatico (come il sistema)</option>
              <option value="light">Chiaro</option>
              <option value="dark">Scuro</option>
            </select></label>
          <label class="field"><span>Io nei turni (per vedere i tuoi turni in Dashboard e Calendario)</span>
            <select id="sEmp"><option value="">— nessuno —</option>
              ${emps.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}
            </select></label>
        </section>

        <section class="card form">
          <h3>Gmail</h3>
          <label class="field"><span>Google OAuth Client ID</span>
            <input id="sCid" value="${esc(s.gmailClientId)}" placeholder="123456-abc.apps.googleusercontent.com" spellcheck="false"></label>
          <p class="muted small">Serve per leggere la tua posta. Le istruzioni sono nella sezione <a href="#/gmail">Gmail</a>.
          Il Client ID non è un segreto: resta solo nel tuo browser.</p>
        </section>

        <section class="card form">
          <h3>Backup</h3>
          <p class="muted small">I dati sono salvati nel browser di questo dispositivo. Esporta un backup per spostarli altrove.</p>
          <div class="row gap">
            <button class="btn" id="bExport">⬇️ Esporta backup</button>
            <button class="btn" id="bImport">⬆️ Importa backup</button>
            <button class="btn danger" id="bReset">Cancella tutto</button>
          </div>
        </section>
      </div>`;

    $('#sTheme', view).value = s.theme;
    $('#sEmp', view).value = s.myEmployee;
    $('#sName', view).addEventListener('input', e => Settings.set({ name: e.target.value.trim() }));
    $('#sTheme', view).addEventListener('change', e => Settings.set({ theme: e.target.value }));
    $('#sEmp', view).addEventListener('change', e => Settings.set({ myEmployee: e.target.value }));
    $('#sCid', view).addEventListener('change', e => { Settings.set({ gmailClientId: e.target.value.trim() }); toast('Client ID salvato'); });

    $('#bExport', view).onclick = () => {
      const data = {};
      Store.keys().forEach(k => { data[k] = localStorage.getItem(k); });
      download(`mio-backup-${ymd(new Date())}.json`, JSON.stringify(data, null, 1), 'application/json');
    };
    $('#bImport', view).onclick = async () => {
      const f = await pickFile('.json,application/json');
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        Object.entries(data).forEach(([k, v]) => { if (k.startsWith('mio.')) localStorage.setItem(k, v); });
        toast('Backup importato');
        setTimeout(() => location.reload(), 600);
      } catch { toast('File di backup non valido'); }
    };
    $('#bReset', view).onclick = () => {
      if (!confirm('Cancellare tutti i dati di MIO su questo dispositivo?')) return;
      Store.keys().forEach(k => localStorage.removeItem(k));
      location.hash = '#/dashboard';
      location.reload();
    };
  }
};
