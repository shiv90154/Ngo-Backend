const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateDonationReceipt = async ({ donorName, email, amount, purpose, date, receiptNumber }) => {
  const receiptDir = path.join(__dirname, '../uploads/receipts');
  if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });

  const fileName = `receipt_${receiptNumber}.pdf`;
  const filePath = path.join(receiptDir, fileName);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a237e')
     .text('Samraddh Bharat Foundation', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').fillColor('#666')
     .text('Donation Receipt', { align: 'center' });
  doc.moveDown(1);

  // Horizontal line
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
  doc.moveDown(0.5);

  // Receipt Number and Date
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#333')
     .text(`Receipt No: ${receiptNumber}`, { continued: true })
     .font('Helvetica').fillColor('#555')
     .text(`   Date: ${new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, { align: 'right' });
  doc.moveDown(1);

  // Donor Info
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a237e').text('Donor Details:');
  doc.fontSize(11).font('Helvetica').fillColor('#444')
     .text(`Name: ${donorName || 'Anonymous'}`)
     .text(`Email: ${email || 'N/A'}`)
     .text(`Amount: ₹${amount.toLocaleString('en-IN')}`)
     .text(`Purpose: ${purpose || 'General Donation'}`)
     .text(`Payment Mode: ${date ? 'Offline' : 'Online'}`);  // adjust based on type passed

  doc.moveDown(1.5);
  doc.fontSize(10).fillColor('#888').text('Thank you for your generous contribution!', { align: 'center' });
  doc.text('This receipt is computer-generated and does not require a signature.', { align: 'center' });

  // Footer
  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
  doc.fontSize(8).fillColor('#aaa').text('Samraddh Bharat Foundation – SBF NGO', { align: 'center' });

  doc.end();
  await new Promise(resolve => stream.on('finish', resolve));

  return `/uploads/receipts/${fileName}`;
};

module.exports = { generateDonationReceipt };