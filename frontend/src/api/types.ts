export type Level = "junior" | "middle" | "senior";
export type SessionStatus = "draft" | "active" | "finished";
export type QuestionType = "voice" | "coding";
export type Verdict = "correct" | "partial" | "incorrect" | "skipped";

export const VERDICT_LABEL_RU: Record<Verdict, string> = {
  correct: "Верно",
  partial: "Частично",
  incorrect: "Неверно",
  skipped: "Пропущено",
};

export function verdictLabel(v: string | null | undefined): string {
  if (!v) return "";
  return VERDICT_LABEL_RU[v as Verdict] ?? v;
}
export type UserRole = "admin" | "user";
export type AssignmentStatus = "assigned" | "started" | "completed" | "published";

export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active?: boolean;
  created_at: string;
}

export interface UserPatch {
  email?: string;
  full_name?: string;
  password?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface AssignmentOut {
  id: number;
  admin_id: number | null;
  user_id: number;
  requirements_id: number;
  selected_topics: string[];
  selected_level: Level;
  mode: "voice" | "text";
  target_duration_min: number;
  status: AssignmentStatus;
  note: string;
  voice?: string | null;
  llm_model?: string | null;
  created_at: string;
}

// Голоса OpenAI Realtime API (актуальный список — не совпадает с TTS-1).
// Старые имена ('onyx'/'fable'/'nova') не поддерживаются — для уже
// сохранённых assignment'ов backend упадёт на дефолтный 'alloy'.
export const TTS_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;
export type TtsVoice = (typeof TTS_VOICES)[number];

export const LLM_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
] as const;
export type LlmModel = (typeof LLM_MODELS)[number];

export interface AssignmentDetailOut extends AssignmentOut {
  user_email: string;
  user_full_name: string;
  requirements_title: string;
  session_id: number | null;
  published_at: string | null;
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
  expected_answer: string;
  explanation: string;
  paste_chars?: number;
  coding_language?: string | null;
}

export type SessionMode = "voice" | "text";

export interface SessionOut {
  id: number;
  user_id?: number;
  requirements_id: number;
  selected_topics: string[];
  selected_level: Level;
  status: SessionStatus;
  coding_task_prompt: string;
  coding_task_language: string;
  target_duration_min: number;
  mode: SessionMode;
  started_at: string | null;
  finished_at: string | null;
  published_at?: string | null;
  assignment_id?: number | null;
  created_at: string;
}

export interface RequirementsStatsOut {
  requirements_id: number;
  sessions_total: number;
  sessions_finished: number;
  avg_score: number;
  last_session_at: string | null;
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
  total_cost_usd: number;
}

export interface TopicStat {
  topic: string;
  answered: number;
  avg_score: number;
}

export interface LevelStat {
  level: Level;
  sessions: number;
}

export interface TrendPoint {
  date: string;
  sessions: number;
  avg_score: number;
}

export interface AnalyticsOverviewOut {
  total_sessions: number;
  finished_sessions: number;
  total_questions_answered: number;
  overall_avg_score: number;
  by_level: LevelStat[];
  by_topic: TopicStat[];
  weak_topics: TopicStat[];
  trend_30d: TrendPoint[];
}

// ─── Voice WebSocket protocol ────────────────────────────────────────────────
// Дискриминированный union серверных сообщений из interview_ws.py.
// Держим в одном месте, чтобы дрифт схемы фронт↔бэк ловился TypeScript-ом,
// а не в рантайме.

export type WsDoneReason = "completed" | "time_up";

export interface WsQuestionMsg {
  type: "question";
  item_id: number;
  idx: number;
  topic: string;
  text: string;
  audio_b64: string;
  is_follow_up: boolean;
  intro_text: string | null;
  intro_audio_b64: string | null;
}

export interface WsTranscriptMsg {
  type: "transcript";
  item_id: number;
  text: string;
}

export interface WsEvaluationMsg {
  type: "evaluation";
  item_id: number;
  verdict: Verdict;
  rationale: string;
  expected_answer: string;
  explanation: string;
}

export interface WsAwaitingNextMsg {
  type: "awaiting_next";
  item_id: number;
}

export interface WsTimeWarningMsg {
  type: "time_warning";
  remaining_sec: number;
}

export interface WsDoneMsg {
  type: "done";
  reason: WsDoneReason;
}

export interface WsErrorMsg {
  type: "error";
  code?: string;
  message?: string;
  recoverable?: boolean;
}

export type WsServerMessage =
  | WsQuestionMsg
  | WsTranscriptMsg
  | WsEvaluationMsg
  | WsAwaitingNextMsg
  | WsTimeWarningMsg
  | WsDoneMsg
  | WsErrorMsg;
