/* eslint-disable @typescript-eslint/no-require-imports */
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

async function runStep2Tests() {
  console.log('=== TEST STEP 2: ASSISTENTE AI OPERATIVO & INTELLIGENCE CONVERSAZIONALE ===\n');

  // TEST 1: Daily Agenda & Briefing
  console.log('1. Test Query Conversazionale: "Genera To-Do di Oggi"');
  const res1 = await request('/api/assistant/chat', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: { message: 'Genera To-Do di Oggi' },
  });
  console.log(`- Status: ${res1.status} (Atteso: 200)`);
  console.log(`- Reply Preview:\n${res1.data.reply?.substring(0, 300)}...\n`);
  if (res1.status !== 200 || !res1.data.success || !res1.data.reply.includes('Daily Agenda')) {
    throw new Error('Fallito test Daily Agenda');
  }
  console.log('✔ Daily Agenda & Briefing generato con successo.\n');

  // TEST 2: Domanda specifica "A chi devo rispondere oggi?"
  console.log('2. Test Query Conversazionale: "A chi devo rispondere oggi?"');
  const res2 = await request('/api/assistant/chat', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: { message: 'A chi devo rispondere oggi?' },
  });
  console.log(`- Status: ${res2.status} (Atteso: 200)`);
  console.log(`- Reply Preview:\n${res2.data.reply?.substring(0, 300)}...\n`);
  if (res2.status !== 200 || !res2.data.success || !res2.data.reply.includes('Situazione Riscontri')) {
    throw new Error('Fallito test Riscontri e Solleciti');
  }
  console.log('✔ Analisi riscontri pendenti e solleciti generata con successo.\n');

  // TEST 3: Domanda specifica su persona/utente ("Dimmi la situazione dei ticket di Mario")
  console.log('3. Test Query Conversazionale per persona: "Dimmi la situazione dei ticket di Mario"');
  const res3 = await request('/api/assistant/chat', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: { message: 'Dimmi la situazione dei ticket di Mario' },
  });
  console.log(`- Status: ${res3.status} (Atteso: 200)`);
  console.log(`- Reply Preview:\n${res3.data.reply?.substring(0, 300)}...\n`);
  if (res3.status !== 200 || !res3.data.success || !res3.data.reply.toLowerCase().includes('mario')) {
    throw new Error('Fallito test ricerca per persona');
  }
  console.log('✔ Ricerca per persona/richiedente funzionante con successo.\n');

  // TEST 4: Domanda su scadenze ed emergenze
  console.log('4. Test Query Conversazionale: "Quali ticket sono critici o in scadenza?"');
  const res4 = await request('/api/assistant/chat', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: { message: 'Quali ticket sono critici o in scadenza?' },
  });
  console.log(`- Status: ${res4.status} (Atteso: 200)`);
  console.log(`- Reply Preview:\n${res4.data.reply?.substring(0, 300)}...\n`);
  if (res4.status !== 200 || !res4.data.success || !res4.data.reply.includes('Scadenze')) {
    throw new Error('Fallito test scadenze');
  }
  console.log('✔ Monitor scadenze ed emergenze funzionante con successo.\n');

  // TEST 5: Domanda libera / ricerca per parola chiave
  console.log('5. Test Ricerca per parola chiave: "terminale barcode"');
  const res5 = await request('/api/assistant/chat', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: { message: 'Ci sono problemi con il terminale barcode?' },
  });
  console.log(`- Status: ${res5.status} (Atteso: 200)`);
  console.log(`- Reply Preview:\n${res5.data.reply?.substring(0, 300)}...\n`);
  if (res5.status !== 200 || !res5.data.success || !res5.data.reply.includes('TKT-')) {
    throw new Error('Fallito test ricerca testuale');
  }
  console.log('✔ Ricerca contestuale libera funzionante con successo.\n');

  console.log('====================================================');
  console.log('TUTTI I TEST DELLO STEP 2 COMPLETATI CON SUCCESSO! 🎉');
  console.log('====================================================');
}

runStep2Tests().catch((err) => {
  console.error('ERRORE DURANTE I TEST STEP 2:', err);
  process.exit(1);
});
