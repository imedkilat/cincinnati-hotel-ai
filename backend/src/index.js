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
app.use(express.json());

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

// In-memory stats for now
let stats = {
  totalSessions: 0,
  topics: {}, // { Rooms: 10, Restaurant: 5 }
};

let sessions = {
  // [sessionId]: {
  //   questions: number,
  //   unansweredCount: number,
  //   startedAt: string,
  //   lastUnansweredQuestion?: string
  // }
};

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
app.get("/api/admin/stats", (req, res) => {
  const topicsArray = Object.entries(stats.topics || {}).map(
    ([name, count]) => ({
      name,
      count,
    })
  );

  // Build session list
  const allSessions = Object.entries(sessions || {}).map(([id, info]) => ({
    sessionId: id,
    questionCount: info.questions || 0,
    unansweredCount: info.unansweredCount || 0,
    startedAt: info.startedAt,
    lastUnansweredQuestion: info.lastUnansweredQuestion || null,
  }));

  // Sort newest first and limit, e.g. last 10 sessions
  const recentSessions = allSessions
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
    .slice(0, 10);

  const lastUpdated = new Date().toISOString();

  res.json({
    totalSessions: stats.totalSessions || allSessions.length || 0,
    topics: topicsArray,
    recentSessions,
    lastUpdated,
    currentPdf: currentPdfMeta,
  });
});

// -------- Chat routes --------

// Chat message: frontend -> backend -> n8n -> backend -> frontend
app.post("/api/chat/message", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!message) return res.status(400).json({ error: "Missing message" });

  try {
    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        message,
        hotelInfo: hotelText || "", // send extracted PDF text to n8n
      }),
    });

    if (!n8nRes.ok) {
      const errText = await n8nRes.text();
      console.error("n8n error:", n8nRes.status, errText);
      return res
        .status(500)
        .json({ error: "Failed to get response from n8n workflow" });
    }

    const n8nData = await n8nRes.json();
    const result = Array.isArray(n8nData) ? n8nData[0] : n8nData;

    const answer = result.answer || result.reply || "";
    const topic = result.topic || "Uncategorized";
    const canAnswer =
      typeof result.canAnswer === "boolean" ? result.canAnswer : true;

    // --- session tracking ---
    // Fall back if somehow sessionId is missing
    const sessionKey =
      sessionId ||
      `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if (!sessions[sessionKey]) {
      sessions[sessionKey] = {
        questions: 0,
        unansweredCount: 0,
        startedAt: new Date().toISOString(),
      };
      // Count a new session only when we first see this id
      stats.totalSessions = (stats.totalSessions || 0) + 1;
    }

    // Increment questions for this session
    sessions[sessionKey].questions += 1;

    // Increment unanswered if the bot couldn't answer from PDF
    if (!canAnswer) {
      sessions[sessionKey].unansweredCount += 1;
      sessions[sessionKey].lastUnansweredQuestion = message;
    }

    // Topic stats
    stats.topics[topic] = (stats.topics[topic] || 0) + 1;

    res.json({ answer, topic, canAnswer });
  } catch (err) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate answer from n8n or AI" });
  }
});

// Escalate unanswered question (called from frontend contact form)
app.post("/api/chat/escalate", async (req, res) => {
  const { sessionId, question, conversation, name, email, phone } = req.body;

  try {
    const n8nRes = await fetch(N8N_ESCALATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        question,
        conversation,
        name,
        email,
        phone,
      }),
    });

    if (!n8nRes.ok) {
      console.error("n8n escalate error status", n8nRes.status);
      // still tell frontend ok so user doesn't see an error
      return res.json({ ok: false });
    }

    // optional: read n8n JSON
    let data;
    try {
      data = await n8nRes.json();
      console.log("Escalate n8n response:", data);
    } catch {
      data = {};
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Error calling n8n escalate webhook", err);
    // don't blow up the UI, just log
    return res.json({ ok: false });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log("Backend listening on port", port);
});
