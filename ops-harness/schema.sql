-- Standalone Cloudflare D1: no Viaja customer or travel tables.
CREATE TABLE IF NOT EXISTS ops_tasks (
  task_id TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('todo','in_progress','blocked','completed','cancelled')),
  source TEXT NOT NULL,
  actor TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  notice_state TEXT NOT NULL DEFAULT 'not_due'
    CHECK(notice_state IN ('not_due','pending','sending','sent','failed')),
  whatsapp_message_id TEXT,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_ops_tasks_changed ON ops_tasks(changed_at DESC);
CREATE TABLE IF NOT EXISTS ops_inbound (
  message_id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ops_inbound_received ON ops_inbound(received_at DESC);
