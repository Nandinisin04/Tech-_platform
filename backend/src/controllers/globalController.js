import fs from "fs";
import path from "path";

export const getGlobalData = async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "data", "global_trends.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const parsedData = JSON.parse(rawData);

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error fetching global data:", error.message);
    return res.status(500).json({ error: "Failed to fetch global data" });
  }
};

export const getGlobalInvestmentData = async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "data", "global_investment.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const parsedData = JSON.parse(rawData);

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error fetching investment data:", error.message);
    return res.status(500).json({ error: "Failed to fetch investment data" });
  }
};

export const getIndiaData = async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "data", "india_data.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const parsedData = JSON.parse(rawData);

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error fetching India data:", error.message);
    return res.status(500).json({ error: "Failed to fetch India data" });
  }
};