import React, { useState } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

function createSessionId() {
  try {
    // works in modern browsers
    return crypto.randomUUID();
  } catch {
    return String(Date.now());
  }
}

export default function ChatPage() {
  const [sessionId] = useState(() => createSessionId());
  const [messages, setMessages] = useState([
    {
      id: "intro",
      from: "bot",
      text: "Hi, I am the Cincinnati Hotel assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [canEscalate, setCanEscalate] = useState(false);
  const [escalation, setEscalation] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [escalationSent, setEscalationSent] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage = {
      id: Date.now() + "-user",
      from: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    setCanEscalate(false);
    setEscalationSent(false);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: trimmed,
        }),
      });

      const data = await res.json();
      console.log("Chat response from backend:", data);

      const botMessage = {
        id: Date.now() + "-bot",
        from: "bot",
        text:
          data.answer ?? "Sorry, I am having trouble answering that right now.",
      };

      setMessages((prev) => [...prev, botMessage]);

      // canAnswer === false → show escalation form
      if (data.canAnswer === false) {
        setCanEscalate(true);
      }
    } catch (err) {
      console.error("Error sending message", err);
      const botMessage = {
        id: Date.now() + "-bot-error",
        from: "bot",
        text: "Sorry, I am having trouble answering that right now.",
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleEscalate(e) {
    e.preventDefault();
    if (!escalation.name || !escalation.email) return;

    try {
      const lastUserQuestion =
        [...messages].reverse().find((m) => m.from === "user")?.text || "";

      const res = await fetch(`${BACKEND_URL}/api/chat/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          question: lastUserQuestion,
          conversation: messages,
          name: escalation.name,
          email: escalation.email,
          phone: escalation.phone,
        }),
      });

      const data = await res.json();
      console.log("Escalate response:", data);

      setEscalationSent(true);
      setCanEscalate(false);
    } catch (err) {
      console.error("Error sending escalation", err);
      // we still hide the form so guest doesn’t feel stuck
      setEscalationSent(true);
      setCanEscalate(false);
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-shell">
        <header className="chat-header">
          <div>
            <h1>Cincinnati Hotel</h1>
            <p>Ask about rooms, check-in, facilities and more.</p>
          </div>
          <div className="chat-session">
            <span>Session</span>
            <code>{sessionId.slice(0, 8)}</code>
          </div>
        </header>

        <main className="chat-main">
          <section className="chat-window">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  "chat-bubble-row " +
                  (m.from === "user"
                    ? "chat-bubble-row-user"
                    : "chat-bubble-row-bot")
                }
              >
                <div
                  className={
                    "chat-bubble " +
                    (m.from === "user" ? "chat-bubble-user" : "chat-bubble-bot")
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
          </section>

          <section className="chat-input-area">
            <form onSubmit={handleSend} className="chat-input-form">
              <input
                type="text"
                placeholder="Ask about check-in, rooms, parking..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
              />
              <button type="submit" disabled={isSending || !input.trim()}>
                {isSending ? "Sending..." : "Send"}
              </button>
            </form>

            {canEscalate && (
              <div className="chat-escalate">
                <h3>We’ll have someone from the hotel contact you</h3>
                <p>
                  The assistant could not find this in the PDF. Leave your
                  details and the team will follow up.
                </p>

                <form onSubmit={handleEscalate} className="chat-escalate-form">
                  <div className="field-row">
                    <label>
                      Name
                      <input
                        type="text"
                        value={escalation.name}
                        onChange={(e) =>
                          setEscalation((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={escalation.email}
                        onChange={(e) =>
                          setEscalation((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Phone (optional)
                    <input
                      type="tel"
                      value={escalation.phone}
                      onChange={(e) =>
                        setEscalation((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <button type="submit">Send to hotel team</button>
                </form>
              </div>
            )}

            {escalationSent && (
              <p className="chat-escalate-thanks">
                Thank you. Someone from the hotel team will get back to you
                using the details you provided.
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
