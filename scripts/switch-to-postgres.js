/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

try {
  let schema = fs.readFileSync(schemaPath, 'utf8');

  // Replace provider = "sqlite" with provider = "postgresql"
  if (schema.includes('provider = "sqlite"')) {
    schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('[Postgres Switcher] Successfully updated prisma/schema.prisma provider to postgresql for Vercel production build.');
  } else {
    console.log('[Postgres Switcher] Provider is already postgresql or not sqlite, skipping rewrite.');
  }
} catch (error) {
  console.error('[Postgres Switcher] Error modifying schema.prisma:', error);
  process.exit(1);
}
