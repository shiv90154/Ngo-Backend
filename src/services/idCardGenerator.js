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

    return `data:${mime};base64,${fs
        .readFileSync(filePath)
        .toString("base64")}`;
};

const safeText = (value) => {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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

    const cardCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

    const fileName = `idcard_${Date.now()}.pdf`;
    const filePath = path.join(idCardDir, fileName);

    const logoPath = path.join(
        __dirname,
        "../uploads/resources/logo.png"
    );

    const logoBase64 = fileToBase64(logoPath);
    const photoBase64 = fileToBase64(photoPath);

    const verifyUrl = `https://sbfngo.tech/verify/${cardCode}`;

    await QRCode.toDataURL(verifyUrl, {
        margin: 1,
        width: 180,
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />

<style>
*{
    box-sizing:border-box;
}

body{
    margin:0;
    padding:0;
    font-family:Arial,Helvetica,sans-serif;
    background:#ffffff;
}

.card{
    width:340px;
    height:580px;
    position:relative;
    overflow:hidden;
    background:#fffaf3;
    border:6px solid #b1006e;
    border-radius:22px;
    padding:14px;
}

.inner{
    width:100%;
    height:100%;
    border:2px solid #d4af37;
    border-radius:16px;
    padding:8px 12px 42px;
    display:flex;
    flex-direction:column;
    align-items:center;
    background:rgba(255,255,255,0.72);
}

.header{
    width:100%;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    margin-top:-2px;
}

.logo{
    width:52px;
    height:48px;
    object-fit:contain;
    flex-shrink:0;
}

.header-text{
    min-width:0;
}

.org-name{
    color:#b1006e;
    font-size:12px;
    font-weight:900;
    line-height:1.15;
    text-transform:uppercase;
}

.org-subtitle{
    margin-top:2px;
    color:#444;
    font-size:7px;
    font-weight:800;
    letter-spacing:0.3px;
}

.title{
    margin-top:8px;
    background:#b1006e;
    color:#ffffff;
    font-size:11px;
    font-weight:900;
    letter-spacing:0.8px;
    padding:6px 18px;
    border-radius:999px;
}

.photo-wrap{
    margin-top:10px;
    width:220px;
    height:245px;
    border-radius:20px;
    border:3px solid #b1006e;
    padding:6px;
    background:#ffffff;
    box-shadow:0 8px 20px rgba(177,0,110,0.12);
}

.photo{
    width:100%;
    height:100%;
    border-radius:15px;
    overflow:hidden;
    background:#fff7fb;
    display:flex;
    align-items:center;
    justify-content:center;
    color:#777;
    text-align:center;
    font-size:12px;
    font-weight:800;
    line-height:1.35;
}

.photo img{
    width:100%;
    height:100%;
    object-fit:cover;
}

.name{
    margin-top:8px;
    color:#b1006e;
    font-size:16px;
    font-weight:900;
    text-align:center;
    line-height:1.1;
    max-width:270px;
    word-break:break-word;
}

.details{
    width:100%;
    margin-top:8px;
    display:flex;
    flex-direction:column;
    gap:5px;
}

.detail-row{
    display:flex;
    align-items:flex-start;
    gap:6px;
    font-size:9px;
    color:#333;
    background:rgba(255,255,255,0.92);
    border:1px solid rgba(212,175,55,0.75);
    border-radius:8px;
    padding:5px 7px;
    width:100%;
    overflow:hidden;
}

.label{
    color:#222;
    font-weight:900;
    min-width:46px;
    flex-shrink:0;
}

.value{
    color:#555;
    font-weight:700;
    flex:1;
    min-width:0;
    word-break:break-word;
    overflow-wrap:anywhere;
    line-height:1.35;
    text-align:left;
}

.footer{
    position:absolute;
    left:14px;
    right:14px;
    bottom:14px;
    height:24px;
    border-radius:0 0 12px 12px;
    background:#b1006e;
    color:#ffffff;
    font-size:9px;
    font-weight:900;
    letter-spacing:0.5px;
    display:flex;
    align-items:center;
    justify-content:center;
}
</style>
</head>

<body>

<div class="card">

    <div class="inner">

        <div class="header">

            ${logoBase64
            ? `<img class="logo" src="${logoBase64}" />`
            : `<div style="width:52px;height:48px;"></div>`
        }

            <div class="header-text">
                <div class="org-name">
                    Samraddh Bharat Foundation
                </div>

                <div class="org-subtitle">
                    A NON-PROFIT ORGANISATION
                </div>
            </div>
        </div>

        <div class="title">
            IDENTITY CARD
        </div>

        <div class="photo-wrap">
            <div class="photo">

                ${photoBase64
            ? `<img src="${photoBase64}" />`
            : `No Image<br/>Available`
        }

            </div>
        </div>

        <div class="name">
            ${safeText(name || "Member Name")}
        </div>

        <div class="details">

            <div class="detail-row">
                <span class="label">Role :</span>

                <span class="value">
                    ${safeText(role || "Member")}
                </span>
            </div>

            <div class="detail-row">
                <span class="label">Phone :</span>

                <span class="value">
                    ${safeText(phone || "N/A")}
                </span>
            </div>

            <div class="detail-row">
                <span class="label">Email :</span>

                <span class="value">
                    ${safeText(email || "N/A")}
                </span>
            </div>

        </div>

    </div>

    <div class="footer">
        OFFICIAL MEMBER ID CARD
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
