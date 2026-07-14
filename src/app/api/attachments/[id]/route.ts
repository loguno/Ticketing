import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  try {
    const attachment = await db.attachment.findUnique({
      where: { id },
      include: {
        ticket: true,
        message: {
          include: {
            ticket: true,
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Allegato non trovato.' }, { status: 404 });
    }

    // Access control: STANDARD users can only view attachments belonging to their own tickets
    if (userRole === 'STANDARD') {
      const ticket = attachment.ticket || attachment.message?.ticket;
      if (!ticket) {
        return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
      }
      
      // Get standard user's email to compare with contact if needed
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const isCreator = ticket.creatorId === userId;
      const isContact = user && ticket.contact.toLowerCase() === user.email.toLowerCase();

      if (!isCreator && !isContact) {
        return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
      }
    }

    // Verify file exists on disk
    let fileExists = fs.existsSync(attachment.filePath);
    let finalPath = attachment.filePath;

    if (!fileExists) {
      // Normalize slashes for cross-platform compatibility
      const normalizedPath = attachment.filePath.replace(/\\/g, '/');
      if (fs.existsSync(normalizedPath)) {
        fileExists = true;
        finalPath = normalizedPath;
      } else {
        const backslashPath = attachment.filePath.replace(/\//g, '\\');
        if (fs.existsSync(backslashPath)) {
          fileExists = true;
          finalPath = backslashPath;
        }
      }
    }

    if (!fileExists) {
      return NextResponse.json({ error: 'File fisico non trovato sul server.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(finalPath);
    
    // Set headers for inline preview or download
    const headers = new Headers();
    headers.set('Content-Type', attachment.fileType || 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.filename)}"`);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[API Attachments] Error fetching attachment:', error);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}
