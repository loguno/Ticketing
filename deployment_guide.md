# Guida completa per il deploy su Clever Cloud

## 1. Differenza tra **PostgreSQL** e **MySQL**

| Caratteristica | **PostgreSQL** | **MySQL** |
|----------------|----------------|-----------|
| **Tipo di database** | Relazionale, orientato agli oggetti. Supporta tipi avanzati (JSONB, array, hstore). | Relazionale tradizionale. Supporta JSON ma con meno caratteristiche rispetto a PostgreSQL. |
| **Conformità SQL** | Molto aderente allo standard SQL: supporto completo a CTE, window functions, full‑text search avanzato. | Parzialmente aderente; alcune funzioni avanzate mancano o hanno sintassi diversa. |
| **Transazioni** | ACID completo, supporto a *savepoints* e *nested transactions* (via savepoints). | ACID completo a partire da InnoDB, ma il supporto a savepoints è più limitato. |
| **Performance** | Ottimo per query complesse, analisi dati, carichi di lavoro con molte scritture simultanee. | Ottimizzato per letture veloci su tabelle relativamente semplici; le performance su query complesse possono essere inferiori. |
| **Estendibilità** | Sistema di estensioni (PostGIS, pg_partman, ecc.) che aggiunge funzionalità GIS, partizionamento avanzato, ecc. | Meno estendibile, ma esistono plugin e storage engine alternativi (MyISAM, InnoDB, ecc.). |
| **Licenza** | Open‑source (PostgreSQL License, permissiva). | Open‑source (GPLv2) con versioni Enterprise a pagamento (MySQL Enterprise). |
| **Scelta consigliata per il nostro progetto** | **PostgreSQL** è la scelta migliore perché Prisma (ORM già usato) ha un supporto più maturo, e le funzionalità di JSONB e tipi avanzati facilitano future evoluzioni dell’app. | MySQL è comunque supportato ma richiederebbe più adattamenti se volessimo sfruttare funzioni avanzate. |

## 2. Cos’è **Next.js**?

- **Framework React** per lo sviluppo di applicazioni web moderne.
- Fornisce **rendering ibrido** (Server‑Side Rendering, Static Site Generation, Incremental Static Regeneration) per migliorare SEO e performance.
- Gestisce **routing** basato su file system (`pages/` o `app/` a seconda della versione).
- Ha un **sistema di API integrato** (`pages/api/…`) che permette di scrivere endpoint server‑side nello stesso progetto.
- È ottimizzato per il deployment su piattaforme Node.js (Vercel, Netlify, Clever Cloud, ecc.).
- Include funzionalità di **image optimisation**, **CSS modules**, **environment variables** e **middleware** per l’autenticazione.

Nel nostro progetto il portale Ticket è un’app Next.js con TypeScript, Prisma per il DB e un middleware personalizzato per gestire i ruoli (ADMIN, HELPDESK, STANDARD).

## 3. Cos’è **Node.js**?

- **Runtime JavaScript** basato sul motore V8 di Chrome, che permette di eseguire codice JavaScript fuori dal browser.
- Ideale per **applicazioni server‑side** (APIs, micro‑servizi, rendering server di React/Next.js).
- Fornisce un **event‑loop** non bloccante, facilitando operazioni I/O ad alta concorrenza (es. richieste HTTP, accesso al DB).
- È la base su cui gira Next.js: quando esegui `npm run dev` o `npm start`, il processo è un processo Node.js.

## 4. Configurazione iniziale su Clever Cloud

### 4.1 Creare un account e un nuovo *Application*
1. Registrati su <https://www.clever-cloud.com> e accedi.
2. Dal dashboard clicca **“Create Application”** → scegli **Node.js** come runtime.
3. Dai un nome all’app (es. `ticket-portal`).
4. Salva le impostazioni; verrà creato un **Git endpoint** (URL tipo `git@git.clever-cloud.com:username/ticket-portal.git`).

### 4.2 Aggiungere il **Database PostgreSQL**
1. Nel contesto dell’app, vai su **“Add‑on”** → **“Database”** → scegli **PostgreSQL**.
2. Conferma la creazione; Clever Cloud ti fornirà le credenziali (`HOST`, `PORT`, `DATABASE`, `USER`, `PASSWORD`).
3. Prendi la stringa di connessione completa, ad esempio:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```
4. Copia quella stringa; la inseriremo nella variabile d’ambiente `DATABASE_URL`.

### 4.3 Configurare le **variabili d’ambiente**
Nel pannello **Environment variables** dell’app aggiungi:
- `DATABASE_URL` → la stringa di connessione PostgreSQL appena ottenuta.
- Eventuali altre variabili già presenti localmente (`NEXT_PUBLIC_API_URL`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, ecc.).
- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1` (opzionale, disabilita la telemetria di Next.js).

### 4.4 Collegare il repository GitHub
1. Nel tuo repository su GitHub (<https://github.com/Nannolo76/Ticket.git>) aggiungi il **remote Clever Cloud**:
```bash
# Da terminale nella cartella del progetto
git remote add clever git@git.clever-cloud.com:username/ticket-portal.git
```
2. Pusha il codice sul remote Clever Cloud:
```bash
git push clever main
```
   (Sostituisci `main` con il branch di default se diverso.)
3. Clever Cloud rileverà automaticamente il *build script* (vedi prossimo punto) e avvierà il processo di build.

### 4.5 Aggiornare la configurazione di **Prisma**
1. Apri `prisma/schema.prisma` e modifica il datasource:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
2. (Facoltativo) Se vuoi mantenere SQLite per lo sviluppo locale, puoi usare una variabile alternativa:
```prisma
env("DATABASE_URL")
# oppure per sviluppo:
# url = env("DATABASE_URL_DEV")
```
3. Genera il client Prisma aggiornato:
```bash
npm run prisma:generate   # oppure npx prisma generate
```
4. Crea le prime migrazioni (una volta locale) e spingile su Clever Cloud:
```bash
npx prisma migrate dev --name init   # crea file di migrazione
git add prisma/migrations && git commit -m "Add migrations"
git push clever main
```
5. Quando l’app parte su Clever Cloud, il comando `npm start` farà partire il server Next.js; Prisma eseguirà le migrazioni automaticamente se includi uno script `postinstall` nel `package.json`:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "postinstall": "prisma migrate deploy"
}
```
   Questo garantisce che, al primo avvio, il DB venga aggiornato.

### 4.6 Build & Start commands su Clever Cloud
Nel pannello **Service Settings** impostare:
- **Build command**: `npm install && npm run build`
- **Start command**: `npm start`
- **Node version**: scegli la versione più recente supportata (es. `18.x`).

### 4.7 Verifica del deploy
1. Dopo il push, Clever Cloud mostrerà i log di build. Controlla che il comando `npm run build` termini senza errori.
2. Quando il deploy è completato, visita l’URL fornito (es. `https://ticket-portal.cleverapps.io`).
3. Verifica:
   - La pagina carica correttamente.
   - È possibile loggarsi, visualizzare i ticket, inviare email, ecc.
   - I dati vengono salvati nel DB PostgreSQL (puoi usare la console di Clever Cloud per ispezionare le tabelle).

## 5. Riepilogo dei passaggi (check‑list)
1. **Crea account Clever Cloud** e una nuova *Application* (Node.js).
2. **Aggiungi PostgreSQL** come add‑on.
3. **Imposta le variabili d’ambiente** (`DATABASE_URL` + altre config).
4. **Modifica `prisma/schema.prisma`**: provider = "postgresql".
5. **Aggiorna gli script npm** (`postinstall` per migrazioni).
6. **Collega il repository GitHub** al remote Clever Cloud (`git remote add clever …`).
7. **Pusha il codice** (`git push clever main`).
8. **Controlla i log di build** e assicurati che `npm run build` e `npm start` completino con successo.
9. **Testa l’app in produzione** (controlla DB, email, login, permessi).

---

### Per approfondire ulteriormente
- **Documentazione PostgreSQL su Clever Cloud**: https://www.clever-cloud.com/doc/addons/postgresql/
- **Guide di deploy Next.js su Node.js**: https://nextjs.org/docs/deployment#nodejs
- **Prisma Migration Docs**: https://www.prisma.io/docs/concepts/components/prisma-migrate

Se hai altre domande su uno dei punti (ad es. configurazione SMTP, creazione delle migrazioni, gestione dei segreti), fammi sapere!
