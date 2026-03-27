import mongoose, { Schema, model, models } from "mongoose"

const TechnologySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    latest_json: { type: Schema.Types.Mixed, default: null },
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export const Technology =
  models.Technology || model("Technology", TechnologySchema)
