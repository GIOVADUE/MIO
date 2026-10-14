/* Modelli pronti per le nuove pagine */
const TEMPLATES = [
  {
    icon: '📔', name: 'Diario', title: d => `Diario · ${fullDate(d)}`,
    html: () => `
<h2>Come mi sento</h2><p><br></p>
<h2>Cosa è successo oggi</h2><p><br></p>
<h2>3 cose per cui sono grato</h2><ol><li><br></li><li><br></li><li><br></li></ol>
<h2>Domani voglio…</h2><div class="todo"><input type="checkbox"><span><br></span></div>`
  },
  {
    icon: '🤝', name: 'Riunione', title: d => `Riunione · ${d.getDate()} ${MESI[d.getMonth()].toLowerCase()}`,
    html: d => `
<p><b>Data:</b> ${fullDate(d)}<br><b>Partecipanti:</b> </p>
<h2>Ordine del giorno</h2><ul><li><br></li></ul>
<h2>Appunti</h2><p><br></p>
<h2>Decisioni</h2><ul><li><br></li></ul>
<h2>Cose da fare</h2>
<div class="todo"><input type="checkbox"><span>Chi — cosa — entro quando</span></div>`
  },
  {
    icon: '🛒', name: 'Lista della spesa', title: () => 'Lista della spesa',
    html: () => `
<h3>Frutta e verdura</h3><div class="todo"><input type="checkbox"><span><br></span></div>
<h3>Frigo</h3><div class="todo"><input type="checkbox"><span><br></span></div>
<h3>Dispensa</h3><div class="todo"><input type="checkbox"><span><br></span></div>
<h3>Casa e igiene</h3><div class="todo"><input type="checkbox"><span><br></span></div>`
  },
  {
    icon: '🚀', name: 'Progetto', title: () => 'Nuovo progetto',
    html: () => `
<blockquote>Obiettivo: cosa voglio ottenere e perché.</blockquote>
<h2>Scadenze</h2><ul><li><b>Inizio:</b> </li><li><b>Fine:</b> </li></ul>
<h2>Da fare</h2><div class="todo"><input type="checkbox"><span><br></span></div>
<h2>In corso</h2><div class="todo"><input type="checkbox"><span><br></span></div>
<h2>Fatto</h2><div class="todo"><input type="checkbox" checked><span>Creare la pagina del progetto</span></div>
<h2>Note e link</h2><p><br></p>`
  },
  {
    icon: '✈️', name: 'Viaggio', title: () => 'Viaggio a …',
    html: () => `
<p><b>Date:</b> <br><b>Alloggio:</b> <br><b>Budget:</b> </p>
<h2>Da mettere in valigia</h2>
<div class="todo"><input type="checkbox"><span>Documenti</span></div>
<div class="todo"><input type="checkbox"><span>Caricabatterie</span></div>
<div class="todo"><input type="checkbox"><span>Medicine</span></div>
<h2>Programma</h2><h3>Giorno 1</h3><ul><li><br></li></ul><h3>Giorno 2</h3><ul><li><br></li></ul>
<h2>Posti da vedere</h2><ul><li><br></li></ul>`
  },
  {
    icon: '🍝', name: 'Ricetta', title: () => 'Nuova ricetta',
    html: () => `
<p><b>Persone:</b> · <b>Tempo:</b> · <b>Difficoltà:</b> </p>
<h2>Ingredienti</h2><div class="todo"><input type="checkbox"><span><br></span></div>
<h2>Preparazione</h2><ol><li><br></li></ol>
<h2>Consigli</h2><p><br></p>`
  }
];
