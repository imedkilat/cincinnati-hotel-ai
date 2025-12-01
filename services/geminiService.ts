import { Message } from "../types";
import { API_BASE } from "../config";

let currentSystemInstruction: string | null = null;
let currentSessionId: string | null = null;

export interface ChatResponse {
  answer: string;
  topic?: string;
  canAnswer: boolean;
}

export const initializeChat = (systemInstruction: string) => {
  currentSystemInstruction = systemInstruction;
};

export const getCurrentSessionId = () => currentSessionId;

export const sendMessageToGemini = async (
  message: string,
  history: Message[]
): Promise<ChatResponse> => {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      answer: "Please type a question about the hotel so I can help.",
      topic: "General",
      canAnswer: true,
    };
  }

  if (!currentSessionId) {
    currentSessionId = `session-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  const payload = {
    sessionId: currentSessionId,
    message: trimmed,
    systemInstruction: currentSystemInstruction,
    history: history.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      text: m.text,
      timestamp: m.timestamp,
    })),
  };

  const res = await fetch(`${API_BASE}/api/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Backend error: ${res.status}`);
  }

  const data: any = await res.json();

  const answerRaw =
    typeof data.answer === "string"
      ? data.answer
      : typeof data.reply === "string"
      ? data.reply
      : "";

  const answer =
    answerRaw ||
    "Sorry, I couldn't generate a response from the hotel information.";

  const topic =
    typeof data.topic === "string" ? data.topic : undefined;

  const canAnswer =
    typeof data.canAnswer === "boolean" ? data.canAnswer : true;

  return { answer, topic, canAnswer };
};
