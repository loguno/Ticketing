import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const helpdeskPassword = process.env.SEED_HELPDESK_PASSWORD || 'HelpdeskPass123!';
  const userPassword = process.env.SEED_USER_PASSWORD || 'UserPass123!';

  // Hash passwords
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const helpdeskHash = await bcrypt.hash(helpdeskPassword, 10);
  const userHash = await bcrypt.hash(userPassword, 10);

  // Upsert Admin
  await prisma.user.upsert({
    where: { email: 'admin@azienda.it' },
    update: {},
    create: {
      email: 'admin@azienda.it',
      name: 'System Administrator',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  // Upsert Helpdesk Operator
  await prisma.user.upsert({
    where: { email: 'helpdesk-op@azienda.it' },
    update: {},
    create: {
      email: 'helpdesk-op@azienda.it',
      name: 'Help Desk Operator',
      passwordHash: helpdeskHash,
      role: Role.HELPDESK,
    },
  });

  // Upsert Standard User
  await prisma.user.upsert({
    where: { email: 'utente@azienda.it' },
    update: {},
    create: {
      email: 'utente@azienda.it',
      name: 'Standard User',
      passwordHash: userHash,
      role: Role.STANDARD,
    },
  });

  console.log('Seed success: default users created.');
  console.log(`Admin user: admin@azienda.it / ${adminPassword}`);
  console.log(`Helpdesk operator: helpdesk-op@azienda.it / ${helpdeskPassword}`);
  console.log(`Standard user: utente@azienda.it / ${userPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
