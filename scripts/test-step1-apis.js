const http = require('http');

const API_KEY = 'tk_sec_dev_2026_ticket_service_key';
const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const headers = options.headers || {};
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const reqOptions = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: options.method || 'GET',
    headers,
  };

  return new Promise((resolve, reject) => {
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== TEST STEP 1: LAYER API REST PER LA GESTIONE TICKET ===\n');

  // TEST 1: 401 Unauthorized senza API Key né cookie
  console.log('1. Test Autenticazione (senza API Key)');
  const res1 = await request('/api/tickets/create', {
    method: 'POST',
    body: { title: 'Ticket di prova' },
  });
  console.log(`- Status: ${res1.status} (Atteso: 401)`);
  console.log(`- Response:`, JSON.stringify(res1.data));
  if (res1.status !== 401) throw new Error('Fallito test 401');
  console.log('✔ Autenticazione non autorizzata respinta correttamente con HTTP 401.\n');

  // TEST 2: 400 Bad Request con API Key ma campi obbligatori mancanti
  console.log('2. Test Validazione Input /api/tickets/create (campi mancanti)');
  const res2 = await request('/api/tickets/create', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: { title: 'Solo Titolo' },
  });
  console.log(`- Status: ${res2.status} (Atteso: 400)`);
  console.log(`- Response:`, JSON.stringify(res2.data));
  if (res2.status !== 400) throw new Error('Fallito test 400');
  console.log('✔ Validazione campi obbligatori funzionante con HTTP 400.\n');

  // TEST 3: 201 Creazione Ticket con successo
  console.log('3. Test Creazione Ticket /api/tickets/create (payload completo)');
  const ticketPayload = {
    titolo: 'Guasto terminale barcode magazzino corsia B',
    descrizione: 'Il lettore barcode non scansiona i pallet in ingresso TMS.',
    richiedente: 'mario.rossi@logisticauno.com',
    priorita: 'ALTA',
    scadenza: new Date(Date.now() + 86400000).toISOString(),
    stato: 'IN_CARICO',
    categoria: 'TMS',
  };
  const res3 = await request('/api/tickets/create', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: ticketPayload,
  });
  console.log(`- Status: ${res3.status} (Atteso: 201)`);
  console.log(`- Ticket Number generato:`, res3.data.ticket?.ticketNumber);
  console.log(`- Response:`, JSON.stringify(res3.data, null, 2));
  if (res3.status !== 201 || !res3.data.success) throw new Error('Fallita creazione ticket');
  const createdTicketNumber = res3.data.ticket.ticketNumber;
  console.log(`✔ Ticket ${createdTicketNumber} creato con successo con HTTP 201.\n`);

  // TEST 4: Query Tickets con filtri GET
  console.log('4. Test Query Tickets /api/tickets/query (filtro GET status=APERTI & priority=ALTA)');
  const res4 = await request('/api/tickets/query?status=APERTI&priority=ALTA', {
    headers: { 'x-api-key': API_KEY },
  });
  console.log(`- Status: ${res4.status} (Atteso: 200)`);
  console.log(`- Risultati trovati: ${res4.data.count} / Totale: ${res4.data.total}`);
  if (res4.status !== 200 || !res4.data.success) throw new Error('Fallita query GET');
  console.log('✔ Endpoint query GET funzionante con HTTP 200.\n');

  // TEST 5: Query Tickets con filtri POST avanzati (riscontro pendente, testo libero)
  console.log('5. Test Query Tickets /api/tickets/query (filtro POST body avanzato)');
  const res5 = await request('/api/tickets/query', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: {
      search: 'terminale barcode',
      riscontro_pendente: 'SPETTA_A_ME',
    },
  });
  console.log(`- Status: ${res5.status} (Atteso: 200)`);
  console.log(`- Risultati trovati: ${res5.data.count}`);
  if (res5.status !== 200 || !res5.data.success) throw new Error('Fallita query POST');
  console.log('✔ Endpoint query POST avanzato funzionante con HTTP 200.\n');

  // TEST 6: Daily Summary
  console.log('6. Test Daily Summary /api/tickets/daily-summary');
  const res6 = await request('/api/tickets/daily-summary', {
    headers: { 'x-api-key': API_KEY },
  });
  console.log(`- Status: ${res6.status} (Atteso: 200)`);
  console.log(`- Statistiche:`, JSON.stringify(res6.data.statistiche, null, 2));
  console.log(`- Scadenze oggi: ${res6.data.scadenze_oggi.length}`);
  console.log(`- Priorità critiche/alte: ${res6.data.priorita_critiche.length}`);
  console.log(`- Solleciti pendenti: ${res6.data.solleciti_pendenti.length}`);
  if (res6.status !== 200 || !res6.data.success) throw new Error('Fallito daily summary');
  console.log('✔ Endpoint daily summary funzionante con HTTP 200.\n');

  console.log('====================================================');
  console.log('TUTTI I TEST DELLO STEP 1 COMPLETATI CON SUCCESSO! 🎉');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('ERRORE DURANTE I TEST:', err);
  process.exit(1);
});
