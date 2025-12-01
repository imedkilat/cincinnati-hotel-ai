import { Message } from "../types";

let currentSystemInstruction: string | null = null;
let currentSessionId: string | null = null;

export interface ChatResponse {
  answer: string;
  topic?: string;
  canAnswer: boolean;
}

export const initializeChat = (systemInstruction: string) => {
  // Just store it for now; backend can optionally use it later
  currentSystemInstruction = systemInstruction;
};

const getSessionId = () => {
  if (currentSessionId) return currentSessionId;

  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      currentSessionId = (crypto as any).randomUUID();
    } else {
      currentSessionId = Date.now().toString();
    }
  } catch {
    currentSessionId = Date.now().toString();
  }

  return currentSessionId;
};

// under currentSessionId + getSessionId
export const getCurrentSessionId = () => {
  // if chat already created a session, use it
  if (currentSessionId) return currentSessionId;
  // otherwise create one so it is never empty
  return getSessionId();
};


export const sendMessageToGemini = async (
  message: string,
  history: Message[] = []
): Promise<ChatResponse> => {
  try {
    const payload = {
      sessionId: getSessionId(),
      message,
      systemInstruction: currentSystemInstruction,
      history: history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        text: m.text,
        timestamp: m.timestamp,
      })),
    };

    const res = await fetch("/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status}`);
    }

    const data: any = await res.json();

    const answer =
      typeof data.answer === "string"
        ? data.answer
        : typeof data.reply === "string"
        ? data.reply
        : "";

    const canAnswer =
      typeof data.canAnswer === "boolean" ? data.canAnswer : true;

    const topic =
      typeof data.topic === "string" ? data.topic : undefined;

    if (!answer) {
      throw new Error("Invalid response from backend");
    }

    return { answer, topic, canAnswer };
  } catch (error) {
    console.error("Backend /api/chat/message error:", error);
    throw new Error(
      "Sorry, I'm having trouble connecting to the hotel services right now."
    );
  }
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const res = await fetch(`${API_BASE}/api/chat/message`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
