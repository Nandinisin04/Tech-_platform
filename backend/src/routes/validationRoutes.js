import express from "express";
import { validateTechnology } from "../controllers/validationController.js";

const router = express.Router();

// Validate if searched technology is acceptable
router.post("/", validateTechnology);

export default router;