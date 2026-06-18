# Portale di Gestione Ticket e Attività IT — Specifiche di Progetto

---

## Contesto e Obiettivo

Creare un portale web completo per la gestione interna di ticket aziendali, attività di startup e idee di sviluppo IT. Il portale deve essere accessibile via browser, responsive, con autenticazione utente e pannello amministrativo per l'help desk.

**Stack tecnologico consigliato:**
- **Frontend**: React.js con Tailwind CSS o Material UI
- **Backend**: Node.js (Express) o Python (Django/FastAPI)
- **Database**: PostgreSQL
- **Email**: Nodemailer / SMTP / SendGrid
- **WhatsApp**: Twilio API for WhatsApp o Meta Cloud API
- **Autenticazione**: JWT + refresh token, con possibilità di SSO aziendale (LDAP/Active Directory)
- **Storage allegati**: AWS S3 o storage locale con backup
- **Deploy**: Docker + Nginx, compatibile con ambienti on-premise o cloud

---

## Livelli di Accesso

| Ruolo | Permessi |
|---|---|
| **Utente standard** | Inserimento segnalazioni, visualizzazione propri ticket, interazione con help desk |
| **Help Desk / Admin** | Accesso completo, modifica stati/priorità/assegnazioni, invio comunicazioni |

---

## Struttura del Portale

Il portale è diviso in tre macro-sezioni accessibili dal menu principale:

1. Ticket Interni
2. Start Up
3. Nuove Idee di Sviluppo

---

## Sezione 1 — Ticket Interni

### 1.1 Canali di Inserimento

Il sistema accetta ticket da tre canali, tutti confluenti in un **basket di preassegnazione** visibile solo all'help desk:

- **Portale web** — form di inserimento diretto
- **Email** — ricezione automatica da indirizzo dedicato (es. `helpdesk@azienda.it`) con parsing automatico dei campi
- **WhatsApp Business API** — ricezione messaggio con parsing del testo e creazione automatica del ticket in stato *Nuovo*

### 1.2 Campi del Ticket

| Campo | Tipo | Note |
|---|---|---|
| Numero ticket | Automatico | Progressivo univoco — es. `TKT-2024-00001` |
| Oggetto | Testo breve | Obbligatorio |
| Data inserimento | Data/ora | Automatica |
| Data prevista chiusura | Data | Inserita dall'utente o dall'help desk |
| Categoria | Select | TMS / WMS / Amministrativo / Altro |
| Descrizione | Testo lungo | Obbligatorio |
| Allegati | File | JPG e PDF, max 10 MB cadauno |
| Contatto | Testo | Email o telefono per le risposte |
| Stato | Select | Gestito dall'help desk |
| Urgenza/Priorità | Select | Assegnata dall'help desk durante il triage |
| Canale di origine | Automatico | Portale / Email / WhatsApp |

### 1.3 Stati del Ticket

```
Nuovo → In Valutazione → Risolto → Chiuso
                      ↘ Non Risolvibile
                      ↘ Annullato
```

Ad ogni cambio di stato l'help desk può scegliere se inviare una **notifica automatica** all'utente tramite email o WhatsApp.

### 1.4 Classificazione Urgenza — Triage

Nel basket di preassegnazione l'help desk assegna:

- **Priorità**: Bassa / Media / Alta / Critica
- **Categoria confermata** (può modificare quella indicata dall'utente)
- **Assegnazione** a un operatore interno

### 1.5 Pannello di Lavoro (Vista Help Desk)

Per ogni ticket aperto sono presenti due sezioni distinte:

- **Note interne** — commenti e attività visibili solo all'help desk
- **Comunicazioni all'utente** — messaggi inviati all'utente che ha aperto il ticket

### 1.6 Messaggistica Bidirezionale

Finché il ticket non è in stato `Chiuso` o `Annullato`:

- L'utente può inviare aggiornamenti o risposte dal portale
- L'help desk può rispondere dall'interno del ticket
- Ogni messaggio genera una notifica email/WhatsApp al destinatario
- Lo storico completo della conversazione è visibile nel ticket

---

## Sezione 2 — Start Up

### 2.1 Caratteristiche Generali

- Inserimento **solo da portale** (nessun canale esterno)
- **Nessuna interazione diretta** tra utente e help desk nel ticket
- Le comunicazioni verso l'esterno avvengono **solo via email** da parte dell'help desk
- L'help desk può inviare email a un **indirizzo di default configurabile** (es. `pm@azienda.it`) in questi momenti:
  - Inserimento nuova attività
  - Avanzamento di stato
  - **Schedulazione periodica** (giornaliera/settimanale) con riepilogo di tutte le attività ancora aperte

### 2.2 Struttura Gerarchica

Ogni attività di Start Up ha una struttura ad albero a due livelli:

#### Macro-attività (es. "Startup cliente Alfa")

| Campo | Tipo | Note |
|---|---|---|
| Titolo | Testo | Obbligatorio |
| Descrizione generale | Testo lungo | — |
| Cliente/Progetto | Testo | — |
| Data inizio | Data | — |
| Data prevista completamento | Data | — |
| Stato generale | Select | Nuovo / In Lavorazione / Concluso |
| % Avanzamento | Numerico | Calcolata automaticamente dalle sotto-attività |

#### Sotto-attività (es. "Anagrafica articoli", "Ingressi di magazzino", ecc.)

| Campo | Tipo | Note |
|---|---|---|
| Titolo | Testo | Obbligatorio |
| Descrizione | Testo lungo | — |
| Responsabile | Utente | — |
| Stato parziale | Select | Da fare / In corso / Completata |
| Note di avanzamento | Testo | — |
| Data completamento parziale | Data | — |

> Lo stato della macro-attività si aggiorna automaticamente in base alle sotto-attività completate, ma può essere forzato manualmente dall'help desk.

### 2.3 Vista Dashboard Start Up

Visualizzazione a kanban o tabella con:

- Raggruppamento per cliente/progetto
- Indicatore visivo di avanzamento complessivo (progress bar)
- Filtri per stato, responsabile, data

---

## Sezione 3 — Nuove Idee di Sviluppo

### 3.1 Caratteristiche Generali

Funzionamento simile ai ticket interni, con queste differenze:

- **Nessuno stato** di avanzamento
- **Nessuna urgenza/priorità**
- Canali di inserimento ammessi: portale, email, WhatsApp
- L'help desk può **prendere in carico** o **scartare** un'idea con motivazione
- Un'idea accettata può essere **convertita automaticamente** in ticket o in attività di Start Up

### 3.2 Campi dell'Idea

| Campo | Tipo | Note |
|---|---|---|
| Numero idea | Automatico | Es. `IDEA-2024-00001` |
| Oggetto | Testo breve | Obbligatorio |
| Data inserimento | Data/ora | Automatica |
| Categoria | Select | TMS / WMS / Amministrativo / Altro |
| Descrizione | Testo lungo | Obbligatorio |
| Allegati | File | JPG e PDF |
| Contatto | Testo | Email o telefono |
| Esito valutazione | Select | In attesa / Presa in carico / Scartata |
| Note valutazione | Testo | Compilato dall'help desk con motivazione |

### 3.3 Interazione

- L'utente può aggiungere dettagli finché l'idea è in stato `In attesa`
- L'help desk può richiedere chiarimenti tramite la sezione comunicazioni

---

## Funzionalità Trasversali

### Dashboard Generale (Homepage Help Desk)

- Contatori in tempo reale: ticket aperti, in valutazione, critici
- Widget basket di preassegnazione con alert per ticket non ancora presi in carico
- Grafici: trend ticket per settimana, distribuzione per categoria, SLA rispettati
- Attività Start Up in scadenza

### Notifiche e Comunicazioni

- Sistema email integrato (SMTP configurabile)
- Integrazione WhatsApp Business API
- Template messaggi personalizzabili per ogni tipo di notifica
- Schedulazione invio report riepilogativo (configurabile: giornaliero, settimanale)

### Ricerca e Filtri Avanzati

- Ricerca full-text su tutti i ticket
- Filtri per: stato, categoria, urgenza, data, operatore assegnato, canale origine
- Esportazione in CSV/Excel

### Configurazione Amministrativa

- Gestione utenti e ruoli
- Configurazione indirizzi email di default per ogni sezione
- Personalizzazione categorie e stati
- Log di sistema e audit trail di tutte le modifiche

---

*Documento generato il: 18/06/2026*
