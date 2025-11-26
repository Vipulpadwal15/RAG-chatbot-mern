// backend/routes/ragRoutes.js
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse"); // ✅ works with pdf-parse@1.1.1

const Document = require("../models/Document");
const Chunk = require("../models/Chunk");
const {
  getEmbedding,
  generateAnswerWithContext,
  summarizeLongText,
} = require("../utils/gemini");

const router = express.Router();

// Multer: store uploaded file in memory
const upload = multer({ storage: multer.memoryStorage() });

// ------------------ Chunking ------------------
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = start + chunkSize;
    const piece = text.slice(start, end);
    chunks.push(piece);
    start += chunkSize - overlap;
  }
  return chunks;
}

// ------------------ Cosine Similarity ------------------
function cosineSim(a, b) {
  let dot = 0,
    normA = 0,
    normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  return normA && normB ? dot / (normA * normB) : 0;
}

// ======================= 📌 1. UPLOAD PDF =======================
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("📄 Extracting PDF text...");

    // ✅ simple usage with pdf-parse@1.1.1
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return res
        .status(400)
        .json({ error: "Text extraction from PDF failed" });
    }

    // Create document record
    const doc = await Document.create({
      title: req.file.originalname,
      originalName: req.file.originalname,
    });

    // Chunk text
    const chunks = chunkText(text);
    console.log(`🔹 ${chunks.length} chunks generated`);

    // Embed and save each chunk
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk); // Gemini embeddings
      await Chunk.create({
        document: doc._id,
        text: chunk,
        embedding,
      });
    }

    res.json({
      message: `📁 Uploaded & indexed ${chunks.length} chunks`,
      documentId: doc._id,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res
      .status(500)
      .json({ error: "Server processing error", details: err.message });
  }
});

// ======================= 📌 2. CHAT =======================
router.post("/chat", async (req, res) => {
  try {
    const { question, documentId } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question required" });
    }

    const filter = documentId ? { document: documentId } : {};
    const chunks = await Chunk.find(filter).lean();

    if (!chunks.length) {
      return res
        .status(400)
        .json({ error: "No indexed data. Upload a document first." });
    }

    const qEmbed = await getEmbedding(question);

    // Score all chunks by similarity
    const scored = chunks
      .map((c) => ({
        ...c,
        score: cosineSim(qEmbed, c.embedding),
      }))
      .sort((a, b) => b.score - a.score);

    const top5 = scored.slice(0, 5);

    const contextText = top5
      .map(
        (c, i) =>
          `Chunk ${i + 1} (similarity ${c.score.toFixed(3)}):\n${c.text}`
      )
      .join("\n\n");

    const answer = await generateAnswerWithContext(question, contextText);

    res.json({
      answer,
      sources: top5.map((c) => ({
        text: c.text.slice(0, 300),
        score: c.score,
      })),
    });
  } catch (err) {
    console.error("❌ Chat error:", err);
    res.status(500).json({ error: "Chat processing failed" });
  }
});

// ======================= 📌 3. SUMMARY =======================
router.post("/summarize", async (req, res) => {
  try {
    const { documentId } = req.body;
    const filter = documentId ? { document: documentId } : {};
    const chunks = await Chunk.find(filter).lean();

    if (!chunks.length) {
      return res.status(400).json({ error: "No document uploaded." });
    }

    // Combine first N chunks for summary
    const combined = chunks
      .slice(0, 40)
      .map((c) => c.text)
      .join("\n\n");

    const summary = await summarizeLongText(combined);

    res.json({ summary });
  } catch (err) {
    console.error("❌ Summary error:", err);
    res.status(500).json({ error: "Summary generation failed" });
  }
});

// ======================= 📌 4. SIMILARITY CHECK =======================
router.post("/similarity", async (req, res) => {
  try {
    const { text, documentId } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text required" });
    }

    const filter = documentId ? { document: documentId } : {};
    const chunks = await Chunk.find(filter).lean();

    if (!chunks.length) {
      return res
        .status(400)
        .json({ error: "No indexed data. Upload a document first." });
    }

    const tEmbed = await getEmbedding(text);

    const scored = chunks
      .map((c) => ({
        chunk: c.text,
        similarity: cosineSim(tEmbed, c.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    res.json({ results: scored });
  } catch (err) {
    console.error("❌ Similarity error:", err);
    res.status(500).json({ error: "Similarity check failed" });
  }
});

module.exports = router;
