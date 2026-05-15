const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const generateDonationReceipt = async ({
   donorName,
   email,
   amount,
   purpose,
   date,
   receiptNumber,
   paymentMode = "Online",
}) => {
   const receiptDir = path.join(__dirname, "../uploads/receipts");
   if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });

   const fileName = `receipt_${receiptNumber}.pdf`;
   const filePath = path.join(receiptDir, fileName);

   const logoPath = path.join(__dirname, "../uploads/resources/logo.png");
   const logoBase64 = fs.existsSync(logoPath)
      ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
      : "";

   const formattedDate = new Date(date || Date.now()).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
   });

   const formattedAmount = Number(amount || 0).toLocaleString("en-IN");

   // Compact, center‑logo, reduced‑height HTML
   const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: #eef2f5;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .receipt {
      max-width: 820px;
      width: 100%;
      background: white;
      border-radius: 28px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .receipt-inner {
      padding: 28px 32px 32px 32px;
    }
    /* CENTER TOP LOGO */
  .logo-area {
  text-align: center;
  margin-bottom: 16px;
}
.logo-img {
  max-width: 70px;
  max-height: 70px;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(0,0,0,0.03);
  display: inline-block;  /* stays inline, fine */
  margin-bottom: 8px;
}
.org-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a2c3e;
  background: #f8fafc;
  display: block;         /* ← forces new line */
  padding: 4px 14px;
  border-radius: 40px;
  margin: 4px auto 0 auto; /* center block */
  width: fit-content;     /* keeps background snug around text */
}
    .receipt-title {
      text-align: center;
      margin: 8px 0 12px 0;
    }
    .receipt-title h2 {
      font-size: 22px;
      font-weight: 700;
      color: #0f2b3d;
      margin-bottom: 4px;
    }
    .receipt-title p {
      font-size: 12px;
      color: #5a6e7c;
    }
    .badge-row {
      display: flex;
      justify-content: space-between;
      background: #f1f5f9;
      border-radius: 60px;
      padding: 8px 20px;
      margin-bottom: 18px;
      font-size: 13px;
    }
    .badge-item {
      display: flex;
      gap: 8px;
      align-items: baseline;
    }
    .badge-label {
      font-weight: 500;
      color: #3e5a6b;
    }
    .badge-value {
      font-weight: 800;
      color: #0b3550;
      font-size: 14px;
    }
    .amount-card {
      background: linear-gradient(115deg, #f0f9ff 0%, #e6f2f9 100%);
      border-radius: 24px;
      text-align: center;
      padding: 14px 12px;
      margin-bottom: 20px;
      border: 1px solid #cde3f0;
    }
    .amount-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1f6e8c;
      margin-bottom: 4px;
    }
    .amount-value {
      font-size: 38px;
      font-weight: 800;
      color: #0c4e6e;
      line-height: 1.1;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .info-card {
      background: #ffffff;
      border: 1px solid #e2edf2;
      border-radius: 20px;
      padding: 12px 16px;
    }
    .info-card h3 {
      font-size: 14px;
      font-weight: 700;
      color: #204c6b;
      margin-bottom: 10px;
      border-left: 3px solid #2c7da0;
      padding-left: 10px;
    }
    .detail-row {
      margin-bottom: 8px;
    }
    .detail-label {
      font-size: 11px;
      font-weight: 500;
      color: #6f8faa;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: block;
      margin-bottom: 2px;
    }
    .detail-value {
      font-size: 14px;
      font-weight: 600;
      color: #1e2f3c;
      word-break: break-word;
    }
    .thanks-message {
      background: #fefaf5;
      border-left: 4px solid #f29b45;
      border-radius: 16px;
      padding: 10px 16px;
      margin-bottom: 18px;
      font-size: 12px;
      line-height: 1.45;
      color: #5a3e1f;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 8px;
      margin-bottom: 6px;
    }
    .digital-note {
      font-size: 10px;
      color: #8ba3b5;
    }
    .sign-box {
      text-align: center;
      min-width: 150px;
    }
    .sign-line {
      border-top: 1px solid #bdd3e2;
      width: 100%;
      margin-bottom: 5px;
    }
    .sign-text {
      font-size: 11px;
      color: #4e6e85;
      font-weight: 500;
    }
    .receipt-footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 16px;
      padding-top: 10px;
      text-align: center;
      font-size: 9px;
      color: #8aa0af;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-inner">
      <!-- CENTERED LOGO (only if exists) -->
      <div class="logo-area">
        ${logoBase64
         ? `<img src="${logoBase64}" class="logo-img" alt="Foundation Logo" />`
         : ``
      }
        <div class="org-name">SAMRADDH BHARAT FOUNDATION</div>
      </div>

      <div class="receipt-title">
        <h2>Donation Receipt</h2>
        <p>Official tax‑exempt contribution record</p>
      </div>

      <div class="badge-row">
        <div class="badge-item">
          <span class="badge-label">Receipt № :</span>
          <span class="badge-value">${receiptNumber}</span>
        </div>
        <div class="badge-item">
          <span class="badge-label">Date :</span>
          <span class="badge-value">${formattedDate}</span>
        </div>
      </div>

      <div class="amount-card">
        <div class="amount-label">Total Donation</div>
        <div class="amount-value">₹${formattedAmount}</div>
      </div>

      <div class="details-grid">
        <div class="info-card">
          <h3>Donor Information</h3>
          <div class="detail-row">
            <span class="detail-label">Full Name</span>
            <span class="detail-value">${donorName || "Anonymous"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email Address</span>
            <span class="detail-value">${email || "N/A"}</span>
          </div>
        </div>
        <div class="info-card">
          <h3>Donation Particulars</h3>
          <div class="detail-row">
            <span class="detail-label">Purpose</span>
            <span class="detail-value">${purpose || "General Donation"}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment Mode</span>
            <span class="detail-value">${paymentMode}</span>
          </div>
        </div>
      </div>

      <div class="thanks-message">
        We sincerely appreciate your generous contribution. Your donation helps Samraddh Bharat Foundation continue its work for community welfare, education, health, and social development.
      </div>

      <div class="signature-area">
        <div class="digital-note">
          ✅ Computer‑generated receipt — valid for all records.
        </div>
        <div class="sign-box">
          <div class="sign-line"></div>
          <div class="sign-text">Authorized Signatory</div>
        </div>
      </div>

      <div class="receipt-footer">
        Samraddh Bharat Foundation (SBF NGO) | Regd. under Indian Trusts Act<br />
        This receipt is system generated and does not require physical stamp.
      </div>
    </div>
  </div>
</body>
</html>
  `;

   const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
   });

   const page = await browser.newPage();
   await page.setContent(html, { waitUntil: "networkidle0" });

   await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
   });

   await browser.close();

   return `/uploads/receipts/${fileName}`;
};

module.exports = { generateDonationReceipt };