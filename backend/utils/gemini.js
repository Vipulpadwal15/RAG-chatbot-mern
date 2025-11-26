// backend/utils/gemini.js
const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY not set in .env");
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function getEmbedding(text) {
  const url = `${GEMINI_BASE}/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;

  const resp = await axios.post(url, {
    content: { parts: [{ text }] },
  });

  const values = resp.data.embedding.values; // array of floats
  return values;
}

async function generateAnswerWithContext(question, contextText) {
  const url = `${GEMINI_BASE}/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
You are an AI assistant for a RAG chatbot.
Answer the question strictly using the CONTEXT. 
If the answer is not in context, say you don't know based on the document.

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
    candidates[0]?.content?.parts?.map((p) => p.text).join("") || "No answer.";
  return text;
}

async function summarizeLongText(text) {
  const url = `${GEMINI_BASE}/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
Summarize the following document into 8-12 bullet points.
Focus on main ideas, key concepts and important points.

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
    candidates[0]?.content?.parts?.map((p) => p.text).join("") || "No summary.";
  return summary;
}

module.exports = {
  getEmbedding,
  generateAnswerWithContext,
  summarizeLongText,
};
