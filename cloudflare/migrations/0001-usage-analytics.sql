-- Daily counters only: no visitor IDs, raw IPs, full URLs or individual events.
CREATE TABLE IF NOT EXISTS daily_metrics (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  label TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (day, metric, label)
) WITHOUT ROWID;
