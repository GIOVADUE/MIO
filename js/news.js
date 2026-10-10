/* Google News tramite i feed RSS pubblici */
const News = {
  topics: [
    ['top', 'In primo piano'], ['NATION', 'Italia'], ['WORLD', 'Mondo'], ['BUSINESS', 'Economia'],
    ['TECHNOLOGY', 'Tecnologia'], ['SCIENCE', 'Scienza'], ['HEALTH', 'Salute'],
    ['SPORTS', 'Sport'], ['ENTERTAINMENT', 'Spettacolo']
  ],
  cache: {},

  url(topic, q) {
    const loc = 'hl=it&gl=IT&ceid=IT:it';
    if (q) return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${loc}`;
    if (topic === 'top') return `https://news.google.com/rss?${loc}`;
    return `https://news.google.com/rss/headlines/section/topic/${topic}?${loc}`;
  },

  parseXml(text) {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    return $$('item', doc).map(it => {
      const source = it.querySelector('source')?.textContent || '';
      let title = it.querySelector('title')?.textContent || '';
      if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
      return { title, source, link: it.querySelector('link')?.textContent || '', date: new Date(it.querySelector('pubDate')?.textContent) };
    });
  },

  // Google News non permette richieste dirette dal browser (CORS): proviamo alcuni proxy pubblici.
  async fetch(topic, q) {
    const url = this.url(topic, q);
    const c = this.cache[url];
    if (c && Date.now() - c.t < 10 * 60 * 1000) return c.items;
    const getText = async u => { const r = await fetch(u, { signal: AbortSignal.timeout(9000) }); if (!r.ok) throw new Error(r.status); return r.text(); };
    const attempts = [
      async () => this.parseXml(await getText('https://api.allorigins.win/raw?url=' + encodeURIComponent(url))),
      async () => this.parseXml(JSON.parse(await getText('https://api.allorigins.win/get?url=' + encodeURIComponent(url))).contents),
      async () => this.parseXml(await getText('https://corsproxy.io/?url=' + encodeURIComponent(url))),
      async () => this.parseXml(await getText('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url))),
      async () => {
        const j = JSON.parse(await getText('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url)));
        if (j.status !== 'ok') throw new Error('rss2json');
        return j.items.map(i => {
          const parts = i.title.split(' - ');
          const source = parts.length > 1 ? parts.pop() : '';
          return { title: parts.join(' - '), source, link: i.link, date: new Date(i.pubDate.replace(' ', 'T') + 'Z') };
        });
      }
    ];
    for (const a of attempts) {
      try {
        const items = await a();
        if (items.length) { this.cache[url] = { t: Date.now(), items }; return items; }
      } catch { /* prova il successivo */ }
    }
    throw new Error('Impossibile caricare le notizie in questo momento.');
  },

  card(n, big) {
    return `
      <article class="news-card ${big ? 'big' : ''}">
        <div class="news-meta"><span class="news-src">${esc(n.source)}</span><span>${esc(timeAgo(n.date))}</span></div>
        <a class="news-title" href="${esc(n.link)}" target="_blank" rel="noopener">${esc(n.title)}</a>
        <button class="icon-btn sm save-news" title="Salva nelle note" aria-label="Salva nelle note">🔖</button>
      </article>`;
  }
};

Views.notizie = {
  title: 'Notizie',
  render(view) {
    let topic = Settings.get().newsTopic;
    let query = '';
    let items = [];
    view.innerHTML = `
      <div class="view">
        <div class="view-head">
          <h1>📰 Notizie</h1>
          <form id="nSearch" class="search"><input type="search" placeholder="Cerca su Google News…" aria-label="Cerca notizie"></form>
          <a class="btn ghost" href="https://news.google.com/?hl=it&gl=IT&ceid=IT:it" target="_blank" rel="noopener">Apri Google News ↗</a>
        </div>
        <div class="chips" id="nTopics">
          ${News.topics.map(([k, l]) => `<button class="chip" data-t="${k}">${l}</button>`).join('')}
        </div>
        <div id="nList" class="news-grid"></div>
      </div>`;

    const list = $('#nList', view);
    const paintTopics = () => $$('#nTopics .chip', view).forEach(c => c.classList.toggle('on', !query && c.dataset.t === topic));

    async function load() {
      paintTopics();
      list.innerHTML = '<div class="loading">Caricamento notizie…</div>';
      try {
        items = await News.fetch(topic, query);
        if (!view.isConnected) return;
        list.innerHTML = items.slice(0, 40).map((n, i) => News.card(n, i === 0)).join('');
      } catch (e) {
        list.innerHTML = `<div class="empty">${esc(e.message)}<br><button class="btn" id="nRetry">Riprova</button></div>`;
        $('#nRetry', list).onclick = load;
      }
    }

    $('#nTopics', view).onclick = e => {
      const c = e.target.closest('.chip');
      if (!c) return;
      topic = c.dataset.t;
      query = '';
      $('#nSearch input', view).value = '';
      Settings.set({ newsTopic: topic });
      load();
    };
    $('#nSearch', view).onsubmit = e => {
      e.preventDefault();
      query = $('input', e.target).value.trim();
      load();
    };
    list.onclick = e => {
      const b = e.target.closest('.save-news');
      if (!b) return;
      const idx = [...list.children].indexOf(b.closest('.news-card'));
      const n = items[idx];
      Notes.add({ title: n.title, text: `${n.source}\n${n.link}`, color: 'blue' });
      toast('Salvata nelle note');
    };
    load();
  }
};
