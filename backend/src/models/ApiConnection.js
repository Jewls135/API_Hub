import mongoose from "mongoose";

const ApiConnectionSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Firebase UID
  name: { type: String, required: true },
  url: { type: String, required: true },
  method: { type: String, default: "GET" },
  headers: { type: Object, default: {} },
  mappedFields: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// Ensure each user cannot have duplicate entries for the same URL
ApiConnectionSchema.index({ userId: 1, url: 1 }, { unique: true });

export default mongoose.model("ApiConnection", ApiConnectionSchema);
