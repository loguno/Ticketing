#!/usr/bin/env node
/**
 * check-env.js
 * Pre-flight check: verifica che le variabili d'ambiente critiche siano presenti
 * prima che l'app parta. Viene eseguito da Clever Cloud prima dell'avvio.
 */

const REQUIRED_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
];

const OPTIONAL_VARS = [
  'SMTP_PORT',
  'IMAP_HOST',
  'IMAP_USER',
  'IMAP_PASS',
  'PORT',
];

const RED   = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW= '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';

console.log(`\n${BOLD}=== ENV CHECK: Verifica variabili d'ambiente ===${RESET}`);

const missing = [];
const present = [];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    missing.push(key);
    console.log(`  ${RED}✗ MISSING${RESET}  ${key}`);
  } else {
    present.push(key);
    // Mostra solo i primi 4 caratteri per sicurezza
    const preview = process.env[key].substring(0, 4) + '****';
    console.log(`  ${GREEN}✓ OK${RESET}      ${key} = ${preview}`);
  }
}

console.log(`\n${BOLD}Optional:${RESET}`);
for (const key of OPTIONAL_VARS) {
  if (!process.env[key]) {
    console.log(`  ${YELLOW}~ UNSET${RESET}   ${key} (facoltativa)`);
  } else {
    console.log(`  ${GREEN}✓ OK${RESET}      ${key}`);
  }
}

if (missing.length > 0) {
  console.error(`\n${RED}${BOLD}[FATAL] Variabili mancanti: ${missing.join(', ')}${RESET}`);
  console.error(`${RED}Configurale nel pannello Environment Variables di Clever Cloud.${RESET}\n`);
  process.exit(1);
}

console.log(`\n${GREEN}${BOLD}✓ Tutte le variabili obbligatorie sono presenti. Avvio dell'app...${RESET}\n`);
