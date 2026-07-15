import { NextResponse } from 'next/server';
import { checkAndSendPeriodicReport, checkAndSendDynamicReports } from '@/lib/startup-scheduler';

export async function GET(request: Request) {
  // Security check: match CRON_SECRET if it is set in the environment
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Check query parameter for easy triggers/debugging
    const { searchParams } = new URL(request.url);
    if (searchParams.get('key') !== cronSecret) {
      return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
    }
  }

  try {
    console.log('[Cron Scheduler API] Starting scheduled report checks...');
    
    // Execute both periodic report checking and dynamic report schedules
    await checkAndSendPeriodicReport();
    await checkAndSendDynamicReports();
    
    console.log('[Cron Scheduler API] Scheduled report checks completed successfully.');
    
    return NextResponse.json({
      success: true,
      message: 'Scheduler checks executed successfully.',
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Cron Scheduler API] Error during scheduler execution:', error);
    return NextResponse.json({
      success: false,
      error: errorMsg
    }, { status: 500 });
  }
}
