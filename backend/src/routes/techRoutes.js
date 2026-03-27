import express from "express";
import {
  getTechnology,
  runTechnologyGeneration,
} from "../controllers/techController.js";

const router = express.Router();

// GET technology data
router.get("/:name", getTechnology);

// Force run ML generation
router.post("/:name/run", runTechnologyGeneration);

export default router;