/* Promemoria per gli eventi: avvisano finché MIO è aperta (in una scheda o come app) */
const Reminders = {
  options: [['', 'Nessuno'], [0, "All'ora dell'evento"], [5, '5 minuti prima'], [15, '15 minuti prima'], [30, '30 minuti prima'],
    [60, '1 ora prima'], [120, '2 ore prima'], [1440, '1 giorno prima']],

  askPermission() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    Notification.requestPermission().then(p => {
      if (p === 'denied') toast('Notifiche bloccate: vedrai i promemoria solo dentro MIO');
    });
  },

  // momento in cui suonare l'avviso per un evento in un certo giorno
  fireAt(e, key) {
    const [h, m] = (e.allDay ? '09:00' : (e.start || '09:00')).split(':').map(Number);
    const d = parseYmd(key);
    d.setHours(h, m, 0, 0);
    return d.getTime() - Number(e.alert) * 60000;
  },

  check() {
    const now = Date.now();
    const fired = Store.get('firedAlerts', {});
    let changed = false;
    // eventi di oggi e dei prossimi 2 giorni (per gli avvisi "1 giorno prima")
    for (let i = 0; i <= 2; i++) {
      const key = ymd(addDays(new Date(), i));
      Calendar.forDate(key).filter(e => e.alert !== undefined && e.alert !== '').forEach(e => {
        const at = this.fireAt(e, key), id = e.id + '|' + key + '|' + e.alert;
        if (fired[id] || now < at || now - at > 15 * 60000) return;
        fired[id] = now;
        changed = true;
        this.notify(e, key);
      });
    }
    if (changed) {
      // tiene solo gli avvisi degli ultimi 3 giorni
      Object.keys(fired).forEach(k => { if (now - fired[k] > 3 * 86400000) delete fired[k]; });
      Store.set('firedAlerts', fired);
    }
  },

  notify(e, key) {
    const when = key === ymd(new Date()) ? 'Oggi' : fullDate(parseYmd(key));
    const body = `${when} · ${Calendar.timeLabel(e)}${e.place ? ' · ' + e.place : ''}`;
    toast(`🔔 ${e.title} — ${body}`);
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body, icon: 'icons/icon-192.png', tag: e.id + key };
    const fallback = () => { try { new Notification(e.title, opts); } catch { /* niente */ } };
    if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then(r => r.showNotification(e.title, opts)).catch(fallback);
    else fallback();
  }
};

setInterval(() => Reminders.check(), 30000);
setTimeout(() => Reminders.check(), 2000);
