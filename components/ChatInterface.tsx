import React, { useState, useEffect, useRef } from "react";
import { HOTEL_NAME, SUGGESTED_QUESTIONS } from "../constants";
import {
  IconArrowLeft,
  IconBot,
  IconSend,
  IconSparkles,
  IconUser,
} from "./Icons";
import { API } from "../config";

interface ChatInterfaceProps {
  onBack: () => void;
}

type Message = {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
};

const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=2525&auto=format&fit=crop";

const INITIAL_MESSAGES: Message[] = [
  {
    id: "init-1",
    text: `Hi, I am the ${HOTEL_NAME} assistant. How can I help you today?`,
    sender: "bot",
    timestamp: new Date(),
  },
];

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // On mount: restore sessionId + load history
  useEffect(() => {
    const savedSessionId = localStorage.getItem("ch_session_id");
    if (savedSessionId) {
      setSessionId(savedSessionId);
      loadChatHistory(savedSessionId);
    } else {
      // First time visitor
      setMessages(INITIAL_MESSAGES);
      setIsLoadingHistory(false);
    }
  }, []);

  // On mount: restore sessionId + load history
  useEffect(() => {
    const savedSessionId = localStorage.getItem("ch_session_id");
    if (savedSessionId) {
      setSessionId(savedSessionId);
      loadChatHistory(savedSessionId);
    } else {
      setMessages(INITIAL_MESSAGES);
      setIsLoadingHistory(false);
    }
  }, []); // ← Empty dependency array: runs only on first mount

  // Auto-scroll
  useEffect(() => {
    if (!isLoadingHistory) scrollToBottom();
  }, [messages, isTyping]);

  // Fetch history
  const loadChatHistory = async (sid: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API.chat}/history?sessionId=${sid}`);
      if (res.ok) {
        const history = await res.json();
        const formatted = history.map((m: any) => ({
          id: m.id || cryptoRandomId(),
          text: m.text,
          sender: m.sender,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(formatted.length > 0 ? formatted : INITIAL_MESSAGES);
      } else {
        setMessages(INITIAL_MESSAGES);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
      setMessages(INITIAL_MESSAGES);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // New: State for escalate form
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [escalateFormData, setEscalateFormData] = useState({
    name: "",
    email: "",
    phone: "",
    question: "",
  });
  const [formFadingOut, setFormFadingOut] = useState(false); // For fade-out animation

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, showEscalateForm]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newUserMsg: Message = {
      id: cryptoRandomId(),
      text,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");
    setIsTyping(true);

    const botId = cryptoRandomId();
    setMessages((prev) => [
      ...prev,
      { id: botId, text: "", sender: "bot", timestamp: new Date() },
    ]);

    try {
      const r = await fetch(API.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId ?? undefined,
        }),
      });

      const data = await r.json();
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem("ch_session_id", data.sessionId);
      }

      const reply =
        data.reply ?? "Sorry, I don't have that information right now.";

      setMessages((prev) =>
        prev.map((m) => (m.id === botId ? { ...m, text: reply } : m))
      );

      // New: If cannot answer, show escalate form
      if (!data.canAnswer) {
        setEscalateFormData((prev) => ({ ...prev, question: text }));
        setShowEscalateForm(true);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botId
            ? { ...m, text: "Network error. Please try again." }
            : m
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  // New: Handle escalate form submit
  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const transcript = messages
      .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
      .join("\n\n");

    const payload = {
      ...escalateFormData,
      transcript,
      sessionId,
    };

    try {
      const r = await fetch(API.escalate || "/api/chat/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        // Fade out form
        setFormFadingOut(true);
        setTimeout(() => {
          setShowEscalateForm(false);
          setFormFadingOut(false);
          alert("Your question has been escalated successfully!");
        }, 500); // Match fade-out duration
      } else {
        alert("Failed to escalate. Please try again.");
      }
    } catch (err) {
      console.error("Escalate error:", err);
      alert("Network error during escalation.");
    }
  };

  // New: Handle form input changes
  const handleEscalateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEscalateFormData((prev) => ({ ...prev, [name]: value }));
  };

  // New: Cancel form (fade out)
  const handleEscalateCancel = () => {
    setFormFadingOut(true);
    setTimeout(() => {
      setShowEscalateForm(false);
      setFormFadingOut(false);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleNewChat = () => {
    localStorage.removeItem("ch_session_id");
    setSessionId(null);
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 relative">
        {/* Decorative Header Strip */}
        <div className="h-32 bg-slate-900 relative overflow-hidden shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{ backgroundImage: `url(${HERO_IMAGE_URL})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
          <button
            onClick={onBack}
            className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors z-20"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Header */}
        <div className="px-6 pb-4 -mt-12 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white text-hotel-900 flex items-center justify-center text-base font-serif font-bold shadow-md">
              CH
            </div>
            <div>
              <p className="text-xl font-bold text-white">{HOTEL_NAME}</p>
              <p className="text-xs text-slate-300 font-medium -mt-0.5">
                Hotel Assistant
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col gap-4 no-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`flex gap-3 max-w-[80%] ${
                  msg.sender === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-hotel-900 flex items-center justify-center flex-shrink-0 mt-auto shadow-sm">
                  {msg.sender === "user" ? (
                    <IconUser className="w-4 h-4" />
                  ) : (
                    <IconBot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={`p-4 text-sm leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-ocean-600 text-white rounded-2xl rounded-br-none"
                      : "bg-white text-slate-700 rounded-2xl rounded-bl-none border border-slate-200/60"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
              <span
                className={`text-[10px] text-slate-400/60 mt-1.5 ${
                  msg.sender === "user" ? "mr-12" : "ml-12"
                }`}
              >
                {formatTime(msg.timestamp)}
              </span>
            </div>
          ))}

          {isTyping && (
            <div className="flex flex-col items-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-hotel-900 flex items-center justify-center flex-shrink-0 mt-auto shadow-sm">
                  <IconBot className="w-4 h-4" />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-200/60 shadow-sm flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400/60 mt-1.5 ml-12">
                Typing...
              </span>
            </div>
          )}

          {/* New: Escalate Form (shows when canAnswer is false) */}
          {showEscalateForm && (
            <div
              className={`flex justify-start animate-${
                formFadingOut ? "fadeOut" : "fadeIn"
              }`}
            >
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md max-w-md">
                <h3 className="text-sm font-bold mb-4 text-slate-800">
                  Escalate Your Question
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  I couldn't find an answer in our knowledge base. Please
                  provide your details, and we'll escalate this to the team.
                </p>
                <form onSubmit={handleEscalateSubmit} className="space-y-3">
                  <input
                    type="text"
                    name="name"
                    value={escalateFormData.name}
                    onChange={handleEscalateChange}
                    placeholder="Your Name"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    value={escalateFormData.email}
                    onChange={handleEscalateChange}
                    placeholder="Your Email"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={escalateFormData.phone}
                    onChange={handleEscalateChange}
                    placeholder="Your Phone (optional)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                  />
                  <textarea
                    name="question"
                    value={escalateFormData.question}
                    onChange={handleEscalateChange}
                    placeholder="Your Question"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md resize-none"
                    rows={3}
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleEscalateCancel}
                      className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm bg-ocean-600 text-white rounded-md hover:bg-ocean-700"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] z-20 shrink-0">
          <div className="mb-3">
            <div className="text-[10px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              Suggested questions
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-ocean-50 hover:bg-ocean-100 text-ocean-700 rounded-full text-xs font-medium transition-colors border border-ocean-100"
                >
                  <IconSparkles className="w-3 h-3" />
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-2 border border-slate-200 rounded-xl p-1 pr-2 shadow-sm focus-within:ring-2 focus-within:ring-ocean-100 focus-within:border-ocean-300 transition-all bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about check-in, rooms, parking..."
              className="flex-1 px-4 py-3 text-sm outline-none bg-transparent placeholder-slate-400 text-slate-700"
              autoFocus
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              className="p-2.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:hover:bg-ocean-600 transition-all shadow-sm"
            >
              <IconSend className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            The assistant only answers from the official hotel PDF. For booking
            changes, please contact reception.
          </p>
        </div>
      </div>

      {/* Inline CSS for fade animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(10px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-fadeOut {
          animation: fadeOut 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default ChatInterface;
