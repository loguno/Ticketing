# Admin Ticket Deletion Feature

## Goal
Consentire agli utenti con ruolo ADMIN di eliminare definitivamente uno o più ticket dall'archivio, indipendentemente dall'autore, dallo stato e dalle attività collegate, con rimozione a cascata (database e file fisici su disco) e doppia conferma di sicurezza in 2 passaggi.

## Tasks
- [x] Task 1: Implementare endpoint `DELETE /api/tickets/[id]` per eliminazione del singolo ticket con controllo ruolo ADMIN, pulizia tollerante dei file su disco in `attachments/` e rimozione a cascata → Verify: chiamata DELETE autenticata da admin rimuove il ticket e restituisce 200, mentre da utente non-admin restituisce 403.
- [x] Task 2: Implementare endpoint `DELETE /api/tickets` per eliminazione massiva (bulk) con controllo ruolo ADMIN, accettando lista di ID e pulendo tutti i file e record correlati → Verify: chiamata DELETE con array di ID elimina tutti i ticket esistenti specificati e ignora ticket inesistenti.
- [x] Task 3: Creare componente modale `AdminDeleteModal` (`src/components/admin-delete-modal.tsx`) con flusso a 2 step (Step 1: avviso irreversibilità e riepilogo dati; Step 2: digitazione di sicurezza della parola "ELIMINA") → Verify: il pulsante di conferma definitivo rimane disabilitato fino alla digitazione corretta di "ELIMINA".
- [x] Task 4: Integrare pulsante di eliminazione e modale a 2 step nella pagina di dettaglio `src/app/dashboard/tickets/[id]/ticket-detail-client.tsx` visibile esclusivamente per `user.role === 'ADMIN'` → Verify: accedendo come admin è visibile il pulsante "Elimina Ticket", completando i 2 step il ticket viene eliminato e si viene reindirizzati alla lista.
- [x] Task 5: Aggiungere selezione multipla (checkbox colonna, selezione globale, barra azioni di gruppo con conteggio ed "Elimina selezionati") nella tabella `src/app/dashboard/tickets/tickets-client.tsx` per utenti ADMIN → Verify: spuntando uno o più ticket compare la barra di eliminazione massiva che apre la modale a 2 step e cancella i ticket selezionati aggiornando la lista.
- [x] Task 6: Eseguire lint e build/test di verifica per accertare che non vi siano regressioni o errori di compilazione TypeScript → Verify: `npm run lint` e `npx tsc --noEmit` completati con successo.

## Done When
- [x] L'amministratore può eliminare sia singoli ticket dal dettaglio sia gruppi di ticket dalla lista con checkbox.
- [x] La cancellazione richiede sempre il superamento dei 2 step di conferma (avviso impatto + digitazione "ELIMINA").
- [x] I ticket vengono rimossi definitivamente dal database assieme a messaggi e allegati, e i file fisici su disco vengono rimossi senza bloccare l'operazione in caso di file orfani.
- [x] Gli utenti con ruolo diverso da ADMIN non possono vedere i comandi né invocare le API di cancellazione (403 Forbidden).

## Notes
- Rimozione file fisici protetta con blocco try/catch: se un file su disco è inesistente o bloccato, l'operazione prosegue registrando un warning per non compromettere la pulizia dell'archivio.
- Verifica del ruolo eseguita sia a livello client (UI condizionale) sia a livello server (`request.headers.get('x-user-role') === 'ADMIN'`).
