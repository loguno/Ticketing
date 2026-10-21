/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Script di Long Polling per Telegram Bot.
 * Permette di testare e utilizzare il bot Telegram localmente
 * senza dover configurare un tunnel HTTPS pubblico (ngrok/cloudflare).
 *
 * Utilizzo:
 *   node scripts/telegram-bot-polling.js
 */

const https = require('https');
const http = require('http');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_LOCAL_URL = 'http://localhost:3000/api/telegram/webhook';

if (!BOT_TOKEN || BOT_TOKEN === 'dev_telegram_bot_token') {
  console.log('⚠️ TELEGRAM_BOT_TOKEN non configurato o impostato su valore demo in .env.');
  console.log('Per connettere un bot reale:');
  console.log('1. Crea un bot con @BotFather su Telegram');
  console.log('2. Inserisci il token in .env (es. TELEGRAM_BOT_TOKEN="123456:ABC-DEF...")');
  console.log('3. Riavvia questo script.');
  process.exit(0);
}

let lastOffset = 0;

function pollUpdates() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastOffset}&timeout=30`;

  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', async () => {
      try {
        const json = JSON.parse(data);
        if (json.ok && Array.isArray(json.result)) {
          for (const update of json.result) {
            lastOffset = update.update_id + 1;
            console.log(`[Telegram Polling] Ricevuto update #${update.update_id}`);

            // Forward update to local Next.js webhook endpoint
            await forwardToLocalWebhook(update);
          }
        }
      } catch (err) {
        console.error('[Telegram Polling] Errore parsing risposta:', err);
      }
      // Re-trigger next poll
      setTimeout(pollUpdates, 1000);
    });
  }).on('error', (err) => {
    console.error('[Telegram Polling] Errore rete:', err.message);
    setTimeout(pollUpdates, 5000);
  });
}

function forwardToLocalWebhook(update) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(update);
    const req = http.request(
      WEBHOOK_LOCAL_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let respData = '';
        res.on('data', (c) => (respData += c));
        res.on('end', () => {
          console.log(`[Telegram Polling] Inoltrato con esito ${res.statusCode}:`, respData);
          resolve();
        });
      }
    );

    req.on('error', (e) => {
      console.error('[Telegram Polling] Errore forward a localhost:3000:', e.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

console.log('🤖 Avvio Telegram Bot in modalità Long Polling...');
console.log('In ascolto per note vocali e messaggi Telegram...');
pollUpdates();
