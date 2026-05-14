const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer");

const fileToBase64 = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
};

const safeText = (value) => {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

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

  const verificationCode = Math.random()
    .toString(36)
    .substring(2, 10)
    .toUpperCase();

  const fileName = `cert_${Date.now()}.pdf`;
  const filePath = path.join(certDir, fileName);
  const verifyUrl = `https://sbfngo.tech/verify/${verificationCode}`;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 260,
    color: {
      dark: "#9d005f",
      light: "#ffffff",
    },
  });

  const logoPath = path.join(__dirname, "../uploads/resources/logo.png");

  const logoBase64 = fileToBase64(logoPath);
  const photoBase64 = fileToBase64(photoPath);

  const finalMessage =
    customMessage ||
    "is officially associated with Samraddh Bharat Foundation and is recognized for valuable contribution toward social welfare and nation development.";

  const formattedIssueDate = issueDate
    ? new Date(issueDate).toLocaleDateString("en-IN")
    : "N/A";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #fffaf3;
    }

    .page {
      width: 1123px;
      height: 794px;
      position: relative;
      overflow: hidden;
      background:
        linear-gradient(135deg, rgba(177, 0, 110, 0.05), transparent 40%),
        linear-gradient(315deg, rgba(212, 175, 55, 0.12), transparent 42%),
        #fffaf3;
      padding: 38px 46px 54px;
    }

    .outer-border {
      position: absolute;
      inset: 16px;
      border: 7px solid #b1006e;
      pointer-events: none;
    }

    .inner-border {
      position: absolute;
      inset: 31px;
      border: 2px solid #d4af37;
      pointer-events: none;
    }

    .content {
      position: relative;
      z-index: 2;
      height: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 185px;
      gap: 22px;
    }

    .left {
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .right {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding-top: 18px;
    }

    .top-row {
      position: relative;
      min-height: 82px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo {
      width: 150px;
      object-fit: contain;
    }

    .cert-no {
      position: absolute;
      top: 8px;
      right: -40px;
      max-width: 180px;
      text-align: right;
      font-size: 12px;
      color: #555;
      line-height: 1.45;
    }

    .cert-no strong {
      color: #222;
    }

    .foundation {
      text-align: center;
      margin-top: 2px;
    }

    .foundation h1 {
      margin: 0;
      color: #b1006e;
      font-size: 34px;
      line-height: 1.1;
      letter-spacing: 0.8px;
      font-weight: 900;
    }

    .gold-line {
      width: 360px;
      max-width: 80%;
      height: 2px;
      background: #d4af37;
      margin: 9px auto 7px;
    }

    .foundation p {
      margin: 0;
      color: #222;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    .banner {
      width: 455px;
      max-width: 88%;
      margin: 22px auto 0;
      background: linear-gradient(135deg, #b1006e, #8f0058);
      color: #ffffff;
      text-align: center;
      padding: 12px 18px;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 1px;
      clip-path: polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%);
      box-shadow: 0 12px 22px rgba(177, 0, 110, 0.18);
    }

    .main-text {
      margin-top: 24px;
      text-align: center;
      color: #222;
    }

    .intro {
      font-size: 18px;
      font-style: italic;
      margin-bottom: 10px;
    }

    .recipient {
      display: inline-block;
      min-width: 420px;
      max-width: 620px;
      border-bottom: 2px solid #444;
      color: #b1006e;
      font-size: 31px;
      font-weight: 900;
      padding: 0 18px 7px;
      line-height: 1.15;
      word-break: break-word;
    }

    .message {
      width: 700px;
      max-width: 100%;
      margin: 18px auto 0;
      font-size: 17px;
      line-height: 1.45;
      color: #333;
    }

    .info-section {
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .info-box {
      border: 1.5px solid rgba(212, 175, 55, 0.9);
      border-radius: 14px;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.78);
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.04);
    }

    .info-row {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 12px;
      margin-bottom: 10px;
      font-size: 14px;
      color: #333;
      align-items: start;
    }

    .info-row:last-child {
      margin-bottom: 0;
    }

    .label {
      font-weight: 900;
      color: #222;
    }

    .value {
      text-align: right;
      color: #555;
      word-break: break-word;
      line-height: 1.3;
    }

    .bottom-note {
      margin-top: auto;
      padding-top: 14px;
      text-align: center;
      color: #7a004a;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.4px;
    }

    .side-card {
      width: 175px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.86);
      border: 1.5px solid rgba(177, 0, 110, 0.28);
      box-shadow: 0 12px 25px rgba(0, 0, 0, 0.07);
      padding: 9px;
      text-align: center;
    }

    .photo-frame {
      width: 157px;
      height: 178px;
      border-radius: 13px;
      background: #fff;
      border: 1.5px solid #e7bad4;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #777;
      font-size: 13px;
      font-weight: 800;
      text-align: center;
      line-height: 1.35;
    }

    .photo-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .side-title {
      margin-top: 7px;
      color: #b1006e;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }

    .qr-card img {
      width: 118px;
      height: 118px;
      display: block;
      margin: 0 auto;
    }

    .qr-text {
      margin-top: 5px;
      font-size: 11px;
      font-weight: 900;
      color: #b1006e;
      line-height: 1.25;
    }

    .verified-box {
      width: 175px;
      border-radius: 16px;
      background: #ecfdf5;
      border: 2px solid #22c55e;
      color: #15803d;
      padding: 12px 10px;
      text-align: center;
      box-shadow: 0 10px 20px rgba(34, 197, 94, 0.14);
    }

    .verified-main {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.8px;
    }

    .verified-sub {
      margin-top: 3px;
      font-size: 10.5px;
      font-weight: 800;
      color: #166534;
    }

    .footer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 38px;
      background: linear-gradient(90deg, #8f0058, #b1006e, #8f0058);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 0.5px;
      z-index: 3;
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="outer-border"></div>
    <div class="inner-border"></div>

    <div class="content">
      <div class="left">
        <div class="top-row">
          ${logoBase64
      ? `<img class="logo" src="${logoBase64}" />`
      : `<div></div>`
    }

          <div class="cert-no">
            <strong>Certificate No.</strong><br />
            ${safeText(idNumber || verificationCode)}
          </div>
        </div>

        <div class="foundation">
          <h1>SAMRADDH BHARAT FOUNDATION</h1>
          <div class="gold-line"></div>
          <p>A NON-PROFIT ORGANISATION</p>
        </div>

        <div class="banner">
          ${safeText(certificateType || "CERTIFICATE").toUpperCase()}
        </div>

        <div class="main-text">
          <div class="intro">This is to certify that</div>

          <div class="recipient">
            ${safeText(recipientName || "Recipient Name")}
          </div>

          <div class="message">
            ${safeText(finalMessage)}
          </div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-row">
              <span class="label">State</span>
              <span class="value">${safeText(state || "N/A")}</span>
            </div>

            <div class="info-row">
              <span class="label">District</span>
              <span class="value">${safeText(district || "N/A")}</span>
            </div>

            <div class="info-row">
              <span class="label">Issue Date</span>
              <span class="value">${safeText(formattedIssueDate)}</span>
            </div>
          </div>

          <div class="info-box">
            <div class="info-row">
              <span class="label">Certificate ID</span>
              <span class="value">${safeText(idNumber || verificationCode)}</span>
            </div>

            <div class="info-row">
              <span class="label">Verification</span>
              <span class="value">${safeText(verificationCode)}</span>
            </div>

            <div class="info-row">
              <span class="label">Type</span>
              <span class="value">${safeText(certificateType || "N/A")}</span>
            </div>
          </div>
        </div>

        <div class="bottom-note">
          TOGETHER WE CAN BUILD A BETTER TOMORROW
        </div>
      </div>

      <div class="right">
        <div class="side-card">
          <div class="photo-frame">
            ${photoBase64
      ? `<img src="${photoBase64}" />`
      : `No Image<br />Available`
    }
          </div>
          <div class="side-title">MEMBER PHOTO</div>
        </div>

        <div class="side-card qr-card">
          <img src="${qrDataUrl}" />
          <div class="qr-text">SCAN QR<br />TO VERIFY</div>
        </div>

        <div class="verified-box">
          <div class="verified-main">VERIFIED</div>
          <div class="verified-sub">Official Certificate</div>
        </div>
      </div>
    </div>

    <div class="footer">
      SAMRADDH BHARAT FOUNDATION
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

  await page.setViewport({
    width: 1123,
    height: 794,
    deviceScaleFactor: 1,
  });

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  await page.pdf({
    path: filePath,
    width: "1123px",
    height: "794px",
    printBackground: true,
    margin: {
      top: "0px",
      right: "0px",
      bottom: "0px",
      left: "0px",
    },
  });

  await browser.close();

  return {
    certificateUrl: `/uploads/certificates/${fileName}`,
    verificationCode,
  };
};

module.exports = { generateCertificate };