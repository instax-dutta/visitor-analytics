-- Visitor Analytics reference schema (PostgreSQL 14+)
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS analytics_records (
  id            text      NOT NULL,
  project_id    text      NOT NULL,
  session_id    text      NOT NULL,
  timestamp     bigint    NOT NULL,
  page_path     text      NOT NULL,
  referrer      text,
  schema_version integer  NOT NULL DEFAULT 1,
  form_factor   text      NOT NULL DEFAULT 'unknown',
  browser_name  text      NOT NULL DEFAULT 'unknown',
  os            text      NOT NULL DEFAULT 'unknown',
  effective_type text     NOT NULL DEFAULT 'unknown',
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  data          jsonb     NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, id)
);

CREATE INDEX IF NOT EXISTS idx_records_project_time
  ON analytics_records (project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_records_project_session
  ON analytics_records (project_id, session_id);
CREATE INDEX IF NOT EXISTS idx_records_project_path
  ON analytics_records (project_id, page_path);
CREATE INDEX IF NOT EXISTS idx_records_project_formfactor
  ON analytics_records (project_id, form_factor);
CREATE INDEX IF NOT EXISTS idx_records_data_gin
  ON analytics_records USING gin (data jsonb_path_ops);

COMMENT ON TABLE analytics_records IS
  'Raw analytics records ingested from the Visitor Analytics SDK. The full record lives in the data jsonb column; extracted columns support common dashboard breakdowns and filtering.';
