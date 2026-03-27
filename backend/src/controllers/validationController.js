import { isValidTechnology } from "../utils/techValidator.js";

export const validateTechnology = async (req, res) => {
  try {
    const { technology } = req.body;

    if (!technology) {
      return res.status(400).json({
        valid: false,
        error: "Technology name is required",
      });
    }

    const valid = isValidTechnology(technology);

    return res.status(200).json({
      valid,
      technology,
    });
  } catch (error) {
    console.error("Validation error:", error.message);
    return res.status(500).json({
      valid: false,
      error: "Validation failed",
    });
  }
};