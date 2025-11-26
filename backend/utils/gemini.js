const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not set in environment variables");
}

// Get embedding vector for text
async function getEmbedding(text) {
  const url = `${GEMINI_BASE}/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;

  const resp = await axios.post(url, {
    content: { parts: [{ text }] },
  });

  const values = resp.data.embedding.values;
  return values;
}

// Generate answer given question + context
async function generateAnswerWithContext(question, contextText) {
  const url = `${GEMINI_BASE}/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
You are an AI assistant for a Retrieval-Augmented Generation (RAG) chatbot.
Answer the QUESTION strictly using the CONTEXT provided.
If the answer is not clearly in the context, say you don't know based on the document.

CONTEXT:
${contextText}

QUESTION:
${question}
`;

  const resp = await axios.post(url, {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  });

  const candidates = resp.data.candidates || [];
  const text =
    candidates[0]?.content?.parts?.map((p) => p.text).join("") ||
    "No answer.";
  return text;
}

// Summarize long text into bullet points
async function summarizeLongText(text) {
  const url = `${GEMINI_BASE}/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
Summarize the following document into 8-12 concise bullet points.
Focus on key ideas, important definitions, and core concepts.

DOCUMENT:
${text}
`;

  const resp = await axios.post(url, {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  });

  const candidates = resp.data.candidates || [];
  const summary =
    candidates[0]?.content?.parts?.map((p) => p.text).join("") ||
    "No summary.";
  return summary;
}

module.exports = {
  getEmbedding,
  generateAnswerWithContext,
  summarizeLongText,
};
