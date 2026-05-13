const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const generateCertificate = async ({
  recipientName,
  certificateType,
  issueDate,
  customMessage,
  state,
  district,
  idNumber,
  photoPath,
}) => {
  const certDir = path.join(__dirname, "../uploads/certificates");
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

  const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const fileName = `cert_${Date.now()}.pdf`;
  const filePath = path.join(certDir, fileName);
  const verifyUrl = `https://sbfngo.tech/verify/${verificationCode}`;

  const qrPath = path.join(certDir, `qr_${Date.now()}.png`);
  await QRCode.toFile(qrPath, verifyUrl, {
    margin: 1,
    width: 300,
    color: { dark: "#b1006e", light: "#ffffff" },
  });

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 0, left: 0, right: 0, bottom: 0 },
    bufferPages: true, // allow explicit page management, but we'll keep only one
  });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const WIDTH = doc.page.width;   // 842
  const HEIGHT = doc.page.height; // 595

  const PINK = "#b1006e";
  const GOLD = "#d4af37";
  const DARK = "#222222";
  const LIGHT = "#fffdf8";

  // ========== BACKGROUND ==========
  doc.rect(0, 0, WIDTH, HEIGHT).fill(LIGHT);

  // ========== WATERMARK ==========
  doc.save();
  doc.rotate(-25, { origin: [WIDTH / 2, HEIGHT / 2] })
     .font("Helvetica-Bold").fontSize(90).fillColor("#f7d7ea").opacity(0.18)
     .text("SAMRADDH BHARAT", 120, 200, { align: "center", width: WIDTH - 240 });
  doc.restore().opacity(1);

  // ========== BORDERS ==========
  doc.lineWidth(8).strokeColor(PINK).rect(12, 12, WIDTH - 24, HEIGHT - 24).stroke();
  doc.lineWidth(2).strokeColor(GOLD).rect(22, 22, WIDTH - 44, HEIGHT - 44).stroke();
  doc.lineWidth(1).strokeColor(GOLD).rect(30, 30, WIDTH - 60, HEIGHT - 60).stroke();

  // ========== LOGO ==========
  const logoPath = path.join(__dirname, "../uploads/logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, WIDTH / 2 - 50, 20, { width: 100 });
  }

  // ========== CERTIFICATE NUMBER ==========
  doc.roundedRect(WIDTH - 230, 25, 180, 28, 5).lineWidth(1).strokeColor(PINK).stroke();
  doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text("Certificate No.:", WIDTH - 218, 33);
  doc.font("Helvetica").fontSize(10).fillColor("#666").text(idNumber || verificationCode, WIDTH - 110, 33);

  // ========== FOUNDATION TITLE ==========
  doc.font("Helvetica-Bold").fontSize(30).fillColor(PINK)
     .text("SAMRADDH BHARAT FOUNDATION", 0, 120, { align: "center" });

  // Gold line
  doc.moveTo(240, 160).lineTo(WIDTH - 240, 160).lineWidth(1).strokeColor(GOLD).stroke();

  // Subtitle
  doc.font("Helvetica-Bold").fontSize(13).fillColor(DARK)
     .text("(A NON-PROFIT ORGANISATION)", 0, 168, { align: "center" });

  // ========== CERTIFICATE TYPE BANNER ==========
  const bannerY = 210;
  doc.polygon([220, bannerY], [WIDTH-220, bannerY], [WIDTH-200, bannerY+23], [WIDTH-220, bannerY+46], [220, bannerY+46], [200, bannerY+23]).fill(PINK);
  doc.font("Helvetica-Bold").fontSize(20).fillColor("white").text(certificateType.toUpperCase(), 0, bannerY+14, { align: "center" });

  // ========== MAIN CONTENT ==========
  doc.font("Helvetica-Oblique").fontSize(16).fillColor(DARK).text("This is to certify that", 80, 290);
  doc.moveTo(280, 306).lineTo(700, 306).lineWidth(1).strokeColor("#444").stroke();

  doc.font("Helvetica-Bold").fontSize(24).fillColor(PINK).text(recipientName, 290, 282, { width: 400, align: "center" });

  const finalMessage = customMessage || "is officially associated with Samraddh Bharat Foundation and is recognized for valuable contribution toward social welfare and nation development.";
  doc.font("Helvetica").fontSize(14).fillColor(DARK).text(finalMessage, 80, 330, { width: 680, align: "center", lineGap: 2 });

  // ========== INFO BOX ==========
  const infoY = 430;
  doc.roundedRect(50, infoY, 560, 100, 8).lineWidth(1).strokeColor("#c9a76a").stroke();

  const leftX = 70, valueX = 200, rightLabelX = 350, rightValueX = 470;
  doc.font("Helvetica-Bold").fontSize(12).fillColor(DARK);
  doc.text("State", leftX, infoY+25).text("District", leftX, infoY+55).text("Issue Date", leftX, infoY+85);
  doc.font("Helvetica").fontSize(12);
  doc.text(`: ${state || "N/A"}`, valueX, infoY+25).text(`: ${district || "N/A"}`, valueX, infoY+55)
     .text(`: ${new Date(issueDate).toLocaleDateString("en-IN")}`, valueX, infoY+85);

  doc.font("Helvetica-Bold").text("Certificate ID", rightLabelX, infoY+25).text("Verification", rightLabelX, infoY+55).text("Type", rightLabelX, infoY+85);
  doc.font("Helvetica").text(`: ${idNumber || verificationCode}`, rightValueX, infoY+25).text(`: ${verificationCode}`, rightValueX, infoY+55).text(`: ${certificateType}`, rightValueX, infoY+85);

  // ========== PHOTO BOX ==========
  doc.roundedRect(WIDTH - 190, 220, 120, 150, 8).lineWidth(1).strokeColor(PINK).stroke();
  if (photoPath && fs.existsSync(photoPath)) {
    doc.image(photoPath, WIDTH - 178, 235, { fit: [95, 120] });
  } else {
    doc.font("Helvetica").fontSize(11).fillColor("#777").text("Authorised\nPhoto", WIDTH - 170, 280, { width: 70, align: "center" });
  }

  // ========== QR BOX ==========
  doc.roundedRect(WIDTH - 190, 410, 120, 120, 8).lineWidth(1).strokeColor(PINK).stroke();
  if (fs.existsSync(qrPath)) {
    doc.image(qrPath, WIDTH - 178, 422, { width: 95 });
  }
  doc.font("Helvetica-Bold").fontSize(9).fillColor(PINK).text("Scan QR To Verify", WIDTH - 180, 530, { width: 100, align: "center" });

  // ========== GOLD SEAL ==========
  doc.circle(WIDTH - 280, 490, 35).fillAndStroke("#111", GOLD);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(GOLD).text("VERIFIED", WIDTH - 305, 493, { width: 50, align: "center" });

  // ========== SIGNATURES ==========
  const signPath = path.join(__dirname, "../uploads/signature.png");
  const signY = 545;
  if (fs.existsSync(signPath)) {
    doc.image(signPath, 90, signY, { width: 80 });
    doc.image(signPath, 460, signY, { width: 80 });
  }

  doc.moveTo(70, signY+55).lineTo(210, signY+55).strokeColor("#444").stroke();
  doc.moveTo(440, signY+55).lineTo(580, signY+55).strokeColor("#444").stroke();

  doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK).text("PRESIDENT", 100, signY+60).text("SECRETARY", 480, signY+60);

  // ========== FOOTER ==========
  const footerY = HEIGHT - 32;
  doc.rect(0, footerY, WIDTH, 32).fill(PINK);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("white").text("TOGETHER WE CAN BUILD A BETTER TOMORROW", 0, footerY+8, { align: "center" });

  doc.end();
  await new Promise((resolve) => stream.on("finish", resolve));

  if (fs.existsSync(qrPath)) fs.unlinkSync(qrPath);

  return {
    certificateUrl: `/uploads/certificates/${fileName}`,
    verificationCode,
  };
};

module.exports = { generateCertificate };