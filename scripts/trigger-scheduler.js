/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const https = require('https');

// Read app URL from environment, defaulting to localhost:3000
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '';

// Build the request URL
const url = `${APP_URL}/api/cron/scheduler?key=${CRON_SECRET}`;

// Hide secret in log output
const sanitizedUrl = url.replace(CRON_SECRET, CRON_SECRET ? '***' : '');
console.log(`[Cron Trigger] Triggering scheduled reports via URL: ${sanitizedUrl}`);

const client = url.startsWith('https') ? https : http;

client.get(url, (res) => {
  console.log(`[Cron Trigger] Response status code: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const responseJson = JSON.parse(body);
      if (res.statusCode === 200 && responseJson.success) {
        console.log(`[Cron Trigger] Success: ${responseJson.message}`);
        process.exit(0);
      } else {
        console.error(`[Cron Trigger] Failed with status ${res.statusCode}:`, responseJson.error || responseJson);
        process.exit(1);
      }
    } catch {
      console.error(`[Cron Trigger] Could not parse JSON response (status ${res.statusCode}):`, body);
      process.exit(res.statusCode === 200 ? 0 : 1);
    }
  });
}).on('error', (err) => {
  console.error('[Cron Trigger] HTTP Request Error:', err.message);
  process.exit(1);
});
