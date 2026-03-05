import mongoose from "mongoose";

const ApiJobSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  apiConnectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ApiConnection",
  },
  url: { type: String, required: true },
  method: { type: String, default: "GET" },
  headers: { type: Object, default: {} },
  mappedFields: { type: [String], default: [] },
  intervalMs: { type: Number, required: true },
  intervalSecs: { type: Number },
  lastRun: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
});

ApiJobSchema.index({ userId: 1, url: 1 }, { unique: true });

export default mongoose.model("ApiJob", ApiJobSchema);
