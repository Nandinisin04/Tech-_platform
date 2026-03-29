import express from "express";
import cors from "cors";

import techRoutes from "./routes/techRoutes.js";
import globalRoutes from "./routes/globalRoutes.js";
import validationRoutes from "./routes/validationRoutes.js";
import localRoutes from "./routes/localRoutes.js";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 Tech Intel Backend is running");
});

app.use("/api/technologies", techRoutes);
app.use("/api/global", globalRoutes);
app.use("/api/validate", validationRoutes);
app.use("/api/local", localRoutes);
export default app;