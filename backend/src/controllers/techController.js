import {
  fetchTechnologyByName,
  forceGenerateTechnology,
} from "../services/techService.js";

export const getTechnology = async (req, res) => {
  const { name } = req.params;

  try {
    const result = await fetchTechnologyByName(name);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in getTechnology:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

export const runTechnologyGeneration = async (req, res) => {
  const { name } = req.params;

  try {
    const result = await forceGenerateTechnology(name);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in runTechnologyGeneration:", error.message);
    return res.status(500).json({ error: error.message });
  }
};