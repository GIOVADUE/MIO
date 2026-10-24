# MIO — il tuo spazio personale

Un'app in stile Notion, più semplice, che riunisce in un unico posto:

| Sezione | Cosa fa |
|---|---|
| 🏠 **Dashboard** | Riepilogo del giorno: **meteo** a 5 giorni, eventi, turni, email non lette, notizie, note fissate, pagine recenti |
| 📄 **Pagine** | Editor stile Notion: titoli, elenchi, caselle ☑, citazioni, codice, link, icona emoji, **immagini** (pulsante 🖼️, incolla o trascina) e **modelli** pronti (Diario, Riunione, Lista della spesa, Progetto, Viaggio, Ricetta) |
| 📰 **Notizie** | Google News in italiano, per argomento o con ricerca; 🔖 salva un articolo nelle note |
| ✉️ **Gmail** | Posta in arrivo, da leggere, speciali e importanti; ricerca; pulsante "Scrivi" (sola lettura) |
| 📊 **Turni di lavoro** | Tabella stile Excel: settimana o mese, colori, ore totali, copertura, esporta in Excel/CSV, importa CSV, stampa, **grafico delle ore lavorate** per persona, **ripeti schema** su più settimane (anche a rotazione) |
| 💡 **Note** | Stile Google Keep: colori, note fissate, elenchi con caselle, ricerca |
| 📅 **Calendario** | Stile iPhone: vista mensile, pallini sui giorni con eventi, eventi ricorrenti (giorno/settimana/mese/anno), promemoria 🔔, eventi di Google Calendar, **vista elenco** dei prossimi eventi, scorrimento per cambiare mese, i tuoi turni già inseriti |
| ⏱️ **Tempo** | Organizza lavoro e vita personale: **blocchi orari** sulla giornata (accanto a eventi e turni), **matrice delle priorità** (Fai subito / Pianifica / Delega / Elimina) con trascinamento, **timer di concentrazione** 25 o 50 minuti con pausa, **bilancio della settimana** con ore di lavoro e personali per area rispetto ai tuoi obiettivi |
| 🔄 **Sincronizzazione** | Stessi dati su iPhone e computer tramite una cartella privata dell'app su Google Drive |
| 🔍 **Cerca** | Ricerca globale con `Ctrl+K` (`⌘K` su Mac) su pagine, note, eventi e turni |

Non servono installazioni, server o account: è fatta solo di HTML, CSS e JavaScript.
I dati vengono salvati **nel browser** del dispositivo che usi. Da *Impostazioni → Backup* puoi esportarli e importarli.

---

## ▶️ Provarla subito sul computer

1. Scarica il progetto (su GitHub: **Code → Download ZIP**) ed estrailo.
2. Fai doppio clic su `index.html`.

Tutto funziona tranne Gmail, perché Google richiede un indirizzo `https://`. Per Gmail pubblica l'app come spiegato qui sotto.

---

## 📦 Come inserire l'app in una repository GitHub

### Metodo A: dal sito, senza programmi

1. Vai su <https://github.com/new>, scegli un nome (es. `MIO`) e premi **Create repository**.
2. Nella pagina della repository clicca **uploading an existing file** (oppure **Add file → Upload files**).
3. Trascina **tutto il contenuto** della cartella del progetto: `index.html`, `manifest.json`, `sw.js` e le cartelle `css`, `js`, `icons`.
4. Premi **Commit changes**.

### Metodo B: dal terminale, con git

```bash
cd percorso/della/cartella/MIO
git init
git add .
git commit -m "Prima versione di MIO"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/MIO.git
git push -u origin main
```

Per inviare le modifiche successive:

```bash
git add .
git commit -m "Descrizione della modifica"
git push
```

### Pubblicarla online gratis (GitHub Pages)

1. Nella repository vai su **Settings → Pages**.
2. In **Build and deployment**, alla voce *Source* scegli **Deploy from a branch**.
3. Seleziona il branch (`main` o `master`) e la cartella **/ (root)**, poi premi **Save**.
4. Dopo circa un minuto l'app sarà online su `https://TUO-UTENTE.github.io/MIO/`.

> Su un account gratuito GitHub Pages funziona solo con repository **pubbliche**. I tuoi dati restano comunque privati, perché sono salvati nel browser e non nella repository.

### Installarla sull'iPhone come un'app

Apri l'indirizzo GitHub Pages con **Safari**, tocca **Condividi → Aggiungi alla schermata Home**.

---

## ✉️ Collegare l'account Google (Gmail, Calendar, sincronizzazione)

1. Apri [Google Cloud Console](https://console.cloud.google.com/projectcreate) e crea un progetto.
2. Attiva queste tre API: [Gmail](https://console.cloud.google.com/apis/library/gmail.googleapis.com), [Google Calendar](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) e [Google Drive](https://console.cloud.google.com/apis/library/drive.googleapis.com).
3. In **Schermata consenso OAuth** scegli *Esterno*, compila i campi richiesti e aggiungi la tua email tra gli **utenti di test**.
4. In **Credenziali → Crea credenziali → ID client OAuth** scegli *Applicazione web*.
   In **Origini JavaScript autorizzate** inserisci `https://TUO-UTENTE.github.io`.
5. Copia l'**ID client** e incollalo in **MIO → Impostazioni → Account Google**.
6. Premi **Accedi con Google**.

Gmail e Calendar sono in **sola lettura**. Drive viene usato solo per una cartella privata e nascosta dell'app (`appDataFolder`): MIO non può vedere gli altri tuoi file.
Tutto avviene direttamente tra il tuo browser e Google. L'accesso dura circa un'ora: poi basta premere di nuovo "Accedi".

### Stessi dati su iPhone e computer

1. Su entrambi i dispositivi apri MIO dall'indirizzo GitHub Pages, inserisci lo **stesso Client ID** e accedi con lo **stesso account Google**.
2. Lascia attiva l'opzione *Sincronizza automaticamente* (Impostazioni → Account Google).
3. Ogni modifica viene salvata su Drive dopo pochi secondi. All'apertura MIO scarica le modifiche fatte sull'altro dispositivo.
   Se hai modificato qualcosa su entrambi senza essere collegato, MIO ti chiede quale versione tenere.

## 🔔 Promemoria

Quando crei un evento scegli **Avviso** (all'ora dell'evento, 5/15/30 minuti prima, 1 ora, 1 giorno…). Il browser chiederà il permesso per le notifiche.
I promemoria suonano **solo mentre MIO è aperta** (anche in una scheda in secondo piano), perché l'app non ha un server che invii notifiche.
Sull'iPhone le notifiche funzionano solo se MIO è aggiunta alla schermata Home; altrimenti l'avviso compare dentro l'app.

---

## 📊 Turni: suggerimenti

- Scrivi il codice in una cella (`M`, `P`, `N`, `G`, `R`, `F`…), oppure seleziona una cella e tocca un turno nella legenda.
- Con **Modifica turni** cambi codici, nomi, orari e colori. Se lasci vuoti gli orari, il turno vale 0 ore (riposo, ferie).
- **⬇️ Excel** scarica un file `.xls` con i colori. **⬇️ CSV** scarica un file che Excel e Google Fogli aprono direttamente.
- In *Impostazioni → Io nei turni* scegli il tuo nome: i tuoi turni compariranno in Dashboard e Calendario.

## 📰 Notizie: nota tecnica

Google News non consente ai siti di leggere i suoi feed direttamente dal browser. MIO usa quindi alcuni servizi pubblici gratuiti come intermediari (allorigins, corsproxy, codetabs) e passa al successivo se uno non risponde. Se nessuno funziona, il pulsante **Apri Google News ↗** porta comunque al sito.

## Struttura dei file

```
index.html        pagina principale
css/style.css     stile (chiaro/scuro automatico)
js/util.js        funzioni comuni e salvataggio
js/app.js         navigazione
js/dashboard.js   dashboard
js/pages.js       pagine stile Notion (con immagini)
js/templates.js   modelli di pagina
js/news.js        Google News
js/gmail.js       Gmail
js/turni.js       tabella turni
js/notes.js       note stile Keep
js/calendar.js    calendario stile iPhone
js/settings.js    impostazioni e backup
js/search.js      ricerca globale (Ctrl+K)
js/weather.js     meteo (Open-Meteo)
js/sync.js        sincronizzazione con Google Drive e lettura di Google Calendar
js/reminders.js   promemoria degli eventi
manifest.json, sw.js, icons/   installazione come app e uso offline
```

## 🖼️ Immagini nelle pagine

Le immagini vengono ridotte automaticamente (massimo 1200 pixel) e salvate insieme alla pagina. Il browser ha però poco spazio (circa 5 MB in tutto): conviene inserire poche immagini per pagina. Se lo spazio finisce, MIO lo segnala. Per i file pesanti (PDF, documenti) è meglio incollare un link 🔗 a Google Drive.
