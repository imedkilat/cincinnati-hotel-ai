import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import fs from "fs";
import pdfParse from "pdf-parse-debugging-disabled";

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// single sources of truth
const sessions = {};
const recentSessions = [];
const stats = {
  totalSessions: 0,
  topics: {},
  unansweredQuestions: 0,
  currentPdf: null,
};

let currentPdfPath = null; // THIS LINE WAS MISSING → THIS IS THE BUG
let currentPdfMeta = null;
let hotelText = ""; // extracted text from the uploaded hotel PDF

// Single webhook URL to your n8n workflow.
// If you change the path in n8n later, update this string.

const N8N_ESCALATE_URL =
  process.env.N8N_ESCALATE_URL ||
  "https://imedkilat.onrender.com/webhook/hotel-escalate";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "https://imedkilat.onrender.com/webhook/hotel-chat";

// Storage for uploaded PDF
const upload = multer({
  dest: path.join(__dirname, "../uploads"),
});

// -------- Admin routes --------
// Upload hotel PDF
app.post("/api/admin/pdf", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    // FIX: Use the correct variable name (with "let" or just assign properly)
    currentPdfPath = req.file.path; // ← this is correct (you already have the var at top)
    // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

    const dataBuffer = fs.readFileSync(currentPdfPath);
    const parsed = await pdfParse(dataBuffer);
    hotelText = parsed.text || "";

    currentPdfMeta = {
      filename: req.file.originalname,
      uploadedAt: new Date().toISOString(),
    };

    // Update stats so admin panel shows the current PDF
    stats.currentPdf = currentPdfMeta;

    console.log("PDF uploaded & parsed successfully:", {
      filename: req.file.originalname,
      size: req.file.size,
      textLength: hotelText.length,
    });

    return res.json({
      ok: true,
      path: currentPdfPath,
      textLength: hotelText.length,
      filename: req.file.originalname,
    });
  } catch (err) {
    console.error("Error parsing PDF:", err.message);
    console.error("File path was:", currentPdfPath);
    return res.status(500).json({
      error: "Failed to parse PDF",
      details: err.message,
    });
  }
});

// Get stats
app.get("/api/admin/stats", (_req, res) => {
  const topicsArr = Object.entries(stats.topics || {}).map(
    ([topic, count]) => ({ topic, count })
  );
  res.json({
    totalSessions: stats.totalSessions || 0,
    unansweredQuestions: stats.unansweredQuestions || 0,
    lastUpdate: new Date().toISOString(),
    currentPdf: stats.currentPdf || null,
    topics: topicsArr,
    recentSessions, // [{ id, questionCount, status, startTime }]
  });
});

// -------- Chat routes --------
import crypto from "node:crypto";

// Chat message: frontend -> backend -> n8n -> backend -> frontend
app.post("/api/chat/message", async (req, res) => {
  const { sessionId: clientSid, message } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing or invalid message" });
  }

  // Generate session ID if not provided (first message)
  const sessionId = clientSid || crypto.randomUUID();

  // THIS IS WHAT n8n WILL RECEIVE
  const payloadToN8n = {
    sessionId, // this MUST be here
    message: message.trim(),
    hotelInfo: hotelText || "",
  };

  console.log("Sending to n8n →", N8N_WEBHOOK_URL);
  console.log("Payload:", JSON.stringify(payloadToN8n, null, 2));

  // THESE 3 LINES ARE THE ONLY THING MISSING
  let reply = "Sorry, I don't have that information right now.";
  let topic = "Uncategorized";
  let canAnswer = true;

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadToN8n),
    });

    if (response.ok) {
      const data = await response.json();
      const out = Array.isArray(data) ? data[0] : data;

      // n8n sends back the real answer → we overwrite the fallback
      reply = out?.answer || out?.reply || reply;
      topic = out?.topic || topic;
      canAnswer = out?.canAnswer !== false;
      // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
      // ADD THIS: Update stats.topics with the new topic count
      if (topic && topic !== "Uncategorized") {
        stats.topics[topic] = (stats.topics[topic] || 0) + 1;
      }
    } else {
      canAnswer = false;
      reply = "I'm having trouble reaching the AI right now.";
    }
  } catch (err) {
    canAnswer = false;
    reply = "Something went wrong. Please try again.";
  }

  // Session tracking
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      questions: 0,
      unansweredCount: 0,
      startedAt: new Date().toISOString(),
      status: "Resolved",
      messages: [],
    };
    stats.totalSessions += 1;
    recentSessions.unshift({
      id: sessionId,
      questionCount: 0,
      status: "Resolved",
      startTime: new Date().toISOString(),
    });
    if (recentSessions.length > 50) recentSessions.pop();
  }

  // After getting reply from n8n, store both user message and bot reply
  sessions[sessionId].messages.push(
    {
      sender: "user",
      text: message.trim(),
      timestamp: new Date().toISOString(),
    },
    { sender: "bot", text: reply, timestamp: new Date().toISOString() }
  );
  sessions[sessionId].questions += 1;
  const recentSession = recentSessions.find((s) => s.id === sessionId);
  if (recentSession) recentSession.questionCount += 1;

  if (!canAnswer) {
    sessions[sessionId].unansweredCount += 1;
    sessions[sessionId].status = "Needs Review";
    if (recentSession) recentSession.status = "Needs Review";
    stats.unansweredQuestions += 1;
  }

  // This is what frontend receives — includes sessionId!
  res.json({
    reply,
    topic,
    canAnswer,
    sessionId, // always include — critical for first message!
  });
});

// New: Get chat history for a session
app.get("/api/chat/history", (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "Missing sessionId" });
  }

  const session = sessions[sessionId];
  if (!session) {
    return res.json([]); // No history
  }

  // Build full conversation from session data
  const history = [];

  // Add all questions and answers (you need to store them!)
  if (session.messages && Array.isArray(session.messages)) {
    history.push(...session.messages);
  }

  res.json(history);
});

// Escalate unanswered question (called from frontend contact form)
app.post("/api/chat/escalate", async (req, res) => {
  const { name, email, phone, question, transcript, sessionId } =
    req.body || {};

  if (sessionId && sessions[sessionId]) {
    sessions[sessionId].status = "Needs Review";
    const rs = recentSessions.find((s) => s.id === sessionId);
    if (rs) rs.status = "Needs Review";
  }

  const payload = {
    sessionId,
    sessionID: sessionId,
    name,
    email,
    phone,
    question,
    transcript,
  };

  try {
    const r = await fetch(N8N_ESCALATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.error("n8n escalate error:", r.status, await r.text());
      return res.status(500).json({ ok: false });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Escalate error:", err);
    res.status(500).json({ ok: false });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log("Backend listening on port", port);
});
