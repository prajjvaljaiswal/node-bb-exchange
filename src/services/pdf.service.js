const PDFDocument = require('pdfkit');

function createLetterhead(doc, bankName, reportTitle, date) {
  // Header bar
  doc.rect(0, 0, doc.page.width, 80).fill('#B91C1C');
  doc.fontSize(20).fillColor('#fff').font('Helvetica-Bold')
    .text('Bloodexchange.in', 40, 20);
  doc.fontSize(11).fillColor('rgba(255,255,255,0.8)').font('Helvetica')
    .text('India\'s Paperless Blood Exchange Network', 40, 46);

  doc.fillColor('#333').fontSize(14).font('Helvetica-Bold')
    .text(reportTitle, 40, 100);
  doc.fontSize(10).fillColor('#666').font('Helvetica')
    .text(`Blood Bank: ${bankName || 'All Banks'}`, 40, 120)
    .text(`Generated: ${date || new Date().toLocaleDateString('en-IN')}`, 40, 136);

  doc.moveTo(40, 155).lineTo(doc.page.width - 40, 155).strokeColor('#ddd').stroke();
  doc.y = 170;
}

function createBuffer(fn) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    fn(doc);
    doc.end();
  });
}

async function generateDonationsReport(donations, options = {}) {
  return createBuffer((doc) => {
    createLetterhead(doc, options.bloodBankId, 'Donations Report', options.from);

    doc.fontSize(9).font('Helvetica');

    // Table header
    const headers = ['Date', 'Donor', 'Blood Group', 'Patient', 'Card ID', 'Cycle'];
    const colWidths = [70, 100, 70, 100, 100, 40];
    let x = 40;

    doc.font('Helvetica-Bold');
    headers.forEach((h, i) => { doc.text(h, x, doc.y, { width: colWidths[i] }); x += colWidths[i]; });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica');
    for (const d of donations) {
      if (doc.y > 700) { doc.addPage(); }
      x = 40;
      const row = [
        new Date(d.donationDate).toLocaleDateString('en-IN'),
        d.donor?.name || '-',
        d.donorCard?.bloodGroup || '-',
        d.patient?.name || '-',
        d.donorCard?.donorCardDisplayId || '-',
        d.cycleDetected ? 'Yes' : 'No',
      ];
      const startY = doc.y;
      row.forEach((cell, i) => {
        doc.text(String(cell), x, startY, { width: colWidths[i] });
        x += colWidths[i];
      });
      doc.y = startY + 16;
    }

    // Footer
    doc.fontSize(8).fillColor('#999')
      .text(`Total: ${donations.length} donations`, 40, doc.page.height - 50)
      .text('Bloodexchange.in — Regulated under Indian Blood Banking Guidelines', 40, doc.page.height - 38);
  });
}

async function generateBalanceSheetReport(entries, type, options = {}) {
  return createBuffer((doc) => {
    createLetterhead(doc, options.bloodBankId, `Balance Sheet — ${type === 'receivables' ? 'Receivables' : 'Deliverables'}`, options.date);

    doc.fontSize(9).font('Helvetica');

    const headers = type === 'receivables'
      ? ['Debtor Bank', 'Blood Group', 'Units', 'Donor Card', 'Date']
      : ['Creditor Bank', 'Blood Group', 'Units', 'Donor Card', 'Date'];

    const colWidths = [150, 70, 50, 120, 90];
    let x = 40;

    doc.font('Helvetica-Bold');
    headers.forEach((h, i) => { doc.text(h, x, doc.y, { width: colWidths[i] }); x += colWidths[i]; });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica');
    for (const e of entries) {
      if (doc.y > 700) { doc.addPage(); }
      x = 40;
      const bankName = type === 'receivables' ? e.debtorBank?.name : e.creditorBank?.name;
      const row = [
        bankName || '-',
        e.bloodGroup,
        String(e.units),
        e.donorCard?.donorCardDisplayId || '-',
        new Date(e.createdAt).toLocaleDateString('en-IN'),
      ];
      const startY = doc.y;
      row.forEach((cell, i) => {
        doc.text(String(cell), x, startY, { width: colWidths[i] });
        x += colWidths[i];
      });
      doc.y = startY + 16;
    }

    doc.fontSize(8).fillColor('#999')
      .text(`Total entries: ${entries.length}`, 40, doc.page.height - 50)
      .text('Bloodexchange.in — Regulated under Indian Blood Banking Guidelines', 40, doc.page.height - 38);
  });
}

module.exports = { generateDonationsReport, generateBalanceSheetReport };
