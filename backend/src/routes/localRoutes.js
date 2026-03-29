import express from "express";
import multer from "multer";
import { uploadLocalDocument } from "../controllers/localController.js";

const router = express.Router();

// Store file only in memory, not disk
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), uploadLocalDocument);

export default router;