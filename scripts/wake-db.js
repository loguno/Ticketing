/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[Wake DB] Pinging database to keep it active...');
  try {
    // Perform a simple query to keep the connection and database awake
    const count = await prisma.user.count();
    console.log(`[Wake DB] Database ping successful. Found ${count} users.`);
  } catch (error) {
    console.error('[Wake DB] Database ping failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
