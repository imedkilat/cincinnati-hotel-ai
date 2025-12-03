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
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Persist session across page reloads
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem("ch_session_id");
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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

    // placeholder bot bubble we will fill with the reply
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
          sessionId: sessionId ?? undefined, // send if we have it
        }),
      });

      const data = await r.json();
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem("ch_session_id", data.sessionId);
      }

      const reply =
        data.reply ?? "Sorry, I don't have that information right now.";

      // store session id from backend if provided
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem("ch_session_id", data.sessionId);
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === botId ? { ...m, text: reply } : m))
      );
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
        <div className="px-6 pb-4 -mt-12 relative z-10 flex items-end justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full p-1 shadow-lg ring-1 ring-slate-100">
              <div className="w-full h-full bg-hotel-900 rounded-full flex items-center justify-center text-white font-serif font-bold text-lg">
                CH
              </div>
            </div>
            <div className="mb-1">
              <h2 className="font-serif font-bold text-xl text-white drop-shadow-md leading-tight">
                {HOTEL_NAME}
              </h2>
              {sessionId && (
                <p className="text-[10px] text-white/80">
                  Session: {sessionId.slice(0, 8)}…
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </div>
              <span className="text-xs font-semibold text-white">Online</span>
            </div>
            {/* <button
              onClick={handleNewChat}
              className="text-xs px-2 py-1 rounded bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors"
              title="Start a new conversation"
            >
              New chat
            </button> */}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 no-scrollbar">
          <div className="space-y-6">
            <div className="text-center text-[10px] font-bold text-slate-300 my-4 uppercase tracking-widest">
              Today
            </div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${
                    msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-auto shadow-sm ${
                      msg.sender === "user"
                        ? "bg-ocean-600 text-white"
                        : "bg-white border border-slate-200 text-hotel-900"
                    }`}
                  >
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
            <div ref={messagesEndRef} />
          </div>
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
    </div>
  );
};

function cryptoRandomId() {
  // good enough id for UI keys
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default ChatInterface;
