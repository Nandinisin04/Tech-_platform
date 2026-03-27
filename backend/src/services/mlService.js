import axios from "axios";

export const generateTechnologyData = async (name) => {
  try {
    const response = await axios.post(
      `${process.env.ML_SERVICE_URL}/generate`,
      {
        technology: name,
      }
    );

    return response.data;
  } catch (error) {
    console.error("ML Service Error:", error.message);
    throw new Error("Failed to generate technology data from ML service");
  }
};