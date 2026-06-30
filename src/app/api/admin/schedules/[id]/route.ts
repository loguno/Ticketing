import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateNextRun } from '@/lib/startup-scheduler';
import { Prisma } from '@prisma/client';


// PATCH /api/admin/schedules/[id] — Update a schedule (ADMIN only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRole = request.headers.get('x-user-role');
  const { id } = await params;

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const existing = await db.reportSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Schedulazione non trovata.' }, { status: 404 });
    }

    const { name, emails, startDate, frequency, freqDetails, boardTypes, clientProject, active } = body;

    const updateData: Prisma.ReportScheduleUpdateInput = {};

    if (name !== undefined) updateData.name = name;
    if (emails !== undefined) updateData.emails = emails;
    if (boardTypes !== undefined) updateData.boardTypes = boardTypes;
    if (clientProject !== undefined) updateData.clientProject = clientProject;
    
    if (active !== undefined) {
      updateData.active = active;
    }

    // Handle rescheduling logic
    const dateChanged = startDate !== undefined && new Date(startDate).getTime() !== new Date(existing.startDate).getTime();
    const freqChanged = frequency !== undefined && frequency !== existing.frequency;
    
    if (freqDetails !== undefined) {
      const detailsStr = freqDetails ? JSON.stringify(freqDetails) : null;
      updateData.freqDetails = detailsStr;
    }

    const activeChanged = active !== undefined && active !== existing.active;

    if (dateChanged || freqChanged || freqDetails !== undefined || activeChanged) {
      const targetStartDate = startDate !== undefined ? new Date(startDate) : existing.startDate;
      const targetFrequency = frequency !== undefined ? frequency : existing.frequency;
      const targetActive = active !== undefined ? active : existing.active;

      if (targetActive) {
        // Recalculate nextRun
        updateData.nextRun = calculateNextRun(
          targetStartDate,
          targetFrequency,
          freqDetails !== undefined ? (freqDetails ? JSON.stringify(freqDetails) : null) : existing.freqDetails,
          new Date()
        );
      } else {
        // If suspended, unset nextRun
        updateData.nextRun = null;
      }
    }

    if (startDate !== undefined) {
      updateData.startDate = new Date(startDate);
    }
    if (frequency !== undefined) {
      updateData.frequency = frequency;
    }

    const updated = await db.reportSchedule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ schedule: updated });
  } catch (error) {
    console.error('[API Schedules PATCH]', error);
    return NextResponse.json({ error: 'Errore durante la modifica della schedulazione.' }, { status: 500 });
  }
}

// DELETE /api/admin/schedules/[id] — Delete a schedule (ADMIN only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userRole = request.headers.get('x-user-role');
  const { id } = await params;

  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
  }

  try {
    const existing = await db.reportSchedule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Schedulazione non trovata.' }, { status: 404 });
    }

    await db.reportSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Schedules DELETE]', error);
    return NextResponse.json({ error: 'Errore durante la cancellazione della schedulazione.' }, { status: 500 });
  }
}
