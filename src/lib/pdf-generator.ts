import PDFDocument from 'pdfkit';

interface Subactivity {
  title: string;
  description?: string | null;
  status: string;
  progressNotes?: string | null;
  completedAt?: Date | null;
  responsible?: {
    name: string;
  } | null;
}

interface Activity {
  title: string;
  description?: string | null;
  clientProject?: string | null;
  startDate?: Date | null;
  targetCompleteDate?: Date | null;
  status: string;
  boardType: string;
  subactivities: Subactivity[];
}

export function generateActivitiesPdf(activities: Activity[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF in Landscape layout for better table columns mapping
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Page dimensions for Landscape A4: 841.89 x 595.28
      const pageWidth = 841.89;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2); // 761.89

      // Primary colors matching Logistica Uno palette
      const primaryColor = '#004B97';
      const secondaryColor = '#11BCEC';
      const darkColor = '#1A202C';
      const lightBg = '#F7FAFC';
      const borderColor = '#E2E8F0';

      // --- Header ---
      doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
      doc.y = 30;

      // Force cursor reset to default margin
      doc.x = margin;

      doc.fillColor(primaryColor)
         .font('Helvetica-Bold')
         .fontSize(22)
         .text('REPORT STATO AVANZAMENTO ATTIVITÀ IT', { align: 'left' });

      doc.fillColor(darkColor)
         .font('Helvetica')
         .fontSize(9)
         .text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, { align: 'left' })
         .moveDown(2);

      if (activities.length === 0) {
        doc.fillColor('#718096')
           .font('Helvetica-Oblique')
           .fontSize(12)
           .text('Nessuna attività di sviluppo trovata con i filtri selezionati.', { align: 'center' });
        doc.end();
        return;
      }

      // Helper to draw progress bar
      const drawProgressBar = (x: number, y: number, width: number, height: number, progress: number) => {
        doc.save()
           .fillColor(borderColor)
           .rect(x, y, width, height)
           .fill();
        
        if (progress > 0) {
          const fillWidth = (progress / 100) * width;
          doc.fillColor(progress === 100 ? '#10B981' : secondaryColor)
             .rect(x, y, fillWidth, height)
             .fill();
        }
        doc.restore();
      };

      // Helper to calculate progress
      const calculateProgress = (activity: Activity) => {
        const total = activity.subactivities.length;
        if (total === 0) return activity.status === 'CONCLUSO' ? 100 : 0;
        const completed = activity.subactivities.filter(s => s.status === 'COMPLETATA').length;
        return Math.round((completed / total) * 100);
      };

      activities.forEach((activity, index) => {
        // Reset horizontal cursor to avoid side shifting from previous tables
        doc.x = margin;

        // Prevent page breaks inside activity blocks
        if (doc.y > 420) {
          doc.addPage();
          doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
          doc.y = 30;
          doc.x = margin;
        }

        const progress = calculateProgress(activity);

        // Header section of the Card
        doc.fillColor(primaryColor)
           .font('Helvetica-Bold')
           .fontSize(13)
           .text(`${activity.title}`, { underline: false });

        doc.fillColor('#718096')
           .font('Helvetica-Bold')
           .fontSize(9)
           .text(`Tipologia: ${activity.boardType} | Cliente: ${activity.clientProject || 'N/D'}`);

        doc.font('Helvetica')
           .text(`Inizio: ${activity.startDate ? new Date(activity.startDate).toLocaleDateString('it-IT') : 'N/D'} | Fine Prevista: ${activity.targetCompleteDate ? new Date(activity.targetCompleteDate).toLocaleDateString('it-IT') : 'N/D'}`);

        doc.moveDown(0.4);

        if (activity.description) {
          doc.fillColor(darkColor)
             .font('Helvetica-Oblique')
             .fontSize(9.5)
             .text(`Descrizione: ${activity.description}`, { width: contentWidth })
             .moveDown(0.6);
        }

        // Progress Bar (aligned to the left, using full width spacing)
        const barY = doc.y;
        doc.fillColor(darkColor)
           .font('Helvetica-Bold')
           .fontSize(9.5)
           .text(`Avanzamento Progetto: ${progress}%`);
        
        drawProgressBar(margin + 160, barY - 1, 150, 10, progress);
        
        // Spacing after progress bar line
        doc.y = barY + 18;
        doc.x = margin;

        // Subactivities table-like listing
        if (activity.subactivities.length > 0) {
          doc.moveDown(0.5);
          doc.fillColor(primaryColor)
             .font('Helvetica-Bold')
             .fontSize(9.5)
             .text('Sotto-attività di dettaglio:', { underline: true })
             .moveDown(0.4);

          // Draw table header
          const startX = margin;
          let currentY = doc.y;

          doc.save();
          doc.rect(startX, currentY, contentWidth, 18).fill('#E2E8F0');
          doc.fillColor(darkColor)
             .font('Helvetica-Bold')
             .fontSize(8.5);
          
          doc.text('Attività di Dettaglio', startX + 10, currentY + 4, { width: 350 });
          doc.text('Stato', startX + 380, currentY + 4, { width: 100 });
          doc.text('Assegnato a', startX + 500, currentY + 4, { width: 240 });
          doc.restore();

          currentY += 18;
          doc.y = currentY;
          doc.x = margin;

          activity.subactivities.forEach((sub) => {
            // Page check for subactivities
            if (doc.y > 510) {
              doc.addPage();
              doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
              doc.y = 30;
              doc.x = margin;
              currentY = doc.y;

              // Re-draw header on new page
              doc.save();
              doc.rect(startX, currentY, contentWidth, 18).fill('#E2E8F0');
              doc.fillColor(darkColor)
                 .font('Helvetica-Bold')
                 .fontSize(8.5);
              
              doc.text('Attività di Dettaglio', startX + 10, currentY + 4, { width: 350 });
              doc.text('Stato', startX + 380, currentY + 4, { width: 100 });
              doc.text('Assegnato a', startX + 500, currentY + 4, { width: 240 });
              doc.restore();
              currentY += 18;
              doc.y = currentY;
              doc.x = margin;
            }

            doc.save();
            doc.rect(startX, currentY, contentWidth, 18).fill(lightBg);
            doc.fillColor(darkColor)
               .font('Helvetica')
               .fontSize(8.5);

            // Status labels
            let statusText = 'Da Fare';
            let statusColor = '#E53E3E';
            if (sub.status === 'IN_CORSO') {
              statusText = 'In Corso';
              statusColor = '#3182CE';
            } else if (sub.status === 'COMPLETATA') {
              statusText = 'Completata';
              statusColor = '#38A169';
            }

            // Draw columns with specific horizontal alignment
            doc.text(sub.title, startX + 10, currentY + 4, { width: 350, ellipsis: true });
            
            doc.fillColor(statusColor).font('Helvetica-Bold');
            doc.text(statusText, startX + 380, currentY + 4, { width: 100 });
            
            doc.fillColor(darkColor).font('Helvetica');
            doc.text(sub.responsible?.name || 'Non Assegnato', startX + 500, currentY + 4, { width: 240, ellipsis: true });
            
            doc.restore();

            currentY += 18;
            doc.y = currentY;
            doc.x = margin;

            if (sub.progressNotes) {
              if (doc.y > 510) {
                doc.addPage();
                doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
                doc.y = 30;
                doc.x = margin;
                currentY = doc.y;
              }

              doc.save();
              doc.rect(startX, currentY, contentWidth, 14).fill('#FAFBFD');
              doc.fillColor('#718096')
                 .font('Helvetica-Oblique')
                 .fontSize(8);
              doc.text(`   Note avanzamento: ${sub.progressNotes}`, startX + 15, currentY + 3, { width: contentWidth - 30, ellipsis: true });
              doc.restore();

              currentY += 14;
              doc.y = currentY;
              doc.x = margin;
            }
          });
        }

        // Space between cards
        doc.y += 15;
        doc.x = margin;

        // Divider line
        if (index < activities.length - 1) {
          doc.strokeColor(borderColor)
             .lineWidth(1)
             .moveTo(margin, doc.y)
             .lineTo(pageWidth - margin, doc.y)
             .stroke();
          doc.y += 15;
          doc.x = margin;
        }
      });

      // --- Footer (Landscape) ---
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#A0AEC0')
           .font('Helvetica')
           .fontSize(8);
        
        doc.text(
          `SISTEMA TICKET INTERNI - REPORT ATTIVITÀ IT // Pagina ${i + 1} di ${pages.count}`,
          margin,
          550, // Positioned near the bottom of landscape page (595 height)
          { align: 'center', width: contentWidth }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
