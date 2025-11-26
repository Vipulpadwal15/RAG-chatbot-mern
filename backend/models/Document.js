// backend/models/Document.js
const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    originalName: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
