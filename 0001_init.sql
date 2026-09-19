PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  signature TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT 'inbox',
  sender TEXT NOT NULL,
  recipients TEXT NOT NULL,
  cc TEXT NOT NULL DEFAULT '',
  bcc TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  is_starred INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  in_reply_to TEXT,
  message_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  last_used TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, email),
  FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rate_events (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_owner_created
  ON messages(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_owner_folder
  ON messages(owner_id, folder, is_deleted);

CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_contacts_owner
  ON contacts(owner_id, last_used DESC);

CREATE INDEX IF NOT EXISTS idx_rate_key_time
  ON rate_events(key, created_at);
