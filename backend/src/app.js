import express from "express";
import cors from "cors";

import techRoutes from "./routes/techRoutes.js";
import globalRoutes from "./routes/globalRoutes.js";
import validationRoutes from "./routes/validationRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/technologies", techRoutes);
app.use("/api/global", globalRoutes);
app.use("/api/validate", validationRoutes);

export default app;