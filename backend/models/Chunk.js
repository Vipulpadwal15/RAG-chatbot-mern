// backend/models/Chunk.js
const mongoose = require("mongoose");

const ChunkSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true }, // store vector as number array
    page: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chunk", ChunkSchema);
