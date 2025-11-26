const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse"); // using pdf-parse@1.1.1

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
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return res
        .status(400)
        .json({ error: "Text extraction from PDF failed" });
    }

    const doc = await Document.create({
      title: req.file.originalname,
      originalName: req.file.originalname,
    });

    const chunks = chunkText(text);
    console.log(`🔹 ${chunks.length} chunks generated`);

    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
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
    res.status(500).json({
      error: "Server processing error",
      details: err.message,
    });
  }
});

// ======================= 📌 2. CHAT (single doc OR all docs) =======================
router.post("/chat", async (req, res) => {
  try {
    const { question, documentId } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question required" });
    }

    // If documentId is null/undefined => All documents
    const filter = documentId ? { document: documentId } : {};
    const chunks = await Chunk.find(filter).lean();

    if (!chunks.length) {
      return res
        .status(400)
        .json({ error: "No indexed data. Upload a document first." });
    }

    const qEmbed = await getEmbedding(question);

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

// ======================= 📌 3. SUMMARY (single doc OR all docs) =======================
router.post("/summarize", async (req, res) => {
  try {
    const { documentId } = req.body;
    const filter = documentId ? { document: documentId } : {};
    const chunks = await Chunk.find(filter).lean();

    if (!chunks.length) {
      return res.status(400).json({ error: "No document uploaded." });
    }

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

// ======================= 📌 4. SIMILARITY CHECK (plagiarism-like) =======================
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

// ======================= 📌 5. LIST DOCUMENTS =======================
router.get("/documents", async (req, res) => {
  try {
    const docs = await Document.aggregate([
      {
        $lookup: {
          from: "chunks",
          localField: "_id",
          foreignField: "document",
          as: "chunks",
        },
      },
      {
        $project: {
          title: 1,
          originalName: 1,
          category: 1,
          tags: 1,
          createdAt: 1,
          chunkCount: { $size: "$chunks" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.json(docs);
  } catch (err) {
    console.error("❌ List documents error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// ======================= 📌 6. UPDATE DOCUMENT (rename / tags / category) =======================
router.patch("/document/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, tags } = req.body;

    const update = {};
    if (typeof title === "string") update.title = title;
    if (typeof category === "string") update.category = category;
    if (Array.isArray(tags)) update.tags = tags;

    const doc = await Document.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    res.json(doc);
  } catch (err) {
    console.error("❌ Update document error:", err);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// ======================= 📌 7. DELETE DOCUMENT =======================
router.delete("/document/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    await Chunk.deleteMany({ document: id });
    await Document.findByIdAndDelete(id);

    res.json({ message: "Document and its chunks deleted successfully." });
  } catch (err) {
    console.error("❌ Delete document error:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

module.exports = router;
