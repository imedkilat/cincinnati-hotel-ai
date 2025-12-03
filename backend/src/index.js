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
let currentPdfMeta = null; // { filename, uploadedAt }

let currentPdfPath = null;
let hotelText = ""; // extracted text from the uploaded hotel PDF

// -------- Admin routes --------
// Upload hotel PDF
app.post("/api/admin/pdf", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });

  try {
    currentPdfPath = req.file.path;

    // Read and extract text from the PDF
    const dataBuffer = fs.readFileSync(currentPdfPath);
    const parsed = await pdfParse(dataBuffer);
    hotelText = parsed.text || "";

    currentPdfMeta = {
      filename: req.file.originalname,
      uploadedAt: new Date().toISOString(),
    };

    console.log("PDF uploaded, extracted text length:", hotelText.length);

    return res.json({
      ok: true,
      path: currentPdfPath,
      textLength: hotelText.length,
    });
  } catch (err) {
    console.error("Error parsing PDF", err);
    return res.status(500).json({ error: "Failed to parse PDF" });
  }
});

// Get stats
app.get("/api/admin/stats", (_req, res) => {
  const topicsArr = Object.entries(stats.topics || {}).map(([topic, count]) => ({ topic, count }));
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
// Chat message: frontend -> backend -> n8n -> backend -> frontend
import crypto from "node:crypto";

// single sources of truth (keep these ONLY once in the file)
const sessions = {};                      // { [sessionId]: { questions, unansweredCount, startedAt, status } }
const recentSessions = [];                // newest first [{ id, questionCount, status, startTime }]
const stats = { totalSessions: 0, topics: {}, unansweredQuestions: 0, currentPdf: null };


// Chat message: frontend -> backend -> n8n -> backend -> frontend
app.post("/api/chat/message", async (req, res) => {
  const { sessionId: clientSid, message } = req.body || {};
  if (!message) return res.status(400).json({ error: "Missing message" });

  const sessionKey = clientSid || crypto.randomUUID();

  const payload = {
    sessionId: sessionKey,
    message,
    hotelInfo: hotelText || "",
  };

  console.log("Sending to n8n:", JSON.stringify(payload, null, 2));
  console.log("CHAT →", N8N_WEBHOOK_URL, "sid:", sessionKey, "payloadKeys:", Object.keys(payload));

  let reply = "Sorry, I don't have that information right now.";
  let topic = "Uncategorized";
  let canAnswer = true;

  try {
    const r = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (r.ok) {
      const raw = await r.text();
      let data; try { data = JSON.parse(raw); } catch { data = raw; }
      const out = Array.isArray(data) ? data[0] : data;
      reply = out?.answer || out?.reply || reply;
      topic = out?.topic || topic;
      canAnswer = typeof out?.canAnswer === "boolean" ? out.canAnswer : true;
    } else {
      console.error("n8n chat error:", r.status, await r.text());
      canAnswer = false;
      topic = "System";
      reply = "Sorry, I can’t reach the knowledge workflow right now.";
    }
  } catch (err) {
    console.error("Chat error:", err);
    canAnswer = false;
    topic = "System";
    reply = "Sorry, something went wrong.";
  }

  // track session + recent list
  const nowIso = new Date().toISOString();
  if (!sessions[sessionKey]) {
    sessions[sessionKey] = { questions: 0, unansweredCount: 0, startedAt: nowIso, status: "Resolved" };
    stats.totalSessions = (stats.totalSessions || 0) + 1;
    recentSessions.unshift({ id: sessionKey, questionCount: 0, status: "Resolved", startTime: nowIso });
    if (recentSessions.length > 50) recentSessions.pop();
  }

  sessions[sessionKey].questions += 1;
  const rs = recentSessions.find(s => s.id === sessionKey);
  if (rs) rs.questionCount += 1;

  if (!canAnswer) {
    sessions[sessionKey].unansweredCount += 1;
    sessions[sessionKey].status = "Needs Review";
    if (rs) rs.status = "Needs Review";
    stats.unansweredQuestions = (stats.unansweredQuestions || 0) + 1;
  }

  res.json({ reply, topic, canAnswer, sessionId: sessionKey });
});


// Escalate unanswered question (called from frontend contact form)
app.post("/api/chat/escalate", async (req, res) => {
  const { name, email, phone, question, transcript, sessionId } = req.body || {};

  if (sessionId && sessions[sessionId]) {
    sessions[sessionId].status = "Needs Review";
    const rs = recentSessions.find(s => s.id === sessionId);
    if (rs) rs.status = "Needs Review";
  }

  const payload = { sessionId, sessionID: sessionId, name, email, phone, question, transcript };

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
