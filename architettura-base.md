# Architettura e Infrastruttura Base - Step 1

Questo documento definisce il piano di implementazione per la base dell'architettura del **Portale di Gestione Ticket e Attività IT**, basato sulle decisioni tecniche validate.

## User Review Required

> [!IMPORTANT]
> **1. Sicurezza della connessione IMAP (Microsoft Exchange/Outlook)**
> Le organizzazioni aziendali Microsoft Exchange stanno disattivando l'autenticazione di base (username/password) a favore di OAuth2. L'implementazione attuale del worker IMAP utilizzerà l'autenticazione a due fattori con una **Password per le app** (App Password) generata dal portale Microsoft se l'SSO o la MFA sono attivi sulla casella `helpdesk@azienda.it`.
> 
> **2. Seed Script per Utenti Iniziali**
> Per consentire il primo accesso al sistema, integreremo uno script di seed Prisma che creerà:
> - 1 Utente Admin (`admin@azienda.it`)
> - 1 Operatore Help Desk (`helpdesk-op@azienda.it`)
> - 1 Utente Standard (`utente@azienda.it`)
> Le password iniziali saranno configurabili tramite variabili d'ambiente.

## Open Questions

> [!NOTE]
> Nessuna questione bloccante attiva. Lo stack e i requisiti sono stati definiti in modo estremamente chiaro. Procediamo con le specifiche architettoniche proposte di seguito.

---

## Proposed Changes

Di seguito viene delineata l'infrastruttura e la struttura del codice per i diversi componenti.

### 1. Schema del Database (Prisma ORM)

#### [NEW] [schema.prisma](file:///c:/Users/IvanoFiorito/OneDrive%20-%20LOGISTICA%20UNO%20EUROPE%20SRL/Desktop/antigravity%20project/prisma/schema.prisma)

Lo schema definisce quattro tabelle principali: `User`, `Ticket`, `Message`, ed `Attachment`.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  STANDARD
  HELPDESK
  ADMIN
}

enum TicketStatus {
  NUOVO
  IN_VALUTAZIONE
  RISOLTO
  CHIUSO
  NON_RISOLVIBILE
  ANNULLATO
}

enum TicketPriority {
  BASSA
  MEDIA
  ALTA
  CRITICA
}

enum TicketCategory {
  TMS
  WMS
  AMMINISTRATIVO
  ALTRO
}

enum TicketOrigin {
  PORTALE
  EMAIL
}

enum MessageType {
  INTERNAL_NOTE
  USER_COMMUNICATION
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  passwordHash String
  name         String
  role         Role          @default(STANDARD)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  // Relazioni
  createdTickets  Ticket[]   @relation("TicketCreator")
  assignedTickets Ticket[]   @relation("TicketOperator")
  messages        Message[]

  @@map("users")
}

model Ticket {
  id                  String          @id @default(uuid())
  ticketNumber        String          @unique // Formato: TKT-YYYY-XXXXX
  title               String
  description         String
  status              TicketStatus    @default(NUOVO)
  priority            TicketPriority  @default(BASSA)
  category            TicketCategory  @default(ALTRO)
  origin              TicketOrigin    @default(PORTALE)
  contact             String          // Email del mittente per risposte dirette
  targetCloseDate     DateTime?
  
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  // Relazioni
  creatorId           String?
  creator             User?           @relation("TicketCreator", fields: [creatorId], references: [id])
  operatorId          String?
  operator            User?           @relation("TicketOperator", fields: [operatorId], references: [id])
  messages            Message[]
  attachments         Attachment[]

  @@map("tickets")
}

model Message {
  id          String      @id @default(uuid())
  ticketId    String
  ticket      Ticket      @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  senderId    String?     // Null se inviato da utente non registrato via email
  sender      User?       @relation(fields: [senderId], references: [id])
  senderEmail String      // Email dell'autore del messaggio
  type        MessageType @default(USER_COMMUNICATION)
  body        String
  createdAt   DateTime    @default(now())
  
  attachments Attachment[]

  @@map("messages")
}

model Attachment {
  id        String   @id @default(uuid())
  filename  String
  filePath  String   // Path locale all'interno del volume Docker
  fileType  String   // Es: application/pdf, image/jpeg
  fileSize  Int      // Dimensione in byte
  createdAt DateTime @default(now())

  ticketId  String?
  ticket    Ticket?  @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  messageId String?
  message   Message? @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@map("attachments")
}
```

---

### 2. Struttura delle Cartelle

Proponiamo la seguente struttura Next.js pulita e organizzata, ottimizzata per l'uso di App Router, API route e worker integrato:

```text
portale-ticket/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Redirect a login o dashboard
│   │   ├── login/
│   │   │   └── page.tsx        # Schermata di Login
│   │   ├── dashboard/
│   │   │   ├── layout.tsx      # Sidebar e Navbar di navigazione
│   │   │   ├── page.tsx        # Vista di atterraggio (statistiche/basket)
│   │   │   ├── tickets/
│   │   │   │   ├── page.tsx    # Lista ticket (Filtri + Ricerca)
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Dettaglio ticket, Note interne, Risposte
│   │   │   └── admin/
│   │   │       └── page.tsx    # Pannello gestione utenti e parametri (Admin Only)
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── me/route.ts
│   │       └── tickets/
│   │           ├── route.ts
│   │           └── [id]/
│   │               ├── route.ts
│   │               └── messages/route.ts
│   ├── components/             # Componenti UI atomici e complessi
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── select.tsx
│   │   ├── sidebar.tsx
│   │   └── ticket-card.tsx
│   ├── lib/                    # Librerie e configurazioni core
│   │   ├── db.ts               # Inizializzazione Prisma Client
│   │   ├── jwt.ts              # Funzioni di firma e verifica token JWT
│   │   ├── smtp.ts             # Invio mail tramite nodemailer con SMTP aziendale
│   │   └── ticket-utils.ts     # Generazione ticket number progressivo (TKT-YYYY-XXXXX)
│   ├── middleware.ts           # Middleware di autenticazione RBAC globale
│   └── workers/
│       └── imap-worker.ts      # Script del worker di polling IMAP
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

### 3. Configurazione Docker

L'infrastruttura prevede due servizi principali in esecuzione: l'applicazione **Next.js** e il database **PostgreSQL**, con un volume Docker condiviso per memorizzare gli allegati in modo persistente sul server on-premise.

#### [NEW] [Dockerfile](file:///c:/Users/IvanoFiorito/OneDrive%20-%20LOGISTICA%20UNO%20EUROPE%20SRL/Desktop/antigravity%20project/Dockerfile)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Run
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/workers ./src/workers

# Creazione cartella per gli allegati
RUN mkdir -p /app/attachments

EXPOSE 3000
CMD ["npm", "run", "start"]
```

#### [NEW] [docker-compose.yml](file:///c:/Users/IvanoFiorito/OneDrive%20-%20LOGISTICA%20UNO%20EUROPE%20SRL/Desktop/antigravity%20project/docker-compose.yml)

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: ticket-postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secretpassword}
      POSTGRES_DB: ${DB_NAME:-ticket_db}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  web:
    build: .
    container_name: ticket-web
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-secretpassword}@db:5432/${DB_NAME:-ticket_db}?schema=public
      JWT_SECRET: ${JWT_SECRET:-supersecretjwttokenkey123!}
      ATTACHMENTS_DIR: /app/attachments
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      - db
    volumes:
      - attachments_data:/app/attachments

  # Servizio separato per il worker IMAP che esegue il polling ogni 2 minuti
  imap-worker:
    build: .
    container_name: ticket-imap-worker
    restart: always
    command: node src/workers/imap-worker.js
    environment:
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-secretpassword}@db:5432/${DB_NAME:-ticket_db}?schema=public
      ATTACHMENTS_DIR: /app/attachments
      IMAP_HOST: ${IMAP_HOST}
      IMAP_PORT: ${IMAP_PORT}
      IMAP_USER: ${IMAP_USER}
      IMAP_PASS: ${IMAP_PASS}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    depends_on:
      - db
      - web
    volumes:
      - attachments_data:/app/attachments

volumes:
  pgdata:
  attachments_data:
```

---

### 4. Middleware di Autenticazione RBAC

#### [NEW] [middleware.ts](file:///c:/Users/IvanoFiorito/OneDrive%20-%20LOGISTICA%20UNO%20EUROPE%20SRL/Desktop/antigravity%20project/src/middleware.ts)

Il middleware proteggerà le rotte del pannello `/dashboard` intercettando la richiesta e verificando il cookie JWT dell'utente. Utilizzerà la libreria `jose` per supportare l'esecuzione nell'Edge Runtime di Next.js.

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'supersecretjwttokenkey123!'
);

// Definizione delle rotte protette e dei ruoli ammessi
const ROLE_ROUTES = {
  ADMIN: ['/dashboard/admin'],
  HELPDESK: ['/dashboard/tickets'], // Visualizzazione totale e presa in carico
  STANDARD: ['/dashboard/tickets'], // Vede solo i suoi (la logica di filtraggio sarà nelle API)
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Consenti sempre le richieste di autenticazione pubblica e asset statici
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Decodifica e verifica del token JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    // Controllo delle rotte riservate agli Admin
    if (pathname.startsWith('/dashboard/admin') && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Controllo delle rotte riservate agli Operatori Helpdesk / Admin
    if (
      pathname.startsWith('/dashboard/tickets') &&
      !['ADMIN', 'HELPDESK', 'STANDARD'].includes(userRole)
    ) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Aggiunta dell'header dell'utente autenticato per propagazione
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub as string);
    requestHeaders.set('x-user-role', userRole);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    // Token non valido o scaduto -> Cancella il cookie e reindirizza al login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/tickets/:path*'],
};
```

---

### 5. Worker IMAP Polling

#### [NEW] [imap-worker.ts](file:///c:/Users/IvanoFiorito/OneDrive%20-%20LOGISTICA%20UNO%20EUROPE%20SRL/Desktop/antigravity%20project/src/workers/imap-worker.ts)

Il worker utilizzerà la libreria `imapflow` (moderna e robusta) ed il parser `mailparser` per elaborare i messaggi e scaricare gli allegati.

**Flusso logico del parsing:**
1. Polling periodico ogni 2 minuti (`setInterval`).
2. Ricerca delle e-mail non lette (`UNSEEN`).
3. Estrazione del mittente, dell'oggetto e del corpo (corpo di testo o HTML convertito in testo).
4. **Logica Bidirezionale**: Controlla tramite espressione regolare se l'oggetto contiene la stringa `[TKT-YYYY-XXXXX]`.
   - **Caso Risposta**: Cerca il ticket corrispondente nel database. Se esiste, crea un record `Message` con `type = USER_COMMUNICATION` associato a quel ticket.
   - **Caso Nuovo Ticket**: Genera un numero seriale progressivo incrementale (es. `TKT-2026-00001`) e inserisce un nuovo ticket con stato `NUOVO` e origine `EMAIL`.
5. Elaborazione di file allegati (immagini, PDF <= 10MB): salvataggio nella directory `ATTACHMENTS_DIR` del volume locale e inserimento del record `Attachment` associato.
6. Segna l'email come letta (`SEEN`) per evitare di processarla al ciclo successivo.

---

### 6. Modulo SMTP e Risposte all'Utente

#### [NEW] [smtp.ts](file:///c:/Users/IvanoFiorito/OneDrive%20-%20LOGISTICA%20UNO%20EUROPE%20SRL/Desktop/antigravity%20project/src/lib/smtp.ts)

Il modulo invierà e-mail tramite `nodemailer` utilizzando la configurazione SMTP aziendale fornita dalle variabili d'ambiente. 

Assicurerà che:
- L'oggetto includa sempre la stringa del ticket in formato `[TKT-YYYY-XXXXX]`.
- Venga usato un template HTML aziendale pulito e professionale.

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true per 465, false per altre porte
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailParams {
  to: string;
  ticketNumber: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

export async function sendTicketEmail({
  to,
  ticketNumber,
  subject,
  bodyText,
  bodyHtml,
}: SendEmailParams) {
  // Garantisce che il numero del ticket sia sempre presente nel formato richiesto
  const formattedSubject = subject.includes(`[${ticketNumber}]`)
    ? subject
    : `[${ticketNumber}] ${subject}`;

  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #1e3a8a;">Portale Servizi IT</h2>
        <span style="font-size: 0.875rem; color: #64748b;">Riferimento Ticket: <strong>${ticketNumber}</strong></span>
      </div>
      <div style="line-height: 1.6; margin-bottom: 24px;">
        ${bodyHtml || bodyText.replace(/\n/g, '<br>')}
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 0.75rem; color: #64748b; text-align: center;">
        Questa è una notifica automatica relativa al ticket ${ticketNumber}. Si prega di non alterare il codice tra parentesi quadre nell'oggetto in caso di risposta.
      </div>
    </div>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject: formattedSubject,
    text: bodyText,
    html: defaultHtml,
  };

  return transporter.sendMail(mailOptions);
}
```

---

## Verification Plan

### Automated Tests
Non sono ancora presenti test automatizzati in questa prima fase di bootstrap. Nello step di verifica, eseguiremo:
- `npm run build` e `npx tsc --noEmit` per validare la correttezza del compilatore TypeScript.
- Controllo statico dei moduli Prisma per prevenire errori di schema.

### Manual Verification
1. **Verifica Docker**: Esecuzione del comando `docker-compose up -d --build` per assicurarci che PostgreSQL e il backend Next.js si colleghino correttamente.
2. **Verifica Autenticazione e RBAC**: Test delle rotte protette simulando chiamate API con e senza token JWT valido, e provando ad accedere a rotte non permesse con utenti standard.
3. **Verifica IMAP**: Invio di un'email fittizia di test a una casella IMAP locale/aziendale e controllo che il worker crei il record del ticket e scarichi l'allegato.
4. **Verifica SMTP**: Chiamata di test per verificare che le email in uscita arrivino correttamente includendo l'identificativo ticket nell'oggetto.
