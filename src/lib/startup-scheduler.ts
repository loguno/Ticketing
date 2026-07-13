import { db } from './db';
import { sendStartupEmail, sendReportEmail } from './smtp';
import { generateActivitiesPdf } from './pdf-generator';
import { Prisma, BoardType } from '@prisma/client';



let isRunning = false;

interface StartupWithSubactivities {
  subactivities: {
    status: string;
  }[];
}

// Helper to calculate completion percentage
function getProgress(startup: StartupWithSubactivities) {
  const total = startup.subactivities.length;
  if (total === 0) return 0;
  const completed = startup.subactivities.filter((s) => s.status === 'COMPLETATA').length;
  return Math.round((completed / total) * 100);
}

export async function checkAndSendPeriodicReport() {
  if (isRunning) return;
  isRunning = true;

  try {
    console.log('[Startup Scheduler] Checking if periodic report is due...');

    // 1. Get Settings
    const emailSetting = await db.systemSetting.findUnique({
      where: { key: 'startup_report_email' },
    });
    const scheduleSetting = await db.systemSetting.findUnique({
      where: { key: 'startup_report_schedule' },
    });
    const lastSentSetting = await db.systemSetting.findUnique({
      where: { key: 'last_startup_report_sent' },
    });

    const targetEmail = emailSetting?.value || 'pm@azienda.it';
    const schedule = scheduleSetting?.value || 'daily'; // 'daily' or 'weekly'
    const lastSentStr = lastSentSetting?.value;

    const now = new Date();
    let shouldSend = false;

    if (!lastSentStr) {
      // First time sending
      shouldSend = true;
    } else {
      const lastSent = new Date(lastSentStr);
      const diffMs = now.getTime() - lastSent.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (schedule === 'daily' && diffHours >= 23) {
        shouldSend = true;
      } else if (schedule === 'weekly' && diffHours >= 167) {
        shouldSend = true;
      }
    }

    if (!shouldSend) {
      console.log('[Startup Scheduler] Report is not due yet.');
      isRunning = false;
      return;
    }

    // 2. Query open activities
    const openStartups = await db.startupActivity.findMany({
      where: {
        status: {
          in: ['NUOVO', 'IN_LAVORAZIONE'],
        },
      },
      include: {
        subactivities: {
          include: {
            responsible: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`[Startup Scheduler] Found ${openStartups.length} open startup activities. Preparing report.`);

    // 3. Construct Email content
    const statusLabels: Record<string, string> = {
      NUOVO: 'Nuovo',
      IN_LAVORAZIONE: 'In Lavorazione',
      CONCLUSO: 'Concluso',
    };

    const subStatusLabels: Record<string, string> = {
      DA_FARE: 'Da fare',
      IN_CORSO: 'In corso',
      COMPLETATA: 'Completata',
    };

    let bodyText = `Riepilogo Periodico Attività Start Up - ${now.toLocaleDateString('it-IT')}\n\n`;
    if (openStartups.length === 0) {
      bodyText += 'Non ci sono attività di startup aperte al momento.';
    } else {
      openStartups.forEach((startup) => {
        const progress = getProgress(startup);
        bodyText += `==========================================\n`;
        bodyText += `ATTIVITÀ: ${startup.title}\n`;
        bodyText += `Cliente/Progetto: ${startup.clientProject || 'Non specificato'}\n`;
        bodyText += `Stato Generale: ${statusLabels[startup.status] || startup.status} (${progress}% completato)\n`;
        bodyText += `Scadenza prevista: ${startup.targetCompleteDate ? new Date(startup.targetCompleteDate).toLocaleDateString('it-IT') : 'N/D'}\n`;
        bodyText += `Sotto-attività:\n`;
        
        if (startup.subactivities.length === 0) {
          bodyText += `  (Nessuna sotto-attività definita)\n`;
        } else {
          startup.subactivities.forEach((sub) => {
            bodyText += `  - [${subStatusLabels[sub.status] || sub.status}] ${sub.title} | Resp: ${sub.responsible?.name || 'Non assegnato'}\n`;
            if (sub.progressNotes) {
              bodyText += `    Note: ${sub.progressNotes}\n`;
            }
          });
        }
        bodyText += `\n`;
      });
    }

    let bodyHtml = `
      <p>Questo è il report periodico automatico delle attività di <strong>Start Up</strong> aperte, generato il ${now.toLocaleDateString('it-IT')}.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    `;

    if (openStartups.length === 0) {
      bodyHtml += `<p style="color: #64748b; font-style: italic;">Non ci sono attività di startup aperte al momento.</p>`;
    } else {
      openStartups.forEach((startup) => {
        const progress = getProgress(startup);
        bodyHtml += `
          <div style="border: 1px solid #fed7aa; background: #fffdfa; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 4px 0; color: #7c2d12; font-size: 1.15rem;">${startup.title}</h3>
            <span style="font-size: 0.8rem; color: #64748b;">
              Cliente/Progetto: <strong>${startup.clientProject || 'Non specificato'}</strong> | 
              Stato: <strong>${statusLabels[startup.status] || startup.status}</strong> |
              Scadenza: <strong>${startup.targetCompleteDate ? new Date(startup.targetCompleteDate).toLocaleDateString('it-IT') : 'N/D'}</strong>
            </span>
            
            <!-- Progress Bar -->
            <div style="margin: 12px 0 16px 0;">
              <span style="font-size: 0.8rem; font-weight: bold; color: #ea580c; display: block; margin-bottom: 4px;">Avanzamento: ${progress}%</span>
              <div style="width: 100%; bg-color: #e2e8f0; background: #e2e8f0; border-radius: 9999px; height: 8px; overflow: hidden;">
                <div style="background: #ea580c; width: ${progress}%; height: 100%; border-radius: 9999px;"></div>
              </div>
            </div>
            
            <h4 style="margin: 12px 0 6px 0; font-size: 0.9rem; color: #451a03; border-bottom: 1px dashed #ffedd5; padding-bottom: 2px;">Sotto-attività</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
        `;

        if (startup.subactivities.length === 0) {
          bodyHtml += `<tr><td colspan="3" style="padding: 4px 0; color: #64748b; font-style: italic;">Nessuna sotto-attività configurata</td></tr>`;
        } else {
          startup.subactivities.forEach((sub) => {
            const statusColors: Record<string, string> = {
              DA_FARE: '#ef4444',
              IN_CORSO: '#3b82f6',
              COMPLETATA: '#10b981',
            };
            const col = statusColors[sub.status] || '#64748b';
            bodyHtml += `
              <tr style="border-bottom: 1px solid #f8fafc;">
                <td style="padding: 6px 0; font-weight: bold;">${sub.title}</td>
                <td style="padding: 6px 8px; color: ${col}; font-weight: bold; width: 100px;">[${statusLabels[sub.status] || subStatusLabels[sub.status] || sub.status}]</td>
                <td style="padding: 6px 0; color: #475569; width: 150px; text-align: right;">Resp: ${sub.responsible?.name || 'Non assegnato'}</td>
              </tr>
            `;
            if (sub.progressNotes) {
              bodyHtml += `
                <tr>
                  <td colspan="3" style="padding: 2px 0 8px 12px; color: #64748b; font-size: 0.8rem; font-style: italic; background: #fafafa;">
                    Note: ${sub.progressNotes}
                  </td>
                </tr>
              `;
            }
          });
        }

        bodyHtml += `
            </table>
          </div>
        `;
      });
    }

    // 4. Send email
    await sendStartupEmail({
      to: targetEmail,
      subject: `[STARTUP-SUMMARY] Riepilogo Attività Open - ${now.toLocaleDateString('it-IT')}`,
      bodyText,
      bodyHtml,
    });

    // 5. Update last sent timestamp
    await db.systemSetting.upsert({
      where: { key: 'last_startup_report_sent' },
      update: { value: now.toISOString() },
      create: { key: 'last_startup_report_sent', value: now.toISOString() },
    });

    console.log('[Startup Scheduler] Periodic report successfully sent and logged.');

  } catch (error) {
    console.error('[Startup Scheduler] Error checking or sending periodic report:', error);
  } finally {
    isRunning = false;
  }
}

export function calculateNextRun(startDate: Date, frequency: string, freqDetails: string | null, fromDate: Date = new Date()): Date {
  const start = new Date(startDate);
  
  // If the configured start date/time is in the future, that is exactly our first run!
  if (start > fromDate) {
    return start;
  }

  // Preserve the original hour, minute, second and millisecond from the start date
  const targetHour = start.getHours();
  const targetMinute = start.getMinutes();
  const targetSecond = start.getSeconds();
  const targetMs = start.getMilliseconds();

  // Create a candidate starting from fromDate, set to the target execution time
  const candidate = new Date(fromDate);
  candidate.setHours(targetHour, targetMinute, targetSecond, targetMs);

  // If the target execution time for today has already passed, the earliest candidate is tomorrow
  if (candidate <= fromDate) {
    candidate.setDate(candidate.getDate() + 1);
  }

  if (frequency === 'giornaliera') {
    let allowedDays: number[] = [];
    try {
      if (freqDetails) allowedDays = JSON.parse(freqDetails);
    } catch {}

    if (allowedDays.length === 0) {
      return candidate;
    }

    // Keep adding days until we hit a day of the week allowed by the user
    while (!allowedDays.includes(candidate.getDay())) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  if (frequency === 'settimanale') {
    let targetDay = 1; // Default Monday (1)
    try {
      if (freqDetails) targetDay = parseInt(freqDetails);
    } catch {}

    // Keep adding days until we match the configured day of the week
    while (candidate.getDay() !== targetDay) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  if (frequency === 'mensile') {
    let targetDay = 1;
    try {
      if (freqDetails) targetDay = parseInt(freqDetails);
    } catch {}

    // Keep adding days until we match the day of the month (e.g. the 15th)
    while (candidate.getDate() !== targetDay) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  // Fallback: just add 1 day
  return candidate;
}

export async function runReportSchedule(scheduleId: string, isTest: boolean = false): Promise<boolean> {
  try {
    const schedule = await db.reportSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) throw new Error('Schedulazione non trovata.');

    // 1. Fetch startup activities based on filters
    const andConditions: Prisma.StartupActivityWhereInput[] = [];
    if (schedule.boardTypes && schedule.boardTypes !== 'ALL') {
      const types = schedule.boardTypes.split(',').map((t) => t.trim() as BoardType);
      andConditions.push({ boardType: { in: types } });
    }
    if (schedule.clientProject && schedule.clientProject !== 'ALL') {
      andConditions.push({ clientProject: schedule.clientProject });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};
    const activities = await db.startupActivity.findMany({
      where,
      include: {
        subactivities: {
          include: {
            responsible: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Generate PDF Report
    const pdfBuffer = await generateActivitiesPdf(activities);

    // 3. Send email with PDF attachment
    const subject = isTest
      ? `[TEST REPORT] ${schedule.name} - ${new Date().toLocaleDateString('it-IT')}`
      : `[REPORT] ${schedule.name} - ${new Date().toLocaleDateString('it-IT')}`;

    const bodyText = `Gentile utente,\n\nin allegato trovi il report periodico delle attività di sviluppo in formato PDF.\n\nNome Schedulazione: ${schedule.name}\nFiltri applicati:\n- Tipologie attività: ${schedule.boardTypes}\n- Progetto/Cliente: ${schedule.clientProject}\n\nQuesto messaggio è stato generato in modo automatico dal portale.`;

    await sendReportEmail({
      to: schedule.emails,
      subject,
      bodyText,
      pdfBuffer,
      filename: `${schedule.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf`,
    });

    // 4. Create Success Log
    await db.reportLog.create({
      data: {
        scheduleId: schedule.id,
        recipient: schedule.emails,
        status: 'SUCCESS',
      },
    });

    // 5. Update schedule lastRun and nextRun (only if it is a real execution)
    if (!isTest) {
      const nextRun = calculateNextRun(schedule.startDate, schedule.frequency, schedule.freqDetails, new Date());
      await db.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRun: new Date(),
          nextRun,
        },
      });
    }

    return true;
  } catch (error) {
    console.error(`[Report Scheduler] Error executing schedule ${scheduleId}:`, error);
    const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';

    await db.reportLog.create({
      data: {
        scheduleId,
        recipient: '',
        status: 'FAILED',
        error: errorMsg,
      },
    }).catch((e) => console.error('[Report Scheduler] Failed logging report failure:', e));

    return false;
  }
}

export async function checkAndSendDynamicReports() {
  const now = new Date();
  try {
    const schedulesToRun = await db.reportSchedule.findMany({
      where: {
        active: true,
        nextRun: {
          lte: now,
        },
      },
    });

    if (schedulesToRun.length > 0) {
      console.log(`[Report Scheduler] Found ${schedulesToRun.length} report schedules due. Executing...`);
      for (const schedule of schedulesToRun) {
        await runReportSchedule(schedule.id, false);
      }
    }
  } catch (error) {
    console.error('[Report Scheduler] Error checking dynamic report schedules:', error);
  }
}

interface GlobalWithScheduler {
  startupSchedulerInitialized?: boolean;
  startupSchedulerInterval?: NodeJS.Timeout | null;
}

export function initStartupScheduler() {
  const globalRef = global as typeof globalThis & GlobalWithScheduler;
  if (globalRef.startupSchedulerInitialized) {
    console.log('[Startup Scheduler] Scheduler already initialized in global scope.');
    return;
  }

  globalRef.startupSchedulerInitialized = true;
  console.log('[Startup Scheduler] Initializing background task (Interval: 1 Hour)...');
  
  // Run checks immediately on start, then every hour
  checkAndSendPeriodicReport();
  checkAndSendDynamicReports();
  
  const interval = setInterval(() => {
    checkAndSendPeriodicReport();
    checkAndSendDynamicReports();
  }, 60 * 60 * 1000); // 1 Hour
  
  globalRef.startupSchedulerInterval = interval;
}

export function stopStartupScheduler() {
  const globalRef = global as typeof globalThis & GlobalWithScheduler;
  if (globalRef.startupSchedulerInterval) {
    clearInterval(globalRef.startupSchedulerInterval);
    globalRef.startupSchedulerInterval = null;
    globalRef.startupSchedulerInitialized = false;
    console.log('[Startup Scheduler] Scheduler stopped.');
  }
}


