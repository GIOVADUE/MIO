# LAVORAZIONI

App per Android e iPhone per scrivere le **attività del mese, giorno per giorno**.
Accanto a ogni attività ci sono tre caselle: **Da fare**, **Conclusa**, **In sospeso**.

<img src="screenshot.png" width="300" alt="LAVORAZIONI su iPhone">

## Come si usa
- **‹ ›** in alto (o scorri col dito a destra/sinistra) per cambiare mese; tocca il nome del mese per tornare a oggi.
- **＋ Attività** sul giorno, scrivi e premi Invio (puoi aggiungerne più di una di fila).
- Tocca una delle tre caselle per impostare lo stato. Le attività concluse vengono barrate.
- Tocca il testo per modificarlo. **Tieni premuto** su un'attività per spostarla al giorno dopo/prima, duplicarla o eliminarla.
- I pulsanti in alto (Tutte / Da fare / Concluse / In sospeso) mostrano i totali del mese e filtrano l'elenco.
- Menu **⋯**: mostra solo i giorni con attività, porta le non concluse al mese dopo, condividi il riepilogo (WhatsApp, email…), salva/ripristina backup, svuota il mese.

## Su tutti i dispositivi, anche insieme
Le attività vengono salvate online (database Supabase, server in Europa) e compaiono **in tempo reale**
su ogni telefono, tablet o computer collegato. Funziona anche senza internet: le modifiche vengono inviate appena torna la connessione.
Sotto i filtri si vede lo stato: ☁️ *Sincronizzato*, ⏳ *Sincronizzo…* o 📴 *Offline*.

**Per collegare un altro dispositivo:** menu **⋯ → 🔗 Collega altri dispositivi → Invia il link**, poi apri il link
sull'altro dispositivo (oppure scrivi lì il codice personale). Il codice è la "chiave" delle tue attività: non darlo a chi non deve vederle.

Nota: con il piano gratuito di Supabase il database va in pausa dopo 7 giorni senza uso; si riattiva da
supabase.com → progetto *lavorazioni* → **Restore** (nessun dato viene perso).

## Installarla sul telefono
L'app è una web‑app installabile: va pubblicata una volta su un indirizzo `https://`, per esempio con GitHub Pages
(repository → **Settings → Pages** → Branch `main`, cartella `/root` → Save). L'indirizzo sarà
`https://<utente>.github.io/<repository>/lavorazioni/`.

- **iPhone (Safari):** apri l'indirizzo → pulsante **Condividi** → **Aggiungi alla schermata Home**.
- **Android (Chrome):** apri l'indirizzo → menu **⋮** → **Installa app** (o *Aggiungi a schermata Home*).

Comparirà l'icona **LAVORAZIONI** e si aprirà a schermo intero come un'app normale.
