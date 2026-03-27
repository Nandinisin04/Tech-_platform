import Technology from "../models/technology.js";
import { generateTechnologyData } from "./mlService.js";

export const fetchTechnologyByName = async (name) => {
  // 1. Check MongoDB first
  let tech = await Technology.findOne({
    name: new RegExp(`^${name}$`, "i"),
  });

  // 2. If found in DB, return it
  if (tech) {
    return {
      source: "db",
      data: tech,
    };
  }

  // 3. If not found, call ML
  const generatedData = await generateTechnologyData(name);

  // 4. Save to DB
  tech = await Technology.create(generatedData);

  return {
    source: "ml",
    data: tech,
  };
};

export const forceGenerateTechnology = async (name) => {
  // 1. Always run ML again
  const generatedData = await generateTechnologyData(name);

  // 2. Update if exists, create if not
  const updatedTech = await Technology.findOneAndUpdate(
    { name: new RegExp(`^${name}$`, "i") },
    generatedData,
    { new: true, upsert: true }
  );

  return {
    source: "ml-refresh",
    data: updatedTech,
  };
};