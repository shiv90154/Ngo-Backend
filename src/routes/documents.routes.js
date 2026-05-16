// routes/documents.routes.js
const express = require("express");
const router = express.Router();

const documentsController = require("../controllers/documents.controller");
const protect = require("../middleware/auth");

router.get("/id-card", protect, documentsController.getMyIdCard);
router.post("/id-card/regenerate", protect, documentsController.regenerateMyIdCard);

module.exports = router;