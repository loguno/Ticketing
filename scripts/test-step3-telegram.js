/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Collaudo e Verifica STEP 3: Bot Telegram Vocale e Parser AI
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'tk_sec_dev_2026_ticket_service_key';

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

async function runStep3Tests() {
  console.log('=== TEST STEP 3: BOT TELEGRAM VOCALE PER CREAZIONE TICKET ===\n');

  // TEST 1: Comando /start su Webhook Telegram
  console.log('1. Test Webhook Telegram: invio comando /start');
  const startUpdate = {
    update_id: 10001,
    message: {
      message_id: 1,
      from: { id: 99901, first_name: 'Giovanni', username: 'giovanni_log' },
      chat: { id: 99901, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: '/start',
    },
  };

  const res1 = await request('/api/telegram/webhook', {
    method: 'POST',
    body: startUpdate,
  });
  console.log(`- Status: ${res1.status} (Atteso: 200)`);
  console.log(`- Response:`, JSON.stringify(res1.data));
  if (res1.status !== 200 || !res1.data.ok) throw new Error('Fallito test comando /start');
  console.log('✔ Risposta a comando /start inviata con successo.\n');

  // TEST 2: Creazione Ticket da Messaggio di Testo Telegram
  console.log('2. Test Webhook Telegram: Creazione Ticket da Messaggio Testuale');
  const textTicketUpdate = {
    update_id: 10002,
    message: {
      message_id: 2,
      from: { id: 99902, first_name: 'Paolo', last_name: 'Verdi', username: 'pverdi' },
      chat: { id: 99902, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: 'Buongiorno, sono Paolo Verdi. Segnalo anomalia bloccante sui terminali pistole RF del magazzino WMS corsia 3. È urgentissimo da risolvere entro stasera.',
    },
  };

  const res2 = await request('/api/telegram/webhook', {
    method: 'POST',
    body: textTicketUpdate,
  });
  console.log(`- Status: ${res2.status} (Atteso: 200)`);
  console.log(`- Ticket creato da testo Telegram:`, res2.data.ticket);
  if (res2.status !== 200 || !res2.data.ok || !res2.data.ticket?.ticketNumber) {
    throw new Error('Fallita creazione ticket da testo Telegram');
  }
  const textTicketNum = res2.data.ticket.ticketNumber;
  console.log(`✔ Ticket ${textTicketNum} registrato con successo da messaggio Telegram.\n`);

  // TEST 3: Creazione Ticket da Nota Vocale Telegram (.ogg)
  console.log('3. Test Webhook Telegram: Creazione Ticket da Nota Vocale (.ogg)');
  const voiceTicketUpdate = {
    update_id: 10003,
    message: {
      message_id: 3,
      from: { id: 99903, first_name: 'Luca', last_name: 'Bianchi', username: 'lbianchi' },
      chat: { id: 99903, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      voice: {
        file_id: 'voice_ogg_sample_test_123',
        file_unique_id: 'uniq_voice_123',
        duration: 8,
        mime_type: 'audio/ogg',
        file_size: 24500,
      },
    },
  };

  const res3 = await request('/api/telegram/webhook', {
    method: 'POST',
    body: voiceTicketUpdate,
  });
  console.log(`- Status: ${res3.status} (Atteso: 200)`);
  console.log(`- Ticket creato da vocale Telegram:`, res3.data.ticket);
  if (res3.status !== 200 || !res3.data.ok || !res3.data.ticket?.ticketNumber) {
    throw new Error('Fallita creazione ticket da nota vocale Telegram');
  }
  const voiceTicketNum = res3.data.ticket.ticketNumber;
  console.log(`✔ Ticket ${voiceTicketNum} registrato con successo da nota vocale Telegram.\n`);

  // TEST 4: Verifica che i ticket creati da Telegram siano interrogabili tramite API REST dello Step 1
  console.log('4. Test Verifica API REST Step 1 per i ticket creati da Telegram');
  const res4 = await request(`/api/tickets/query?search=${encodeURIComponent(voiceTicketNum)}`, {
    headers: { 'x-api-key': API_KEY },
  });
  console.log(`- Status: ${res4.status} (Atteso: 200)`);
  console.log(`- Trovato ticket in DB:`, res4.data.tickets?.[0]?.ticketNumber);
  if (res4.status !== 200 || res4.data.count < 1) {
    throw new Error('Ticket da Telegram non trovato nella ricerca API Step 1');
  }
  console.log('✔ Ticket da Telegram correttamente sincronizzato nel database e verificato via REST.\n');

  // TEST 5: Verifica che i ticket creati da Telegram siano subito consultabili dal Chatbot AI dello Step 2
  console.log('5. Test Consultazione immediata del ticket Telegram da Chatbot AI (Step 2)');
  const res5 = await request('/api/assistant/chat', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: { message: `Dimmi i dettagli del ticket ${voiceTicketNum}` },
  });
  console.log(`- Status: ${res5.status} (Atteso: 200)`);
  console.log(`- Risposta Chatbot AI:\n${res5.data.reply?.substring(0, 300)}...\n`);
  if (res5.status !== 200 || !res5.data.success || !res5.data.reply.includes(voiceTicketNum)) {
    throw new Error('Chatbot AI non ha trovato il ticket creato da Telegram');
  }
  console.log('✔ Ticket creato via Telegram immediatamente consultabile e spiegato dal Chatbot interno!\n');

  console.log('====================================================');
  console.log('TUTTI I TEST DELLO STEP 3 COMPLETATI CON SUCCESSO! 🎉');
  console.log('====================================================');
}

runStep3Tests().catch((err) => {
  console.error('ERRORE DURANTE I TEST STEP 3:', err);
  process.exit(1);
});
