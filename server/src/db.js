import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, 'game.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS quizzes (
    id         TEXT    PRIMARY KEY,
    title      TEXT    NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS questions (
    id          TEXT    PRIMARY KEY,
    quiz_id     TEXT    NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    text        TEXT    NOT NULL,
    time_limit  INTEGER NOT NULL DEFAULT 20,
    type        TEXT    NOT NULL DEFAULT 'single',
    order_index INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS answers (
    id           TEXT    PRIMARY KEY,
    question_id  TEXT    NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text         TEXT    NOT NULL,
    is_correct   INTEGER NOT NULL DEFAULT 0,
    order_index  INTEGER NOT NULL
  );
`);

// Migration: add type column to existing databases
try { db.exec("ALTER TABLE questions ADD COLUMN type TEXT NOT NULL DEFAULT 'single'"); } catch (_) {}
try { db.exec('ALTER TABLE questions ADD COLUMN image_url TEXT'); } catch (_) {}

export { db, randomUUID };
