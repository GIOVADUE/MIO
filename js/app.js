/* Avvio e navigazione */
function currentRoute() {
  const [name, param] = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
  return { name: Views[name] ? name : 'dashboard', param: param ? decodeURIComponent(param) : '' };
}

function markActiveNav() {
  const { name, param } = currentRoute();
  $$('.sidebar a').forEach(a => {
    a.classList.toggle('active', a.dataset.view === name || (name === 'pagina' && a.dataset.page === param));
  });
}

function route() {
  const { name, param } = currentRoute();
  const view = $('#view');
  view.innerHTML = '';
  $('#main').scrollTop = 0;
  try {
    Views[name].render(view, param);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="view"><div class="empty">Qualcosa è andato storto: ${esc(e.message)}</div></div>`;
  }
  const title = name === 'pagina' ? (Pages.get(param)?.title || 'Senza titolo') : Views[name].title;
  document.title = `${title} · MIO`;
  $('#topTitle').textContent = title;
  markActiveNav();
  document.body.classList.remove('nav-open');
}

window.addEventListener('hashchange', route);
$('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
$('#scrim').onclick = () => document.body.classList.remove('nav-open');
$('#newPageBtn').onclick = () => Pages.create();

applyTheme();
renderPagesNav();
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
