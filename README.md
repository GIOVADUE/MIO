# MIO — il tuo spazio personale

Un'app in stile Notion, più semplice, che riunisce in un unico posto:

| Sezione | Cosa fa |
|---|---|
| 🏠 **Dashboard** | Riepilogo del giorno: eventi, turni, email non lette, notizie, note fissate, pagine recenti |
| 📄 **Pagine** | Editor stile Notion: titoli, elenchi, caselle ☑, citazioni, codice, link, icona emoji |
| 📰 **Notizie** | Google News in italiano, per argomento o con ricerca; 🔖 salva un articolo nelle note |
| ✉️ **Gmail** | Posta in arrivo, da leggere, speciali e importanti; ricerca; pulsante "Scrivi" (sola lettura) |
| 📊 **Turni di lavoro** | Tabella stile Excel: settimana o mese, colori, ore totali, copertura, esporta in Excel/CSV, importa CSV, stampa |
| 💡 **Note** | Stile Google Keep: colori, note fissate, elenchi con caselle, ricerca |
| 📅 **Calendario** | Stile iPhone: vista mensile, pallini sui giorni con eventi, eventi ricorrenti (giorno/settimana/mese/anno), scorrimento per cambiare mese, i tuoi turni già inseriti |
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

## ✉️ Collegare Gmail

1. Apri [Google Cloud Console](https://console.cloud.google.com/projectcreate) e crea un progetto.
2. Attiva la [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com).
3. In **Schermata consenso OAuth** scegli *Esterno*, compila i campi richiesti e aggiungi la tua email tra gli **utenti di test**.
4. In **Credenziali → Crea credenziali → ID client OAuth** scegli *Applicazione web*.
   In **Origini JavaScript autorizzate** inserisci `https://TUO-UTENTE.github.io`.
5. Copia l'**ID client** e incollalo in **MIO → Impostazioni → Gmail**.
6. Vai nella sezione Gmail e premi **Accedi con Google**.

L'accesso è in sola lettura e avviene direttamente tra il tuo browser e Google. L'accesso dura circa un'ora: poi basta premere di nuovo "Accedi".

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
js/pages.js       pagine stile Notion
js/news.js        Google News
js/gmail.js       Gmail
js/turni.js       tabella turni
js/notes.js       note stile Keep
js/calendar.js    calendario stile iPhone
js/settings.js    impostazioni e backup
js/search.js      ricerca globale (Ctrl+K)
manifest.json, sw.js, icons/   installazione come app e uso offline
```
