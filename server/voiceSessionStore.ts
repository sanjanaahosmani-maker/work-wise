import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { ExperienceLevel } from '../src/types';
import type {
  SpeechTurnMetrics,
  VoiceInterviewType,
  VoiceSessionReport,
} from '../src/utils/voiceMetrics';

export interface StoredVoiceTurn {
  id: number;
  sessionId: string;
  turnIndex: number;
  question: string;
  idealAnswer: string;
  isFollowUp: boolean;
  userAnswer: string | null;
  metrics: SpeechTurnMetrics | null;
  hasAudio: boolean;
  createdAt: string;
}

export interface StoredVoiceSession {
  id: string;
  role: string;
  interviewType: VoiceInterviewType;
  difficulty: ExperienceLevel;
  targetQuestions: number;
  consentGranted: boolean;
  saveRawAudio: boolean;
  status: 'active' | 'completed';
  createdAt: string;
  completedAt: string | null;
  turns: StoredVoiceTurn[];
  report: VoiceSessionReport | null;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'intervyou.db');

let dbInstance: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS voice_sessions (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      interview_type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      target_questions INTEGER NOT NULL,
      consent_granted INTEGER NOT NULL,
      save_raw_audio INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      report_json TEXT
    );
    CREATE TABLE IF NOT EXISTS voice_turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      turn_index INTEGER NOT NULL,
      question TEXT NOT NULL,
      ideal_answer TEXT NOT NULL,
      is_follow_up INTEGER NOT NULL DEFAULT 0,
      user_answer TEXT,
      metrics_json TEXT,
      has_audio INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES voice_sessions(id) ON DELETE CASCADE
    );
  `);
  dbInstance = db;
  return db;
}

export function createVoiceSession(params: {
  id: string;
  role: string;
  interviewType: VoiceInterviewType;
  difficulty: ExperienceLevel;
  targetQuestions: number;
  consentGranted: boolean;
  saveRawAudio: boolean;
  firstQuestion: string;
  firstIdealAnswer: string;
}): StoredVoiceSession {
  const db = getDb();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO voice_sessions (
      id, role, interview_type, difficulty, target_questions,
      consent_granted, save_raw_audio, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  ).run(
    params.id,
    params.role,
    params.interviewType,
    params.difficulty,
    params.targetQuestions,
    params.consentGranted ? 1 : 0,
    params.saveRawAudio ? 1 : 0,
    createdAt
  );

  db.prepare(
    `INSERT INTO voice_turns (
      session_id, turn_index, question, ideal_answer, is_follow_up, created_at
    ) VALUES (?, 0, ?, ?, 0, ?)`
  ).run(params.id, params.firstQuestion, params.firstIdealAnswer, createdAt);

  return getVoiceSession(params.id)!;
}

export function getVoiceSession(sessionId: string): StoredVoiceSession | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, role, interview_type, difficulty, target_questions,
              consent_granted, save_raw_audio, status, created_at, completed_at, report_json
       FROM voice_sessions WHERE id = ?`
    )
    .get(sessionId) as
    | {
        id: string;
        role: string;
        interview_type: VoiceInterviewType;
        difficulty: ExperienceLevel;
        target_questions: number;
        consent_granted: number;
        save_raw_audio: number;
        status: 'active' | 'completed';
        created_at: string;
        completed_at: string | null;
        report_json: string | null;
      }
    | undefined;

  if (!row) return null;

  const turnRows = db
    .prepare(
      `SELECT id, session_id, turn_index, question, ideal_answer, is_follow_up,
              user_answer, metrics_json, has_audio, created_at
       FROM voice_turns WHERE session_id = ? ORDER BY turn_index ASC`
    )
    .all(sessionId) as Array<{
    id: number;
    session_id: string;
    turn_index: number;
    question: string;
    ideal_answer: string;
    is_follow_up: number;
    user_answer: string | null;
    metrics_json: string | null;
    has_audio: number;
    created_at: string;
  }>;

  const turns: StoredVoiceTurn[] = turnRows.map((t) => ({
    id: t.id,
    sessionId: t.session_id,
    turnIndex: t.turn_index,
    question: t.question,
    idealAnswer: t.ideal_answer,
    isFollowUp: t.is_follow_up === 1,
    userAnswer: t.user_answer,
    metrics: t.metrics_json ? (JSON.parse(t.metrics_json) as SpeechTurnMetrics) : null,
    hasAudio: t.has_audio === 1,
    createdAt: t.created_at,
  }));

  return {
    id: row.id,
    role: row.role,
    interviewType: row.interview_type,
    difficulty: row.difficulty,
    targetQuestions: row.target_questions,
    consentGranted: row.consent_granted === 1,
    saveRawAudio: row.save_raw_audio === 1,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    turns,
    report: row.report_json ? (JSON.parse(row.report_json) as VoiceSessionReport) : null,
  };
}

export function recordVoiceAnswerTurn(params: {
  sessionId: string;
  turnIndex: number;
  userAnswer: string;
  metrics: SpeechTurnMetrics;
  hasAudio: boolean;
}): void {
  const db = getDb();
  db.prepare(
    `UPDATE voice_turns
     SET user_answer = ?, metrics_json = ?, has_audio = ?
     WHERE session_id = ? AND turn_index = ?`
  ).run(
    params.userAnswer,
    JSON.stringify(params.metrics),
    params.hasAudio ? 1 : 0,
    params.sessionId,
    params.turnIndex
  );
}

export function appendVoiceQuestionTurn(params: {
  sessionId: string;
  turnIndex: number;
  question: string;
  idealAnswer: string;
  isFollowUp: boolean;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO voice_turns (
      session_id, turn_index, question, ideal_answer, is_follow_up, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    params.sessionId,
    params.turnIndex,
    params.question,
    params.idealAnswer,
    params.isFollowUp ? 1 : 0,
    new Date().toISOString()
  );
}

export function completeVoiceSession(
  sessionId: string,
  report: VoiceSessionReport
): void {
  const db = getDb();
  db.prepare(
    `UPDATE voice_sessions
     SET status = 'completed', completed_at = ?, report_json = ?
     WHERE id = ?`
  ).run(report.completedAt, JSON.stringify(report), sessionId);
}

export function listCompletedVoiceReports(limit = 20): VoiceSessionReport[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT report_json
       FROM voice_sessions
       WHERE status = 'completed' AND report_json IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{ report_json: string }>;

  const reports: VoiceSessionReport[] = [];
  for (const r of rows) {
    try {
      reports.push(JSON.parse(r.report_json) as VoiceSessionReport);
    } catch {
      // Ignore corrupted row
    }
  }
  return reports.reverse();
}
