export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export type TabView = 'guest' | 'admin';

export interface HotelConfig {
  hotelName: string;
  systemInstruction: string;
}

export interface PdfContext {
  name: string;
  data: string; // base64
  mimeType: string;
}

export interface AppStats {
  totalSessions: number;
  totalMessages: number;
  topics: { name: string; count: number }[];
}
