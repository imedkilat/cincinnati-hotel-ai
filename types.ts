export enum Sender {
  User = 'user',
  Bot = 'bot',
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
}

export type ViewState = 'landing' | 'chat' | 'admin';

export interface HotelStats {
  sessions: number;
  unanswered: number;
  lastUpdate: Date | null;
  hasFile: boolean;
}

export interface SessionRecord {
  id: string;
  questionCount: number;
  unansweredCount: number;
  startTime: string;
  status: 'Resolved' | 'Needs Review';
}

export interface TopicStat {
  topic: string;
  percentage: number;
  count: number;
}