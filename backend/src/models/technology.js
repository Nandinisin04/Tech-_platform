import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const TechnologySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    latest_json: { type: Schema.Types.Mixed, default: null },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ Proper model reuse (important for dev reloads)

export const Technology =
  models.Technology || model("Technology", TechnologySchema, "technologies");

export const Global =
  models.Global || model("Global", TechnologySchema, "globals");

export const India =
  models.India || model("India", TechnologySchema, "indias");