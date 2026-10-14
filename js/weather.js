/* Meteo con Open-Meteo (gratuito, senza account) */
const Weather = {
  codes: {
    0: ['☀️', 'Sereno'], 1: ['🌤️', 'Poco nuvoloso'], 2: ['⛅', 'Parzialmente nuvoloso'], 3: ['☁️', 'Coperto'],
    45: ['🌫️', 'Nebbia'], 48: ['🌫️', 'Nebbia con brina'],
    51: ['🌦️', 'Pioviggine leggera'], 53: ['🌦️', 'Pioviggine'], 55: ['🌧️', 'Pioviggine intensa'],
    56: ['🌧️', 'Pioviggine gelata'], 57: ['🌧️', 'Pioviggine gelata'],
    61: ['🌦️', 'Pioggia leggera'], 63: ['🌧️', 'Pioggia'], 65: ['🌧️', 'Pioggia forte'],
    66: ['🌧️', 'Pioggia gelata'], 67: ['🌧️', 'Pioggia gelata'],
    71: ['🌨️', 'Neve leggera'], 73: ['🌨️', 'Neve'], 75: ['❄️', 'Neve forte'], 77: ['🌨️', 'Nevischio'],
    80: ['🌦️', 'Rovesci leggeri'], 81: ['🌧️', 'Rovesci'], 82: ['⛈️', 'Rovesci violenti'],
    85: ['🌨️', 'Rovesci di neve'], 86: ['❄️', 'Rovesci di neve forti'],
    95: ['⛈️', 'Temporale'], 96: ['⛈️', 'Temporale con grandine'], 99: ['⛈️', 'Temporale con grandine']
  },
  cache: null,

  place() { return Store.get('weatherPlace', null); }, // { name, lat, lon }
  setPlace(p) { Store.set('weatherPlace', p); this.cache = null; },

  async search(name) {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=it`);
    if (!r.ok) throw new Error('Ricerca città non riuscita');
    return ((await r.json()).results || []).map(c => ({ name: c.name, region: [c.admin1, c.country].filter(Boolean).join(', '), lat: c.latitude, lon: c.longitude }));
  },

  locate() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error('Posizione non disponibile su questo dispositivo'));
      navigator.geolocation.getCurrentPosition(
        p => res({ name: 'La mia posizione', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
        () => rej(new Error('Permesso di posizione negato')), { timeout: 10000 });
    });
  },

  async forecast() {
    const p = this.place();
    if (!p) return null;
    if (this.cache && this.cache.key === p.lat + ',' + p.lon && Date.now() - this.cache.t < 20 * 60000) return this.cache.data;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&timezone=auto&forecast_days=5` +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max';
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error('Meteo non disponibile');
    const j = await r.json();
    const data = {
      now: { temp: j.current.temperature_2m, feels: j.current.apparent_temperature, code: j.current.weather_code, wind: j.current.wind_speed_10m },
      days: j.daily.time.map((t, i) => ({ date: parseYmd(t), code: j.daily.weather_code[i], max: j.daily.temperature_2m_max[i], min: j.daily.temperature_2m_min[i], rain: j.daily.precipitation_probability_max[i] }))
    };
    this.cache = { key: p.lat + ',' + p.lon, t: Date.now(), data };
    return data;
  },

  icon(c) { return (this.codes[c] || ['🌡️', ''])[0]; },
  label(c) { return (this.codes[c] || ['', '—'])[1]; },

  // contenuto del riquadro in dashboard
  async widget(box, rerender) {
    const p = this.place();
    if (!p) {
      box.innerHTML = `<p class="muted">Scegli una città per vedere le previsioni.</p>
        <div class="row gap wrap"><button class="btn" data-w="city">Scegli città</button><button class="btn ghost" data-w="gps">📍 Usa la mia posizione</button></div>`;
    } else {
      box.innerHTML = '<div class="loading">Caricamento meteo…</div>';
      try {
        const w = await this.forecast();
        const r = n => Math.round(n);
        box.innerHTML = `
          <div class="wx-now">
            <span class="wx-big">${this.icon(w.now.code)}</span>
            <div><div class="wx-temp">${r(w.now.temp)}°</div><div class="muted small">${esc(this.label(w.now.code))} · percepita ${r(w.now.feels)}° · vento ${r(w.now.wind)} km/h</div></div>
          </div>
          <div class="wx-days">${w.days.map((d, i) => `<div class="wx-day">
            <span class="muted small">${i === 0 ? 'Oggi' : GIORNI_BREVI[(d.date.getDay() + 6) % 7]}</span>
            <span class="wx-ico" title="${esc(this.label(d.code))}">${this.icon(d.code)}</span>
            <span class="small"><b>${r(d.max)}°</b> <span class="muted">${r(d.min)}°</span></span>
            <span class="muted small">${d.rain != null ? '💧' + d.rain + '%' : ''}</span></div>`).join('')}</div>
          <button class="link-btn small" data-w="city">📍 ${esc(p.name)} · cambia</button>`;
      } catch (e) {
        box.innerHTML = `<p class="muted">${esc(e.message)}</p><button class="btn" data-w="retry">Riprova</button>`;
      }
    }
    box.onclick = async e => {
      const a = e.target.closest('[data-w]')?.dataset.w;
      if (a === 'retry') rerender();
      if (a === 'gps') {
        try { this.setPlace(await this.locate()); rerender(); } catch (err) { toast(err.message); }
      }
      if (a === 'city') this.pickCity(rerender);
    };
  },

  pickCity(done) {
    const m = openModal(`
      <h3>Scegli la città</h3>
      <form id="wxForm" class="search"><input type="search" id="wxQ" placeholder="Es. Milano" aria-label="Città"></form>
      <div id="wxRes" class="wx-res"></div>
      <div class="modal-actions"><button class="btn ghost" id="wxGps">📍 Usa la mia posizione</button><button class="btn" id="wxClose">Chiudi</button></div>`);
    const res = $('#wxRes', m.el);
    let found = [];
    $('#wxForm', m.el).onsubmit = async e => {
      e.preventDefault();
      const q = $('#wxQ', m.el).value.trim();
      if (!q) return;
      res.innerHTML = '<div class="loading">Ricerca…</div>';
      try {
        found = await this.search(q);
        res.innerHTML = found.length ? found.map((c, i) => `<button class="wx-city" data-i="${i}"><b>${esc(c.name)}</b> <span class="muted small">${esc(c.region)}</span></button>`).join('')
          : '<div class="empty">Nessuna città trovata</div>';
      } catch (err) { res.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
    };
    res.onclick = e => {
      const b = e.target.closest('.wx-city');
      if (!b) return;
      const c = found[b.dataset.i];
      this.setPlace({ name: c.name, lat: c.lat, lon: c.lon });
      m.close();
      done();
    };
    $('#wxGps', m.el).onclick = async () => {
      try { this.setPlace(await this.locate()); m.close(); done(); } catch (err) { toast(err.message); }
    };
    $('#wxClose', m.el).onclick = m.close;
    setTimeout(() => $('#wxQ', m.el).focus(), 30);
  }
};
