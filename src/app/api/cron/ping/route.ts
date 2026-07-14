import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  // Optional security: check for CRON_SECRET in environment
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also support checking via query parameter for easier debugging/triggers
    const { searchParams } = new URL(request.url);
    if (searchParams.get('key') !== cronSecret) {
      return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
    }
  }

  try {
    console.log('[Cron Wake DB] Running ping query on database...');
    // Simple count query to wake up connection and DB instance
    const count = await db.user.count();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database is awake.',
      usersCount: count,
      timestamp: new Date().toISOString() 
    }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Cron Wake DB] Error pinging database:', error);
    return NextResponse.json({ 
      success: false, 
      error: errorMsg
    }, { status: 500 });
  }
}
