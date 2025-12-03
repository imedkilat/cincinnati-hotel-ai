// config.ts
export const API_BASE =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env &&
    (import.meta as any).env.VITE_API_BASE) ||
  "https://cincinnati-hotel-ai.onrender.com";

export const API = {
  uploadPdf: `${API_BASE}/api/admin/pdf`,
  stats: `${API_BASE}/api/admin/stats`,
  chat: `${API_BASE}/api/chat/message`,
  escalate: `${API_BASE}/api/chat/escalate`,
};

