import { validateTech } from "../utils/techValidator.js";

export const validateTechnology = async (req, res) => {
  try {
    const { technology } = req.body;

    if (!technology || !technology.trim()) {
      return res.status(400).json({
        decision: "reject",
        error: "Technology name is required",
      });
    }

    const result = validateTech(technology);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Validation error:", error.message);
    return res.status(500).json({
      decision: "reject",
      error: "Validation failed",
    });
  }
};