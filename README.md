📄 RAG Chatbot – Multi-Language AI PDF + Website Chat Assistant

A full-stack MERN + Gemini-powered Retrieval Augmented Generation chatbot that allows users to upload PDFs or ingest Websites and ask questions in English, Hindi, or Marathi — and the bot replies in the same language, using your documents as knowledge.

No hallucination — answers come only from your uploaded sources.

🚀 Features
Feature	Status
PDF Upload + Chunk Embedding	✔
Website URL Ingestion (text extraction)	✔
Multi-Language Chat (Hindi/Marathi/English)	✔
Chat across all documents	✔
Rename, Delete, Tag Documents	✔
AI Summary + Tools Panel	✔
Real Vector-based RAG Search	✔
Response based purely on context (no hallucination)	✔
🧠 Multi-Language RAG

You can ask in:

English → "What is supervised learning?"
Hindi   → "इस PDF में supervised learning क्या है?"
Marathi → "या PDF मध्ये supervised learning म्हणजे काय?"


And AI will answer in the same language, pulling facts only from your documents.

🛠 Tech Stack
Frontend

React + Vite

Axios API Service

Dark UI Minimal Layout

Backend

Node.js + Express

Gemini API → Embeddings + Chat Completion

Cosine Similarity Ranking

pdf-parse for file decoding

axios for website scraping

Database

MongoDB + Mongoose
Stores documents, chunks & embeddings.
RAG-chatbot-mern/
│── backend/
│   ├── models/Document.js
│   ├── models/Chunk.js
│   ├── routes/ragRoutes.js    <-- PDF + Website ingest + Chat
│   ├── utils/gemini.js        <-- Multi-language RAG Support
│   ├── server.js
│
│── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── components/
│   │   │   ├── DocumentUpload.jsx
│   │   │   ├── DocumentSelector.jsx
│   │   │   ├── ToolsPanel.jsx
│   │   │   ├── ChatBox.jsx
│   │   ├── App.css
│
├── README.md ← (You are here)
├── .gitignore
├── package.json
🔧 Setup Guide
1️⃣ Backend Setup
bash
Copy code
cd backend
npm install
node server.js
Create .env inside backend/

env
Copy code
PORT=5000
MONGO_URI=your_mongo_connection
GEMINI_API_KEY=your_gemini_key
2️⃣ Frontend Setup
bash
Copy code
cd frontend
npm install
npm run dev
Access UI:

👉 http://localhost:5173

🥇 Usage Flow
Upload a PDF OR Enter a website URL

The system extracts + chunks + stores embeddings

Ask questions in any language

AI responds using chunks as context

View, rename, delete, and manage document knowledge
