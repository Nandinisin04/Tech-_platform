import {
  getTechnologyFromDB,
  generateAndStoreTechnology,
} from "../services/techService.js";

export const getTechnologyData = async (req, res) => {
  try {
    const { technology } = req.params;

    const techData = await getTechnologyFromDB(technology);

    if (!techData) {
      return res.status(404).json({
        error: "Technology not found in database",
      });
    }

    return res.status(200).json(techData);
  } catch (error) {
    console.error("Error fetching technology:", error.message);
    return res.status(500).json({
      error: "Failed to fetch technology data",
    });
  }
};

export const runTechnologyPipeline = async (req, res) => {
  try {
    const { technology } = req.params;

    const generated = await generateAndStoreTechnology(technology);

    return res.status(200).json({
      message: "Technology pipeline completed",
      data: generated,
    });
  } catch (error) {
    console.error("Error running pipeline:", error.message);
    return res.status(500).json({
      error: "Failed to run ML pipeline",
    });
  }
};