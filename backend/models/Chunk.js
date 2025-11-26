const mongoose = require("mongoose");

const ChunkSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true }, // vector array
    page: { type: Number }, // optional: page number
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chunk", ChunkSchema);
