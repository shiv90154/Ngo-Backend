const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer");

const fileToBase64 = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const ext = path.extname(filePath).replace(".", "").toLowerCase();

  const mime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

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

const formatRole = (role) => {
  return String(role || "MEMBER")
    .replaceAll("_", " ")
    .toUpperCase();
};

const formatDate = (date = new Date()) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const generateIdCard = async ({
  name,
  role,
  phone,
  email,
  photoPath,
  idNumber,
}) => {
  const idCardDir = path.join(__dirname, "../uploads/idcards");

  if (!fs.existsSync(idCardDir)) {
    fs.mkdirSync(idCardDir, { recursive: true });
  }

  const cardCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const fileName = `idcard_${Date.now()}.pdf`;
  const filePath = path.join(idCardDir, fileName);

  const logoPath = path.join(__dirname, "../uploads/resources/logo.png");

  const logoBase64 = fileToBase64(logoPath);
  const photoBase64 = fileToBase64(photoPath);

  const verifyUrl = `https://sbfngo.tech/verify/${cardCode}`;

  await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 180,
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>SBF Identity Card | Member ID</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: #eef2f5;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Arial', 'Helvetica', sans-serif;
      padding: 10px;
    }

    /* MAIN CARD CONTAINER — fixed dimensions ensure no overflow */
    .card {
      width: 350px;
      height: 550px;
      position: relative;
      overflow: hidden;
      background: linear-gradient(160deg, #eef6ff 0%, #ffffff 48%, #fff7e6 100%);
      border: 6px solid #123c69;
      border-radius: 24px;
      padding: 12px;
      box-shadow: 0 20px 30px -12px rgba(0,0,0,0.2);
    }

    /* decorative circles */
    .card::before {
      content: "";
      position: absolute;
      width: 230px;
      height: 230px;
      border-radius: 50%;
      background: rgba(212, 175, 55, 0.16);
      top: -90px;
      right: -90px;
      pointer-events: none;
    }

    .card::after {
      content: "";
      position: absolute;
      width: 210px;
      height: 210px;
      border-radius: 50%;
      background: rgba(18, 60, 105, 0.12);
      bottom: -85px;
      left: -85px;
      pointer-events: none;
    }

    /* inner border with semi-transparent background */
    .inner {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      border: 2px solid #d4af37;
      border-radius: 18px;
      padding: 8px 12px 38px;   /* reduced top/bottom padding to give more breathing room */
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(1px);
    }

    /* LOGO WRAPPER — removed extra padding inside container */
    .logo-wrap {
      width: 62px;           /* slightly reduced for tighter fit */
      height: 62px;
      border-radius: 50%;
      border: 2px solid #d4af37;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;           /* REMOVED extra padding — logo sits flush */
      box-shadow: 0 4px 12px rgba(18, 60, 105, 0.12);
      flex-shrink: 0;
    }

    .logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 50%;
    }

    /* fallback text inside logo */
    .logo-fallback {
      font-size: 20px;
      font-weight: 900;
      color: #123c69;
      line-height: 1;
    }

    .org-name {
      margin-top: 6px;
      color: #123c69;
      font-size: 12px;
      font-weight: 900;
      line-height: 1.2;
      text-transform: uppercase;
      text-align: center;
      letter-spacing: 0.3px;
    }

    .org-subtitle {
      margin-top: 2px;
      color: #6b5b2e;
      font-size: 6.5px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-align: center;
    }

    /* TITLE (IDENTITY CARD) — smaller background & reduced padding */
    .title {
      margin-top: 6px;
      background: #123c69;
      color: #ffffff;
      font-size: 7px;          /* reduced text size */
      font-weight: 900;
      letter-spacing: 0.8px;
      padding: 4px 14px;       /* reduced horizontal+vertical padding */
      border-radius: 999px;
      display: inline-block;
      white-space: nowrap;
    }

    /* ID NO FIELD — more compact, stays within bounds */
    .id-top {
      margin-top: 5px;
      color: #123c69;
      background: #fff8df;
      border: 1px solid #d4af37;
      font-size: 7.5px;        /* slightly smaller to avoid overflow */
      font-weight: 900;
      padding: 3px 8px;
      border-radius: 999px;
      max-width: 260px;
      text-align: center;
      word-break: break-word;
      white-space: nowrap;
      overflow-x: auto;
      max-width: 100%;
      display: inline-block;
    }

    /* PHOTO WRAPPER — consistent with border and internal image alignment */
    .photo-wrap {
      margin-top: 6px;
      width: 138px;
      height: 158px;
      border-radius: 20px;
      border: 3px solid #123c69;
      padding: 4px;            /* reduced padding for better photo space */
      background: #ffffff;
      box-shadow: 0 6px 14px rgba(18, 60, 105, 0.16);
      flex-shrink: 0;
    }

    .photo {
      width: 100%;
      height: 100%;
      border-radius: 14px;
      overflow: hidden;
      background: #eef6ff;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8a9bb0;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.3;
    }

    .photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* MEMBER NAME — slightly smaller to prevent overflow */
    .name {
      margin-top: 6px;
      color: #123c69;
      font-size: 16px;
      font-weight: 900;
      text-align: center;
      line-height: 1.15;
      max-width: 270px;
      word-break: break-word;
      padding: 0 4px;
    }

    /* ROLE BADGE — compact */
    .role-badge {
      margin-top: 3px;
      color: #ffffff;
      background: #d4af37;
      font-size: 7.5px;
      font-weight: 900;
      letter-spacing: 0.4px;
      padding: 3px 10px;
      border-radius: 999px;
      max-width: 270px;
      text-align: center;
      white-space: nowrap;
      overflow-x: auto;
      max-width: 90%;
    }

    /* DETAILS SECTION — each row stays inside container */
    .details {
      width: 100%;
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      font-size: 8px;          /* unified compact font */
      color: #2c3e4e;
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid rgba(18, 60, 105, 0.2);
      border-radius: 8px;
      padding: 4px 6px;
      width: 100%;
      overflow: hidden;
    }

    .label {
      color: #123c69;
      font-weight: 900;
      min-width: 46px;         /* fixed width for alignment, no overflow */
      flex-shrink: 0;
      font-size: 7.8px;
    }

    .value {
      color: #2c3e44;
      font-weight: 700;
      flex: 1;
      min-width: 0;
      word-break: break-word;
      overflow-wrap: anywhere;
      line-height: 1.3;
      text-align: left;
      font-size: 7.8px;
    }

    /* NOTE SECTION — extra small, fits without overflow */
    .note {
      margin-top: 5px;
      width: 100%;
      text-align: center;
      font-size: 6px;
      line-height: 1.3;
      color: #5f6c7a;
      font-weight: 700;
      padding: 0 2px;
    }

    /* FOOTER — fixed position absolute inside .card, but aligned with inner content */
    .footer {
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 14px;
      height: 22px;
      border-radius: 0 0 13px 13px;
      background: #123c69;
      color: #ffffff;
      font-size: 7.5px;
      font-weight: 900;
      letter-spacing: 0.6px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3;
    }

    /* ensure everything stays inside .inner without overflow */
    .inner > * {
      flex-shrink: 0;
    }

    /* allow name and role to shrink gracefully if needed */
    .name, .role-badge {
      flex-shrink: 1;
      width: auto;
    }

    /* phone/email row long text safe */
    .detail-row .value {
      overflow-x: auto;
      white-space: normal;
    }
  </style>
</head>
<body>
<div class="card">
  <div class="inner">

    <!-- Logo area: no extra padding inside container -->
    <div class="logo-wrap">
      ${logoBase64
      ? `<img class="logo" src="${logoBase64}" alt="logo" />`
      : `<div class="logo-fallback">SBF</div>`
    }
    </div>

    <div class="org-name">Samraddh Bharat Foundation</div>
    <div class="org-subtitle">A NON-PROFIT ORGANISATION</div>

    <!-- IDENTITY CARD text - smaller container & reduced size -->
    <div class="title">IDENTITY CARD</div>

    <!-- ID NO: smaller + reduced padding, stays inline -->
    <div class="id-top">
      ID NO: ${safeText(idNumber || "N/A")}
    </div>

    <!-- PHOTO SECTION (image container) -->
    <div class="photo-wrap">
      <div class="photo">
        ${photoBase64 ? `<img src="${photoBase64}" alt="member photo" />` : `No Image<br/>Available`}
      </div>
    </div>

    <!-- MEMBER FULL NAME -->
    <div class="name">${safeText(name || "Member Name")}</div>

    <!-- ROLE BADGE (compact) -->
    <div class="role-badge">${safeText(formatRole(role))}</div>

    <!-- CONTACT DETAILS SECTION (Phone, Email, Issued) -->
    <div class="details">
      <div class="detail-row">
        <span class="label">Phone :</span>
        <span class="value">${safeText(phone || "N/A")}</span>
      </div>
      <div class="detail-row">
        <span class="label">Email :</span>
        <span class="value">${safeText(email || "N/A")}</span>
      </div>
      <div class="detail-row">
        <span class="label">Issued :</span>
        <span class="value">${safeText(formatDate())}</span>
      </div>
    </div>

    <!-- ORGANISATION NOTE -->
    <div class="note">
      This card is issued by Samraddh Bharat Foundation and is valid for official identification within the organisation.
    </div>
  </div>

  <div class="footer">
    OFFICIAL MEMBER ID CARD
  </div>
</div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 340,
    height: 580,
    deviceScaleFactor: 1,
  });

  await page.setContent(html, {
    waitUntil: "networkidle0",
  });

  await page.pdf({
    path: filePath,
    width: "340px",
    height: "580px",
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
    idCardUrl: `/uploads/idcards/${fileName}`,
    filePath,
    cardCode,
  };
};

module.exports = { generateIdCard };