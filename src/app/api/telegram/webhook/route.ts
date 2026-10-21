import { NextResponse } from 'next/server';
import { telegramClient, TelegramUpdate } from '@/lib/telegram-client';
import { transcribeAudio } from '@/lib/audio-transcriber';
import { parseTicketFromText } from '@/lib/ticket-parser';
import { db } from '@/lib/db';
import { generateTicketNumber } from '@/lib/ticket-utils';
import { TicketOrigin, TicketStatus } from '@prisma/client';

export async function POST(request: Request) {
  // 1. Verify Secret Token (if configured)
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');

  if (webhookSecret && webhookSecret !== 'dev_telegram_webhook_secret') {
    if (headerSecret !== webhookSecret) {
      console.warn('[Telegram Webhook] Token segreto non valido o non corrispondente.');
      return NextResponse.json({ error: 'Non autorizzato: secret token non valido.' }, { status: 401 });
    }
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    const message = update?.message;

    if (!message) {
      // Non-message updates (inline queries, callback queries, etc.)
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const fromUser = message.from;
    const userId = fromUser ? String(fromUser.id) : '';

    // 2. Check Whitelist (if TELEGRAM_ALLOWED_USERS is set)
    const allowedUsersEnv = process.env.TELEGRAM_ALLOWED_USERS;
    if (allowedUsersEnv && allowedUsersEnv.trim() !== '') {
      const allowedList = allowedUsersEnv.split(',').map((id) => id.trim());
      if (!allowedList.includes(userId)) {
        await telegramClient.sendMessage(
          chatId,
          '⚠️ *Accesso Negato*: Il tuo account Telegram non è autorizzato alla creazione di ticket in questo sistema.'
        );
        return NextResponse.json({ ok: true, ignored: 'not_allowed' });
      }
    }

    // 3. Handle Commands (/start, /help)
    const textMsg = message.text?.trim() || '';
    if (textMsg === '/start' || textMsg === '/help') {
      const welcomeText =
        `👋 *Benvenuto nel Bot Ticket Logistica Uno!*\n\n` +
        `Puoi registrare rapidamente un ticket inviando una *nota vocale* 🎙️ oppure un *messaggio di testo* 💬.\n\n` +
        `📌 *Esempio Vocale o Testuale*:\n` +
        `_"Ciao, sono Mario Rossi. Segnalo un guasto al terminale barcode in corsia B del WMS, è urgente da sistemare entro stasera."_\n\n` +
        `Il motore AI estrarrà automaticamente:\n` +
        `• *Titolo sintetico*\n` +
        `• *Richiedente*\n` +
        `• *Priorità (Bassa, Media, Alta, Critica)*\n` +
        `• *Scadenza presunta*\n` +
        `• *Categoria (TMS, WMS, Amministrativo)*\n\n` +
        `Invia subito una nota vocale per provare!`;

      await telegramClient.sendMessage(chatId, welcomeText);
      return NextResponse.json({ ok: true });
    }

    let rawTicketText = '';
    let isVoice = false;

    // 4. Handle Voice Note or Audio File
    const voice = message.voice || message.audio;
    if (voice) {
      isVoice = true;
      await telegramClient.sendChatAction(chatId, 'record_voice');

      // Obtain file path from Telegram
      const fileInfo = await telegramClient.getFile(voice.file_id);
      if (!fileInfo || !fileInfo.file_path) {
        await telegramClient.sendMessage(chatId, '⚠️ Impossibile scaricare la nota vocale da Telegram. Riprova.');
        return NextResponse.json({ ok: false, error: 'download_failed' }, { status: 400 });
      }

      // Download audio buffer
      const audioBuffer = await telegramClient.downloadFile(fileInfo.file_path);
      if (!audioBuffer) {
        await telegramClient.sendMessage(chatId, '⚠️ Errore nel download del file audio.');
        return NextResponse.json({ ok: false, error: 'audio_buffer_empty' }, { status: 400 });
      }

      // Transcribe audio to Italian text (Whisper API / fallback)
      const transcriptionResult = await transcribeAudio(audioBuffer, `voice_${voice.file_id}.ogg`);
      if (!transcriptionResult.success || !transcriptionResult.text) {
        await telegramClient.sendMessage(
          chatId,
          `⚠️ *Trascrizione Fallita*: Impossibile convertire l'audio in testo.\n_${transcriptionResult.error || 'Errore sconosciuto'}_`
        );
        return NextResponse.json({ ok: false, error: 'transcription_failed' }, { status: 400 });
      }

      rawTicketText = transcriptionResult.text;
    } else if (textMsg) {
      rawTicketText = textMsg;
    } else {
      // Ignored media (photo, sticker, document without audio)
      await telegramClient.sendMessage(
        chatId,
        '💡 Invia una *nota vocale* 🎙️ o un *messaggio di testo* 💬 per registrare il ticket.'
      );
      return NextResponse.json({ ok: true });
    }

    // 5. AI / NLP Parsing of structured ticket fields
    const parsedTicket = parseTicketFromText(rawTicketText, fromUser);

    // 6. Save ticket to Database (aligned with Step 1 contracts)
    const ticketNumber = await generateTicketNumber();

    // Match requester email if known user exists
    let creatorId: string | null = null;
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { name: { contains: parsedTicket.richiedente } },
          { email: { contains: parsedTicket.richiedente } },
        ],
      },
      select: { id: true, email: true },
    });

    if (existingUser) {
      creatorId = existingUser.id;
    }

    const createdTicket = await db.ticket.create({
      data: {
        ticketNumber,
        title: parsedTicket.titolo,
        description: parsedTicket.descrizione,
        status: TicketStatus.NUOVO,
        priority: parsedTicket.priorita,
        category: parsedTicket.categoria,
        origin: TicketOrigin.PORTALE,
        contact: parsedTicket.richiedente,
        targetCloseDate: parsedTicket.scadenza ? new Date(parsedTicket.scadenza) : null,
        creatorId,
      },
    });

    // 7. Send confirmation response to user on Telegram
    const originLabel = isVoice ? '🎙️ Nota Vocale Telegram' : '💬 Messaggio Telegram';
    const scadenzaStr = createdTicket.targetCloseDate
      ? createdTicket.targetCloseDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Non specificata';

    const confirmationMessage =
      `✅ *Ticket Registrato con Successo!*\n\n` +
      `🎫 *Codice Ticket:* \`${createdTicket.ticketNumber}\`\n` +
      `📌 *Oggetto:* *${createdTicket.title}*\n` +
      `👤 *Richiedente:* ${createdTicket.contact}\n` +
      `⚡ *Priorità:* \`${createdTicket.priority}\`\n` +
      `📁 *Categoria:* \`${createdTicket.category}\`\n` +
      `📅 *Scadenza:* ${scadenzaStr}\n` +
      `📡 *Origine:* ${originLabel}\n\n` +
      `📝 *Testo Elaborato:*\n_"${createdTicket.description}"_\n\n` +
      `Il ticket è ora visibile nel Portale ed è subito accessibile anche all'Assistente AI.`;

    await telegramClient.sendMessage(chatId, confirmationMessage);

    return NextResponse.json({
      ok: true,
      success: true,
      ticket: {
        id: createdTicket.id,
        ticketNumber: createdTicket.ticketNumber,
        title: createdTicket.title,
        priority: createdTicket.priority,
        contact: createdTicket.contact,
        targetCloseDate: createdTicket.targetCloseDate,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[API Telegram Webhook POST] Errore:', error);
    return NextResponse.json(
      { ok: false, error: `Errore elaborazione webhook telegram: ${errorMsg}` },
      { status: 500 }
    );
  }
}
