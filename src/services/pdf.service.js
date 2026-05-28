const PDFDocument = require('pdfkit');

const BLOOD_DISPLAY = {
  'A_POS': 'A+', 'A_NEG': 'A-', 'B_POS': 'B+', 'B_NEG': 'B-',
  'AB_POS': 'AB+', 'AB_NEG': 'AB-', 'O_POS': 'O+', 'O_NEG': 'O-',
};

const BLOOD_COMPATIBILITY = {
  'O_NEG':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O_POS':  ['O+', 'A+', 'B+', 'AB+'],
  'A_NEG':  ['A-', 'A+', 'AB-', 'AB+'],
  'A_POS':  ['A+', 'AB+'],
  'B_NEG':  ['B-', 'B+', 'AB-', 'AB+'],
  'B_POS':  ['B+', 'AB+'],
  'AB_NEG': ['AB-', 'AB+'],
  'AB_POS': ['AB+'],
};

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

async function generateDateWiseDonationsReport(donations, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const dateLabel = options.date
      ? new Date(options.date).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');

    // Header bar
    doc.rect(0, 0, doc.page.width, 70).fill('#B91C1C');
    doc.fontSize(18).fillColor('#fff').font('Helvetica-Bold')
      .text('Bloodexchange.in', 30, 16);
    doc.fontSize(10).fillColor('rgba(255,255,255,0.85)').font('Helvetica')
      .text("India's Paperless Blood Exchange Network", 30, 40);

    doc.fillColor('#111').fontSize(13).font('Helvetica-Bold')
      .text('Date-Wise Donations Report', 30, 85);
    doc.fontSize(9).fillColor('#555').font('Helvetica')
      .text(`Blood Bank: ${options.bankName || 'All Banks'}`, 30, 103)
      .text(`Date: ${dateLabel}`, 30, 117)
      .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 300, 103);

    doc.moveTo(30, 132).lineTo(doc.page.width - 30, 132).strokeColor('#ddd').stroke();

    const tableTop = 143;
    // Column definitions — total usable width: 841 - 60 = 781
    const cols = [
      { label: 'Date of\nDonation', w: 60 },
      { label: 'Name of\nDonor', w: 98 },
      { label: 'Donor ID', w: 78 },
      { label: 'Contact', w: 80 },
      { label: 'Donor Card ID', w: 92 },
      { label: 'Voluntary', w: 46 },
      { label: 'Replacement', w: 56 },
      { label: 'Blood\nGroup', w: 46 },
      { label: 'Can Be Given To', w: 143 },
      { label: 'Remarks', w: 82 },
    ];

    // Header row background
    doc.rect(30, tableTop - 4, doc.page.width - 60, 28).fill('#f5f0eb');

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111');
    let hx = 30;
    cols.forEach(col => {
      doc.text(col.label, hx + 2, tableTop, { width: col.w - 4, align: 'left' });
      hx += col.w;
    });

    // Header bottom line
    const headerBottom = tableTop + 22;
    doc.moveTo(30, headerBottom).lineTo(doc.page.width - 30, headerBottom).strokeColor('#ccc').stroke();

    doc.font('Helvetica').fontSize(7.5).fillColor('#222');
    let rowY = headerBottom + 4;

    for (let i = 0; i < donations.length; i++) {
      const d = donations[i];
      if (rowY > 550) {
        doc.addPage();
        rowY = 30;
      }

      const bg = i % 2 === 0 ? '#ffffff' : '#faf8f5';
      doc.rect(30, rowY - 2, doc.page.width - 60, 18).fill(bg);

      const bloodGroup = d.donorCard?.bloodGroup || d.donor?.bloodGroup || '';
      const displayGroup = BLOOD_DISPLAY[bloodGroup] || bloodGroup;
      const canGiveTo = (BLOOD_COMPATIBILITY[bloodGroup] || []).join(', ');
      const donorDisplayId = d.donor?.id ? `D-${d.donor.id.slice(0, 8).toUpperCase()}` : '-';

      const row = [
        new Date(d.donationDate).toLocaleDateString('en-IN'),
        d.donor?.name || '-',
        donorDisplayId,
        d.donor?.mobile || '-',
        d.donorCard?.donorCardDisplayId || '-',
        d.donationType === 'VOLUNTARY' ? 'Yes' : '-',
        d.donationType === 'REPLACEMENT' ? 'Yes' : '-',
        displayGroup || '-',
        canGiveTo || '-',
        d.remarks || '-',
      ];

      doc.fillColor('#222');
      let rx = 30;
      row.forEach((cell, ci) => {
        doc.text(String(cell), rx + 2, rowY, { width: cols[ci].w - 4, lineBreak: false });
        rx += cols[ci].w;
      });
      rowY += 18;
    }

    // Total row
    rowY += 4;
    doc.moveTo(30, rowY).lineTo(doc.page.width - 30, rowY).strokeColor('#ccc').stroke();
    rowY += 6;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#B91C1C')
      .text(`Total Donations: ${donations.length}`, 30, rowY);

    // Footer
    const footerY = doc.page.height - 30;
    doc.font('Helvetica').fontSize(7).fillColor('#999')
      .text('Bloodexchange.in — Regulated under Indian Blood Banking Guidelines', 30, footerY, { align: 'center', width: doc.page.width - 60 });

    doc.end();
  });
}

module.exports = { generateDonationsReport, generateBalanceSheetReport, generateDateWiseDonationsReport };
