// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const ragRoutes = require("./routes/ragRoutes");

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/rag", ragRoutes);

app.get("/", (req, res) => {
  res.send("RAG Chatbot backend is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
