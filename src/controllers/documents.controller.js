// controllers/documents.controller.js
const path = require("path");
const fs = require("fs");
const User = require("../models/user.model");
const { generateIdCard } = require("../services/idCardGenerator");
const { createIdCardHash } = require("../utils/idCardHash");

const generateMemberId = (user) => {
    if (user.memberId) return user.memberId;

    const shortId = user._id.toString().slice(-6).toUpperCase();
    return `SBF${shortId}`;
};

const resolvePhotoPath = (user) => {
    const photo = user.profileImage || user.photo || user.image;

    if (!photo) return null;

    const photoPath = path.join(
        __dirname,
        "../uploads",
        path.basename(photo)
    );

    if (!fs.existsSync(photoPath)) {
        console.log("Profile image not found at:", photoPath);
        return null;
    }

    return photoPath;
};

exports.getMyIdCard = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (!user.documents?.idCard?.url) {
            return res.status(404).json({
                success: false,
                message: "ID card not generated yet",
                idCard: null,
            });
        }

        return res.status(200).json({
            success: true,
            idCard: user.documents.idCard,
        });
    } catch (error) {
        console.error("Get ID card error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch ID card",
        });
    }
};

exports.regenerateMyIdCard = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (!user.memberId) {
            user.memberId = generateMemberId(user);
        }

        const photoPath = resolvePhotoPath(user);
        const detailsHash = createIdCardHash(user);
        const oldFilePath = user.documents?.idCard?.filePath;
        const generated = await generateIdCard({
            name: user.fullName,
            role: user.role,
            phone: user.phone,
            email: user.email,
            photoPath,
            idNumber: user.memberId,
        });

        user.documents = {
            ...user.documents,
            idCard: {
                url: generated.idCardUrl,
                filePath: generated.filePath,
                cardCode: generated.cardCode,
                idNumber: user.memberId,
                generatedAt: new Date(),
                detailsHash,
                isActive: true,
            },
        };

        await user.save();

        if (oldFilePath && fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
        }

        return res.status(200).json({
            success: true,
            message: "ID card regenerated successfully",
            idCard: user.documents.idCard,
        });
    } catch (error) {
        console.error("Regenerate ID card error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to regenerate ID card",
        });
    }
};