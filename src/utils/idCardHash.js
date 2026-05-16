// utils/idCardHash.js
const crypto = require("crypto");

const createIdCardHash = (user) => {
    const raw = JSON.stringify({
        name: user.name || "",
        role: user.role || "",
        phone: user.phone || "",
        email: user.email || "",
        photo: user.photo || user.profileImage || "",
        memberId: user.memberId || "",
    });

    return crypto.createHash("sha256").update(raw).digest("hex");
};

module.exports = { createIdCardHash };