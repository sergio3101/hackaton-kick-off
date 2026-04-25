export type Level = "junior" | "middle" | "senior";
export type SessionStatus = "draft" | "active" | "finished";
export type QuestionType = "voice" | "coding";
export type Verdict = "correct" | "partial" | "incorrect" | "skipped";

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface TokenOut {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface Topic {
  name: string;
  description: string;
}

export interface BankQuestion {
  id: number;
  topic: string;
  level: Level;
  prompt: string;
}

export interface RequirementsOut {
  id: number;
  title: string;
  summary: string;
  topics: Topic[];
  created_at: string;
}

export interface RequirementsDetailOut extends RequirementsOut {
  bank: BankQuestion[];
}

export interface SessionItem {
  id: number;
  idx: number;
  type: QuestionType;
  topic: string;
  prompt_text: string;
  answer_text: string;
  verdict: Verdict | null;
  rationale: string;
}

export interface SessionOut {
  id: number;
  requirements_id: number;
  selected_topics: string[];
  selected_level: Level;
  status: SessionStatus;
  coding_task_prompt: string;
  coding_task_language: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface SessionDetailOut extends SessionOut {
  items: SessionItem[];
}

export interface SummaryOut {
  correct: number;
  partial: number;
  incorrect: number;
  skipped: number;
  overall: string;
}

export interface ReportOut {
  session: SessionOut;
  summary: SummaryOut | null;
  items: SessionItem[];
}
