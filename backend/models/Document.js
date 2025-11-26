const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },        // Display name in UI
    originalName: { type: String },                 // Original uploaded filename
    category: { type: String, default: "" },        // e.g. "ML Notes", "Law", "Project"
    tags: { type: [String], default: [] },          // e.g. ["NLP", "Exam", "Unit-1"]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
