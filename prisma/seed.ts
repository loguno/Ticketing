import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@azienda.it';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123!';
  const helpdeskEmail = process.env.SEED_HELPDESK_EMAIL || 'helpdesk-op@azienda.it';
  const helpdeskPassword = process.env.SEED_HELPDESK_PASSWORD || 'HelpdeskPass123!';
  const userEmail = process.env.SEED_USER_EMAIL || 'utente@azienda.it';
  const userPassword = process.env.SEED_USER_PASSWORD || 'UserPass123!';
  const ivanoEmail = process.env.SEED_IVANO_EMAIL || 'ivano.fiorito@logisticauno.com';
  const ivanoPassword = process.env.SEED_IVANO_PASSWORD || 'Password1234';

  // Hash passwords
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const helpdeskHash = await bcrypt.hash(helpdeskPassword, 10);
  const userHash = await bcrypt.hash(userPassword, 10);
  const ivanoHash = await bcrypt.hash(ivanoPassword, 10);

  // Upsert Admin
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
    },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  // Upsert Helpdesk Operator
  await prisma.user.upsert({
    where: { email: helpdeskEmail },
    update: {
      passwordHash: helpdeskHash,
    },
    create: {
      email: helpdeskEmail,
      name: 'Help Desk Operator',
      passwordHash: helpdeskHash,
      role: Role.HELPDESK,
    },
  });

  // Upsert Standard User
  await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      passwordHash: userHash,
    },
    create: {
      email: userEmail,
      name: 'Standard User',
      passwordHash: userHash,
      role: Role.STANDARD,
    },
  });

  // Upsert Ivano Fiorito (Standard User)
  await prisma.user.upsert({
    where: { email: ivanoEmail },
    update: {
      passwordHash: ivanoHash,
    },
    create: {
      email: ivanoEmail,
      name: 'Ivano Fiorito',
      passwordHash: ivanoHash,
      role: Role.STANDARD,
    },
  });

  console.log('Seed success: default users created.');
  console.log(`Admin user: ${adminEmail} / ${adminPassword}`);
  console.log(`Helpdesk operator: ${helpdeskEmail} / ${helpdeskPassword}`);
  console.log(`Standard user: ${userEmail} / ${userPassword}`);
  console.log(`Standard user (Ivano): ${ivanoEmail} / ${ivanoPassword}`);

  // Seed System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'startup_report_email' },
    update: {},
    create: {
      key: 'startup_report_email',
      value: 'pm@azienda.it',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'startup_report_schedule' },
    update: {},
    create: {
      key: 'startup_report_schedule',
      value: 'daily',
    },
  });

  // Seed Startup Activities & Subactivities
  // Delete existing to prevent duplicate demo data
  await prisma.startupSubactivity.deleteMany({});
  await prisma.startupActivity.deleteMany({});

  const operator = await prisma.user.findUnique({ where: { email: helpdeskEmail } });
  const standardUser = await prisma.user.findUnique({ where: { email: userEmail } });

  const act1 = await prisma.startupActivity.create({
    data: {
      title: 'Startup Cliente Alfa WMS',
      clientProject: 'Cliente Alfa',
      description: 'Attivazione del sistema WMS per il nuovo cliente Alfa nel magazzino di Milano.',
      status: 'IN_LAVORAZIONE',
      startDate: new Date('2026-06-01'),
      targetCompleteDate: new Date('2026-07-01'),
    },
  });

  await prisma.startupSubactivity.create({
    data: {
      startupActivityId: act1.id,
      title: 'Configurazione Anagrafica Articoli',
      description: 'Caricamento del tracciato articoli e test di validazione campi.',
      status: 'COMPLETATA',
      responsibleId: operator?.id,
      progressNotes: 'Anagrafiche configurate ed importate correttamente via file excel.',
      completedAt: new Date('2026-06-10'),
    },
  });

  await prisma.startupSubactivity.create({
    data: {
      startupActivityId: act1.id,
      title: 'Test Ingressi di Magazzino',
      description: 'Esecuzione test di ricezione e stoccaggio merce con terminali RF.',
      status: 'IN_CORSO',
      responsibleId: operator?.id,
      progressNotes: 'In corso test di ricezione. Rilevato un piccolo ritardo nel caricamento dei dati di tracciabilità.',
    },
  });

  await prisma.startupSubactivity.create({
    data: {
      startupActivityId: act1.id,
      title: 'Formazione Personale Magazzino',
      description: 'Training degli operatori di piazzale e dei carrellisti sulle nuove funzionalità.',
      status: 'DA_FARE',
      responsibleId: standardUser?.id,
    },
  });

  const act2 = await prisma.startupActivity.create({
    data: {
      title: 'Nuova Sede Logistica Piacenza',
      clientProject: 'Sede Piacenza',
      description: 'Allestimento infrastruttura IT e network per la nuova filiale di Piacenza.',
      status: 'NUOVO',
      startDate: new Date('2026-06-20'),
      targetCompleteDate: new Date('2026-07-15'),
    },
  });

  await prisma.startupSubactivity.create({
    data: {
      startupActivityId: act2.id,
      title: 'Attivazione Connettività Fibra',
      description: 'Posa della linea dedicata ed installazione borchia ottica.',
      status: 'DA_FARE',
    },
  });

  await prisma.startupSubactivity.create({
    data: {
      startupActivityId: act2.id,
      title: 'Configurazione Server Rack e AP Wifi',
      description: 'Cablaggio armadio di rete ed installazione access point nei settori A, B, C.',
      status: 'DA_FARE',
    },
  });

  console.log('Seed success: startup activities and settings seeded.');

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
