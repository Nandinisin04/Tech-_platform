import express from "express";
import { validateTechnology } from "../controllers/validationController.js";

const router = express.Router();

router.post("/", validateTechnology);

export default router;