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
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Primary colors matching Logistica Uno palette
      const primaryColor = '#004B97';
      const secondaryColor = '#11BCEC';
      const darkColor = '#1A202C';
      const lightBg = '#F7FAFC';
      const borderColor = '#E2E8F0';

      // --- Header ---
      doc.rect(0, 0, 595, 12).fill(primaryColor);
      doc.y = 30;

      doc.fillColor(primaryColor)
         .font('Helvetica-Bold')
         .fontSize(22)
         .text('REPORT STATO AVANZAMENTO IT', { align: 'left' });

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
        // Background
        doc.save()
           .fillColor(borderColor)
           .rect(x, y, width, height)
           .fill();
        
        // Progress fill
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
        // Prevent page breaks inside activity blocks if possible
        if (doc.y > 600) {
          doc.addPage();
          doc.rect(0, 0, 595, 12).fill(primaryColor);
          doc.y = 30;
        }

        const progress = calculateProgress(activity);

        // Activity Card Container Header
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
             .text(`Descrizione: ${activity.description}`, { width: 515 })
             .moveDown(0.6);
        }

        // Progress Bar
        const barY = doc.y;
        doc.fillColor(darkColor)
           .font('Helvetica-Bold')
           .fontSize(9.5)
           .text(`Avanzamento Progetto: ${progress}%`);
        
        drawProgressBar(180, barY - 1, 150, 10, progress);
        doc.y += 18;

        // Subactivities table-like listing
        if (activity.subactivities.length > 0) {
          doc.fillColor(primaryColor)
             .font('Helvetica-Bold')
             .fontSize(9.5)
             .text('Sotto-attività di dettaglio:', { underline: true })
             .moveDown(0.4);

          // Draw table header
          const startX = 40;
          let currentY = doc.y;

          doc.save();
          doc.rect(startX, currentY, 515, 18).fill('#E2E8F0');
          doc.fillColor(darkColor)
             .font('Helvetica-Bold')
             .fontSize(8.5);
          
          doc.text('Attività di Dettaglio', startX + 10, currentY + 4, { width: 220 });
          doc.text('Stato', startX + 240, currentY + 4, { width: 90 });
          doc.text('Assegnato a', startX + 340, currentY + 4, { width: 160 });
          doc.restore();

          currentY += 18;
          doc.y = currentY;

          activity.subactivities.forEach((sub) => {
            // Page check for subactivities
            if (doc.y > 750) {
              doc.addPage();
              doc.rect(0, 0, 595, 12).fill(primaryColor);
              doc.y = 30;
              currentY = doc.y;

              // Re-draw header on new page
              doc.save();
              doc.rect(startX, currentY, 515, 18).fill('#E2E8F0');
              doc.fillColor(darkColor)
                 .font('Helvetica-Bold')
                 .fontSize(8.5);
              
              doc.text('Attività di Dettaglio', startX + 10, currentY + 4, { width: 220 });
              doc.text('Stato', startX + 240, currentY + 4, { width: 90 });
              doc.text('Assegnato a', startX + 340, currentY + 4, { width: 160 });
              doc.restore();
              currentY += 18;
              doc.y = currentY;
            }

            doc.save();
            // Alternate rows bg
            doc.rect(startX, currentY, 515, 18).fill(lightBg);
            doc.fillColor(darkColor)
               .font('Helvetica')
               .fontSize(8.5);

            // Status label colors
            let statusText = 'Da Fare';
            let statusColor = '#E53E3E'; // Red
            if (sub.status === 'IN_CORSO') {
              statusText = 'In Corso';
              statusColor = '#3182CE'; // Blue
            } else if (sub.status === 'COMPLETATA') {
              statusText = 'Completata';
              statusColor = '#38A169'; // Green
            }

            doc.text(sub.title, startX + 10, currentY + 4, { width: 220, ellipsis: true });
            
            doc.fillColor(statusColor).font('Helvetica-Bold');
            doc.text(statusText, startX + 240, currentY + 4, { width: 90 });
            
            doc.fillColor(darkColor).font('Helvetica');
            doc.text(sub.responsible?.name || 'Non Assegnato', startX + 340, currentY + 4, { width: 160, ellipsis: true });
            
            doc.restore();

            currentY += 18;
            doc.y = currentY;

            if (sub.progressNotes) {
              // Subactivity notes row
              if (doc.y > 755) {
                doc.addPage();
                doc.rect(0, 0, 595, 12).fill(primaryColor);
                doc.y = 30;
                currentY = doc.y;
              }

              doc.save();
              doc.rect(startX, currentY, 515, 14).fill('#FAFBFD');
              doc.fillColor('#718096')
                 .font('Helvetica-Oblique')
                 .fontSize(8);
              doc.text(`   Note avanzamento: ${sub.progressNotes}`, startX + 15, currentY + 3, { width: 490, ellipsis: true });
              doc.restore();

              currentY += 14;
              doc.y = currentY;
            }
          });
        }

        doc.y += 20; // spacing between activity cards
        doc.moveDown(1.5);

        // Divider line
        if (index < activities.length - 1) {
          doc.strokeColor(borderColor)
             .lineWidth(1)
             .moveTo(40, doc.y)
             .lineTo(555, doc.y)
             .stroke();
          doc.y += 15;
        }
      });

      // --- Footer ---
      // Add page numbers at the end
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#A0AEC0')
           .font('Helvetica')
           .fontSize(8);
        
        doc.text(
          `SISTEMA TICKET INTERNI - REPORT ATTIVITÀ // Pagina ${i + 1} di ${pages.count}`,
          40,
          800,
          { align: 'center', width: 515 }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
