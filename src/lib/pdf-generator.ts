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
      // Create PDF in Landscape layout
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

      // Split activities into Active and Completed
      const activeActivities = activities.filter(a => a.status !== 'CONCLUSO');
      const completedActivities = activities.filter(a => a.status === 'CONCLUSO');

      // ==========================================
      // PAGE 1: SUMMARY DASHBOARD (RIEPILOGO)
      // ==========================================
      doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
      doc.y = 30;
      doc.x = margin;

      doc.fillColor(primaryColor)
         .font('Helvetica-Bold')
         .fontSize(22)
         .text('REPORT ATTIVITÀ IT - RIEPILOGO GENERALE', { align: 'left' });

      doc.fillColor(darkColor)
         .font('Helvetica')
         .fontSize(9)
         .text(`Generato il: ${new Date().toLocaleDateString('it-IT')} // Riepilogo sintetico di tutte le attività`, { align: 'left' })
         .moveDown(1.5);

      if (activities.length === 0) {
        doc.fillColor('#718096')
           .font('Helvetica-Oblique')
           .fontSize(12)
           .text('Nessuna attività di sviluppo trovata con i filtri selezionati.', { align: 'center' });
        doc.end();
        return;
      }

      // Draw Summary Table Header
      let currentY = doc.y;
      const startX = margin;

      doc.save();
      doc.rect(startX, currentY, contentWidth, 20).fill(primaryColor);
      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(8.5);
      
      doc.text('Attività di Sviluppo', startX + 10, currentY + 6, { width: 230 });
      doc.text('Tipologia', startX + 250, currentY + 6, { width: 90 });
      doc.text('Cliente / Progetto', startX + 350, currentY + 6, { width: 130 });
      doc.text('Scadenza', startX + 490, currentY + 6, { width: 70 });
      doc.text('Stato', startX + 570, currentY + 6, { width: 60 });
      doc.text('Avanzamento', startX + 640, currentY + 6, { width: 110 });
      doc.restore();

      currentY += 20;
      doc.y = currentY;

      // Function to check page breaks on summary page
      const checkSummaryPageBreak = (neededHeight: number) => {
        if (doc.y + neededHeight > 510) {
          doc.addPage();
          doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
          doc.y = 30;
          doc.x = margin;
          currentY = doc.y;

          // Re-draw Header on new page
          doc.save();
          doc.rect(startX, currentY, contentWidth, 20).fill(primaryColor);
          doc.fillColor('#FFFFFF')
             .font('Helvetica-Bold')
             .fontSize(8.5);
          
          doc.text('Attività di Sviluppo', startX + 10, currentY + 6, { width: 230 });
          doc.text('Tipologia', startX + 250, currentY + 6, { width: 90 });
          doc.text('Cliente / Progetto', startX + 350, currentY + 6, { width: 130 });
          doc.text('Scadenza', startX + 490, currentY + 6, { width: 70 });
          doc.text('Stato', startX + 570, currentY + 6, { width: 60 });
          doc.text('Avanzamento', startX + 640, currentY + 6, { width: 110 });
          doc.restore();
          currentY += 20;
          doc.y = currentY;
        }
      };

      // Helper to render activity row in summary table
      const renderSummaryRow = (activity: Activity, idx: number) => {
        const progress = calculateProgress(activity);
        
        checkSummaryPageBreak(20);

        doc.save();
        // Alternate rows background
        doc.rect(startX, currentY, contentWidth, 20).fill(idx % 2 === 0 ? lightBg : '#FFFFFF');
        doc.fillColor(darkColor)
           .font('Helvetica')
           .fontSize(8);

        // Map status translation
        const statusMap: Record<string, string> = {
          NUOVO: 'Nuovo',
          IN_LAVORAZIONE: 'In Corso',
          CONCLUSO: 'Concluso',
        };
        const statusText = statusMap[activity.status] || activity.status;

        doc.font('Helvetica-Bold').text(activity.title, startX + 10, currentY + 6, { width: 230, ellipsis: true });
        doc.font('Helvetica').text(activity.boardType, startX + 250, currentY + 6, { width: 90, ellipsis: true });
        doc.text(activity.clientProject || 'Non specificato', startX + 350, currentY + 6, { width: 130, ellipsis: true });
        doc.text(activity.targetCompleteDate ? new Date(activity.targetCompleteDate).toLocaleDateString('it-IT') : 'N/D', startX + 490, currentY + 6, { width: 70 });
        
        let stateCol = '#64748B';
        if (activity.status === 'NUOVO') stateCol = '#3182CE';
        if (activity.status === 'CONCLUSO') stateCol = '#38A169';
        doc.fillColor(stateCol).font('Helvetica-Bold');
        doc.text(statusText, startX + 570, currentY + 6, { width: 60 });

        // Draw small inline progress bar
        doc.fillColor(darkColor).font('Helvetica-Bold');
        doc.text(`${progress}%`, startX + 640, currentY + 6, { width: 30 });
        drawProgressBar(startX + 675, currentY + 6, 75, 7, progress);

        doc.restore();
        currentY += 20;
        doc.y = currentY;
        doc.x = margin;
      };

      // 1. Render Active Activities Section Header in table
      if (activeActivities.length > 0) {
        checkSummaryPageBreak(18);
        doc.save();
        doc.rect(startX, currentY, contentWidth, 18).fill('#EBF8FF');
        doc.fillColor('#2B6CB0')
           .font('Helvetica-Bold')
           .fontSize(8)
           .text('ATTIVITÀ IN CORSO', startX + 10, currentY + 5);
        doc.restore();
        currentY += 18;
        doc.y = currentY;
        
        activeActivities.forEach((activity, idx) => {
          renderSummaryRow(activity, idx);
        });
      }

      // 2. Render Completed Activities Section Header in table
      if (completedActivities.length > 0) {
        checkSummaryPageBreak(18);
        doc.save();
        doc.rect(startX, currentY, contentWidth, 18).fill('#E6FFFA');
        doc.fillColor('#234E52')
           .font('Helvetica-Bold')
           .fontSize(8)
           .text('ATTIVITÀ COMPLETATE DI RECENTE', startX + 10, currentY + 5);
        doc.restore();
        currentY += 18;
        doc.y = currentY;
        
        completedActivities.forEach((activity, idx) => {
          renderSummaryRow(activity, idx);
        });
      }

      // ==========================================
      // PAGES 2+: DETAILS FOR ACTIVE ACTIVITIES ONLY
      // ==========================================
      activeActivities.forEach((activity) => {
        // Always break page to start details on a new page
        doc.addPage();
        doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
        doc.y = 30;
        doc.x = margin;

        const progress = calculateProgress(activity);

        // Header Section of Detail Page
        doc.fillColor(primaryColor)
           .font('Helvetica-Bold')
           .fontSize(14)
           .text(`SCHEDA DETTAGLIO: ${activity.title}`, { underline: false })
           .moveDown(0.2);

        doc.fillColor('#718096')
           .font('Helvetica-Bold')
           .fontSize(9)
           .text(`Tipologia Attività: ${activity.boardType} | Cliente / Progetto: ${activity.clientProject || 'N/D'}`);

        doc.font('Helvetica')
           .text(`Inizio: ${activity.startDate ? new Date(activity.startDate).toLocaleDateString('it-IT') : 'N/D'} | Fine Prevista: ${activity.targetCompleteDate ? new Date(activity.targetCompleteDate).toLocaleDateString('it-IT') : 'N/D'}`);

        doc.moveDown(0.5);

        if (activity.description) {
          doc.fillColor(darkColor)
             .font('Helvetica-Oblique')
             .fontSize(9.5)
             .text(`Descrizione: ${activity.description}`, { width: contentWidth })
             .moveDown(0.6);
        }

        // Progress Bar
        const barY = doc.y;
        doc.fillColor(darkColor)
           .font('Helvetica-Bold')
           .fontSize(9.5)
           .text(`Avanzamento Progetto: ${progress}%`);
        
        drawProgressBar(margin + 160, barY - 1, 150, 10, progress);
        
        // Spacing after progress bar
        doc.y = barY + 22;
        doc.x = margin;

        // Subactivities table-like listing
        if (activity.subactivities.length > 0) {
          doc.fillColor(primaryColor)
             .font('Helvetica-Bold')
             .fontSize(9.5)
             .text('Sotto-attività di dettaglio:', { underline: true })
             .moveDown(0.4);

          // Draw table header
          let currentDetailY = doc.y;

          doc.save();
          doc.rect(startX, currentDetailY, contentWidth, 18).fill('#E2E8F0');
          doc.fillColor(darkColor)
             .font('Helvetica-Bold')
             .fontSize(8.5);
          
          doc.text('Attività di Dettaglio', startX + 10, currentDetailY + 4, { width: 350 });
          doc.text('Stato', startX + 380, currentDetailY + 4, { width: 100 });
          doc.text('Assegnato a', startX + 500, currentDetailY + 4, { width: 240 });
          doc.restore();

          currentDetailY += 18;
          doc.y = currentDetailY;
          doc.x = margin;

          activity.subactivities.forEach((sub) => {
            // Page break for detail subactivities
            if (doc.y > 510) {
              doc.addPage();
              doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
              doc.y = 30;
              doc.x = margin;
              currentDetailY = doc.y;

              // Re-draw header on new page
              doc.save();
              doc.rect(startX, currentDetailY, contentWidth, 18).fill('#E2E8F0');
              doc.fillColor(darkColor)
                 .font('Helvetica-Bold')
                 .fontSize(8.5);
              
              doc.text('Attività di Dettaglio', startX + 10, currentDetailY + 4, { width: 350 });
              doc.text('Stato', startX + 380, currentDetailY + 4, { width: 100 });
              doc.text('Assegnato a', startX + 500, currentDetailY + 4, { width: 240 });
              doc.restore();
              currentDetailY += 18;
              doc.y = currentDetailY;
              doc.x = margin;
            }

            doc.save();
            doc.rect(startX, currentDetailY, contentWidth, 18).fill(lightBg);
            doc.fillColor(darkColor)
               .font('Helvetica')
               .fontSize(8.5);

            // Status label colors
            let statusText = 'Da Fare';
            let statusColor = '#E53E3E';
            if (sub.status === 'IN_CORSO') {
              statusText = 'In Corso';
              statusColor = '#3182CE';
            } else if (sub.status === 'COMPLETATA') {
              statusText = 'Completata';
              statusColor = '#38A169';
            }

            doc.text(sub.title, startX + 10, currentDetailY + 4, { width: 350, ellipsis: true });
            
            doc.fillColor(statusColor).font('Helvetica-Bold');
            doc.text(statusText, startX + 380, currentDetailY + 4, { width: 100 });
            
            doc.fillColor(darkColor).font('Helvetica');
            doc.text(sub.responsible?.name || 'Non Assegnato', startX + 500, currentDetailY + 4, { width: 240, ellipsis: true });
            
            doc.restore();

            currentDetailY += 18;
            doc.y = currentDetailY;
            doc.x = margin;

            if (sub.progressNotes) {
              if (doc.y > 510) {
                doc.addPage();
                doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
                doc.y = 30;
                doc.x = margin;
                currentDetailY = doc.y;
              }

              doc.save();
              doc.rect(startX, currentDetailY, contentWidth, 14).fill('#FAFBFD');
              doc.fillColor('#718096')
                 .font('Helvetica-Oblique')
                 .fontSize(8);
              doc.text(`   Note avanzamento: ${sub.progressNotes}`, startX + 15, currentDetailY + 3, { width: contentWidth - 30, ellipsis: true });
              doc.restore();

              currentDetailY += 14;
              doc.y = currentDetailY;
              doc.x = margin;
            }
          });
        }
      });

      // ==========================================
      // SECTION: RECENTLY COMPLETED ACTIVITIES (AT THE END)
      // ==========================================
      if (completedActivities.length > 0) {
        doc.addPage();
        doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
        doc.y = 30;
        doc.x = margin;

        doc.fillColor(primaryColor)
           .font('Helvetica-Bold')
           .fontSize(16)
           .text('ATTIVITÀ COMPLETATE DI RECENTE', { align: 'left' });

        doc.fillColor(darkColor)
           .font('Helvetica')
           .fontSize(9)
           .text('Elenco storico delle attività completate con successo dal servizio IT', { align: 'left' })
           .moveDown(1.5);

        completedActivities.forEach((activity, idx) => {
          // Page check for completed items listing
          if (doc.y > 480) {
            doc.addPage();
            doc.rect(0, 0, pageWidth, 12).fill(primaryColor);
            doc.y = 30;
            doc.x = margin;
            
            doc.fillColor(primaryColor)
               .font('Helvetica-Bold')
               .fontSize(16)
               .text('ATTIVITÀ COMPLETATE DI RECENTE (Seguito)', { align: 'left' })
               .moveDown(1.5);
          }

          doc.save();
          // Compact visual presentation for completed activities
          doc.fillColor(darkColor)
             .font('Helvetica-Bold')
             .fontSize(11)
             .text(`${idx + 1}. ${activity.title}`);

          doc.fillColor('#718096')
             .font('Helvetica')
             .fontSize(8.5)
             .text(`Tipologia: ${activity.boardType} | Cliente / Progetto: ${activity.clientProject || 'N/D'} | Completata il: ${activity.targetCompleteDate ? new Date(activity.targetCompleteDate).toLocaleDateString('it-IT') : 'N/D'}`)
             .moveDown(0.2);

          if (activity.description) {
            doc.fillColor('#4A5568')
               .font('Helvetica-Oblique')
               .fontSize(9)
               .text(activity.description, { width: contentWidth })
               .moveDown(0.5);
          }
          
          doc.restore();

          // Horizontal separator line
          if (idx < completedActivities.length - 1) {
            doc.strokeColor(borderColor)
               .lineWidth(0.5)
               .moveTo(margin, doc.y)
               .lineTo(pageWidth - margin, doc.y)
               .stroke();
            doc.y += 10;
            doc.x = margin;
          }
        });
      }

      // --- Footer ---
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fillColor('#A0AEC0')
           .font('Helvetica')
           .fontSize(8);
        
        doc.text(
          `SISTEMA TICKET INTERNI - REPORT ATTIVITÀ IT // Pagina ${i + 1} di ${pages.count}`,
          margin,
          550,
          { align: 'center', width: contentWidth }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
