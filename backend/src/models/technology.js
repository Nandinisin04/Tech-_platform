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

const Technology =
  models.Technology || model("Technology", TechnologySchema);

export default Technology;