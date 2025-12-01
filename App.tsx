import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Settings,
  MessageSquare,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Message, ChatState, TabView, HotelConfig } from "./types";
import {
  sendMessageToGemini,
  initializeChat,
  getCurrentSessionId,
} from "./services/geminiService";
import { ChatMessage } from "./components/ChatMessage";
import { SuggestionChip } from "./components/SuggestionChip";
import { AdminPanel } from "./components/AdminPanel";
import { API_BASE } from "./config";

const INITIAL_SUGGESTIONS = [
  "What time is check-in?",
  "Is breakfast included?",
  "How do I access the Wi-Fi?",
  "Where is the gym?",
];

const DEFAULT_CONFIG: HotelConfig = {
  hotelName: "Cincinnati Hotel",
  systemInstruction: `You are a dedicated AI concierge for the Cincinnati Hotel. 
  Your goal is to provide exceptional guest service.
  
  Key Hotel Details:
  - Check-in: 3:00 PM, Check-out: 11:00 AM.
  - Breakfast: Served 6:30 AM - 10:00 AM in the Riverview Room. Complimentary for all guests.
  - Wi-Fi: Network "CincyGuest", Password "StayRelaxed".
  - Gym: 24/7 on the 2nd floor. Room key required.
  - Pool: Open 8:00 AM - 10:00 PM on the rooftop.
  
  Tone: Warm, professional, concise, and helpful. Always welcome the guest if it's the start of a conversation.`,
};

// Landing Page Component
const LandingPage = ({ onEnter }: { onEnter: (view: TabView) => void }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20"></div>

      <div className="max-w-xl w-full text-center space-y-12 relative z-10">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 tracking-tight">
            Cincinnati Hotel <br />
            <span className="text-indigo-600 text-4xl md:text-5xl font-serif mt-2 block">
              AI Assistant
            </span>
          </h1>
          <p className="text-gray-500 text-lg font-light tracking-wide">
            Select how you want to enter
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => onEnter("admin")}
            className="w-full sm:w-40 px-6 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 focus:ring-2 focus:ring-gray-200 outline-none"
          >
            Admin
          </button>
          <button
            onClick={() => onEnter("guest")}
            className="w-full sm:w-40 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all duration-200 focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            Chat with Us
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<"landing" | "app">("landing");
  const [activeTab, setActiveTab] = useState<TabView>("guest");
  const [config, setConfig] = useState<HotelConfig>(DEFAULT_CONFIG);
  const [input, setInput] = useState("");
  const [chatState, setChatState] = useState<ChatState>({
    messages: [
      {
        id: "welcome",
        role: "model",
        text: `Hi, I am the ${DEFAULT_CONFIG.hotelName} assistant. How can I help you today?`,
        timestamp: new Date(),
      },
    ],
    isLoading: false,
    error: null,
  });

  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [escalationQuestion, setEscalationQuestion] = useState<string | null>(
    null
  );
  const [escalationStatus, setEscalationStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat when config changes
  useEffect(() => {
    initializeChat(config.systemInstruction);
  }, [config.systemInstruction]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || chatState.isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text,
      timestamp: new Date(),
    };

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));
    setInput("");

    try {
      const result = await sendMessageToGemini(text, chatState.messages);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: result.answer,
        timestamp: new Date(),
      };

      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, botMessage],
        isLoading: false,
      }));

      if (result.canAnswer === false) {
        setShowEscalationForm(true);
        setEscalationQuestion(text);
        setEscalationStatus("idle");
      } else {
        setShowEscalationForm(false);
        setEscalationQuestion(null);
        setEscalationStatus("idle");
      }
    } catch (err) {
      setChatState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Something went wrong. Please try again.",
      }));
    }
  };

  const handleEscalationSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!escalationQuestion || escalationStatus === "submitting") return;

    setEscalationStatus("submitting");

    try {
      const res = await fetch(`${API_BASE}/api/chat/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getCurrentSessionId(),
          question: escalationQuestion,
          conversation: chatState.messages,
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
        }),
      });

      if (!res.ok) {
        throw new Error(`Escalate failed: ${res.status}`);
      }

      const data = await res.json();
      if (data && data.ok) {
        setEscalationStatus("success");
        setContactName("");
        setContactEmail("");
        setContactPhone("");

        // let the fade animation run, then hide the form
        setTimeout(() => {
          setShowEscalationForm(false);
          setEscalationQuestion(null);
          setEscalationStatus("idle");
        }, 500); // matches duration-500
      } else {
        setEscalationStatus("error");
      }
    } catch (err) {
      console.error("Escalation error", err);
      setEscalationStatus("error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!chatState.isLoading && input.trim()) {
        handleSendMessage(input);
      }
    }
  };

  const handleEnter = (tab: TabView) => {
    setActiveTab(tab);
    setView("app");
  };

  const handleBackToLanding = () => {
    setView("landing");
  };

  if (view === "landing") {
    return <LandingPage onEnter={handleEnter} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 sm:py-10 px-4 font-sans text-gray-900 animate-fade-in">
      {/* Navigation */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6">
        <button
          onClick={handleBackToLanding}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors p-2 hover:bg-white rounded-lg"
          title="Back to Home"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Home</span>
        </button>
      </div>

      <div className="w-full max-w-4xl flex-1 flex flex-col h-[640px] max-h-[80vh] overflow-hidden">
        {activeTab === "guest" ? (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-full relative">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-white z-10">
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight font-serif">
                  {config.hotelName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Ask about rooms, check-in, facilities and more.
                </p>
              </div>
              <div className="hidden sm:block">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white scroll-smooth">
              {chatState.messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {chatState.isLoading && (
                <div className="flex w-full mb-6 justify-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                      <Loader2
                        size={16}
                        className="text-indigo-600 animate-spin"
                      />
                    </div>
                    <span className="text-sm text-gray-400">Thinking...</span>
                  </div>
                </div>
              )}

              {chatState.error && (
                <div className="p-4 mb-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
                  {chatState.error}
                </div>
              )}

              {showEscalationForm && (
                <div
                  className={`p-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 transition-opacity duration-500 ${
                    escalationStatus === "success" ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <p className="text-sm font-medium text-amber-800">
                    I couldn't find that information in the current hotel guide.
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Leave your contact details and a hotel team member will get
                    back to you with an answer.
                  </p>
                  {escalationQuestion && (
                    <p className="mt-2 text-xs text-amber-800">
                      Question:{" "}
                      <span className="italic">"{escalationQuestion}"</span>
                    </p>
                  )}

                  <form
                    onSubmit={handleEscalationSubmit}
                    className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Name"
                      className="px-3 py-2 rounded-lg border border-amber-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Email"
                      className="px-3 py-2 rounded-lg border border-amber-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Phone (optional)"
                      className="px-3 py-2 rounded-lg border border-amber-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={escalationStatus === "submitting"}
                      className="sm:col-span-3 mt-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {escalationStatus === "submitting"
                        ? "Sending..."
                        : "Send to hotel team"}
                    </button>
                  </form>

                  {escalationStatus === "success" && (
                    <p className="mt-2 text-xs text-green-700">
                      Thanks, your question has been sent. The team will reach
                      out soon.
                    </p>
                  )}
                  {escalationStatus === "error" && (
                    <p className="mt-2 text-xs text-red-700">
                      Something went wrong sending your details. Please try
                      again later.
                    </p>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 sm:p-8 pt-2 bg-white border-t border-gray-50">
              {/* Suggestion Chips */}
              <div className="flex gap-3 overflow-x-auto pb-4 mb-2 no-scrollbar mask-fade-right">
                {INITIAL_SUGGESTIONS.map((suggestion, index) => (
                  <SuggestionChip
                    key={index}
                    text={suggestion}
                    onClick={() => handleSendMessage(suggestion)}
                  />
                ))}
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about check-in, rooms, parking..."
                  className="w-full pl-5 pr-14 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 text-gray-700 shadow-sm"
                  disabled={chatState.isLoading}
                />
                <button
                  onClick={() => handleSendMessage(input)}
                  disabled={!input.trim() || chatState.isLoading}
                  className={`absolute right-2 p-2.5 rounded-xl transition-all duration-200 ${
                    input.trim() && !chatState.isLoading
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg shadow-indigo-200"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Send size={20} />
                </button>
              </div>
              <div className="mt-3 text-center">
                <p className="text-[10px] text-gray-400">
                  We are Cincinnati Hotel Staff. We are here to help you!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
              <AdminPanel config={config} onUpdateConfig={setConfig} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
