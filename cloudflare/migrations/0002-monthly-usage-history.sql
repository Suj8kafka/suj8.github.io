-- Preserve older aggregate history without keeping daily detail indefinitely.
CREATE TABLE IF NOT EXISTS monthly_metrics (
  month TEXT NOT NULL,
  metric TEXT NOT NULL,
  label TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (month, metric, label)
) WITHOUT ROWID;
