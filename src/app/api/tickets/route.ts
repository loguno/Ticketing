import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateTicketNumber } from '@/lib/ticket-utils';
import fs from 'fs';
import path from 'path';
import { TicketCategory, TicketStatus, TicketPriority } from '@prisma/client';

const ATTACHMENTS_DIR = process.env.VERCEL
  ? '/tmp/attachments'
  : (process.env.ATTACHMENTS_DIR || './attachments');

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const isSuggestion = searchParams.get('isSuggestion');

  try {
    const andConditions: import('@prisma/client').Prisma.TicketWhereInput[] = [];

    // Access control: STANDARD users can only see their own tickets
    if (userRole === 'STANDARD') {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      
      andConditions.push({
        OR: [
          { creatorId: userId },
          { contact: user?.email || '' },
        ],
      });
    }

    if (status) {
      andConditions.push({ status: status as TicketStatus });
    }
    if (priority) {
      andConditions.push({ priority: priority as TicketPriority });
    }
    if (category) {
      andConditions.push({ category: category as TicketCategory });
    }
    if (isSuggestion === 'true') {
      andConditions.push({ isSuggestion: true });
    } else if (isSuggestion === 'false') {
      andConditions.push({ isSuggestion: false });
    }
    if (search) {
      andConditions.push({
        OR: [
          { ticketNumber: { contains: search } },
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const tickets = await db.ticket.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        creator: {
          select: { name: true, email: true },
        },
        operator: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('[API Tickets GET] Error listing tickets:', error);
    return NextResponse.json({ error: 'Errore durante la ricerca dei ticket.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as TicketCategory;
    const customContact = formData.get('contact') as string;

    if (!title || !description || !category) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti: oggetto, descrizione o categoria.' }, { status: 400 });
    }

    // Retrieve creator email
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const contact = customContact || user?.email || '';

    // Generate serial number TKT-YYYY-XXXXX
    const ticketNumber = await generateTicketNumber();

    // Verify attachments directory exists
    try {
      if (!fs.existsSync(ATTACHMENTS_DIR)) {
        fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn(`Could not create attachments directory ${ATTACHMENTS_DIR}:`, e);
    }

    // Process files and check format and size limitations
    const files = formData.getAll('attachments') as File[];
    const processedFiles: { filename: string; filePath: string; fileType: string; fileSize: number }[] = [];

    for (const file of files) {
      if (!file || file.size === 0 || !file.name) continue;

      const ext = path.extname(file.name).toLowerCase();
      if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.pdf') {
        return NextResponse.json({
          error: `Formato file non valido per "${file.name}". Sono supportati solo file JPG e PDF.`,
        }, { status: 400 });
      }

      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        return NextResponse.json({
          error: `Il file "${file.name}" supera la dimensione massima consentita di 10MB.`,
        }, { status: 400 });
      }

      // Overwrite strategy: save with exact original filename
      const filename = file.name;
      const filePath = path.join(ATTACHMENTS_DIR, filename).replace(/\\/g, '/');
      const buffer = Buffer.from(await file.arrayBuffer());

      fs.writeFileSync(filePath, buffer);

      processedFiles.push({
        filename,
        filePath,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });
    }

    // Create ticket in database
    const ticket = await db.ticket.create({
      data: {
        ticketNumber,
        title,
        description,
        category,
        contact,
        status: TicketStatus.NUOVO,
        priority: TicketPriority.BASSA,
        creatorId: userId,
        attachments: {
          create: processedFiles,
        },
      },
      include: {
        attachments: true,
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[API Tickets POST] Error creating ticket:', error);
    return NextResponse.json({ 
      error: `Errore interno del server: ${errorMsg}`,
      stack: errorStack 
    }, { status: 500 });
  }
}
