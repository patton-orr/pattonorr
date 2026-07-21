-- WHOOP data warehouse. Standard Postgres (no vendor-specific features) so it
-- stays portable across providers. Applied via `npm run db:migrate`.

-- Single-row token store (this is a single-user app). Holds the encrypted
-- OAuth token bundle so the cron sync can refresh + call WHOOP without a
-- browser cookie.
CREATE TABLE IF NOT EXISTS whoop_account (
  id             TEXT PRIMARY KEY DEFAULT 'me',
  whoop_user_id  BIGINT,
  tokens         TEXT NOT NULL,           -- AES-GCM encrypted TokenBundle
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whoop_cycle (
  id                  BIGINT PRIMARY KEY,
  start               TIMESTAMPTZ NOT NULL,
  "end"               TIMESTAMPTZ,
  timezone_offset     TEXT,
  score_state         TEXT,
  strain              REAL,
  kilojoule           REAL,
  average_heart_rate  INTEGER,
  max_heart_rate      INTEGER,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS whoop_cycle_start_idx ON whoop_cycle (start DESC);

CREATE TABLE IF NOT EXISTS whoop_recovery (
  cycle_id            BIGINT PRIMARY KEY,
  sleep_id            UUID,
  score_state         TEXT,
  recovery_score      REAL,
  resting_heart_rate  REAL,
  hrv_rmssd_milli     REAL,
  spo2_percentage     REAL,
  skin_temp_celsius   REAL,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS whoop_sleep (
  id                             UUID PRIMARY KEY,
  cycle_id                       BIGINT,
  start                          TIMESTAMPTZ NOT NULL,
  "end"                          TIMESTAMPTZ,
  timezone_offset                TEXT,
  nap                            BOOLEAN,
  score_state                    TEXT,
  respiratory_rate               REAL,
  sleep_performance_percentage   REAL,
  sleep_consistency_percentage   REAL,
  sleep_efficiency_percentage    REAL,
  total_in_bed_time_milli        BIGINT,
  total_awake_time_milli         BIGINT,
  total_light_sleep_time_milli   BIGINT,
  total_slow_wave_sleep_time_milli BIGINT,
  total_rem_sleep_time_milli     BIGINT,
  sleep_cycle_count              INTEGER,
  disturbance_count              INTEGER,
  created_at                     TIMESTAMPTZ,
  updated_at                     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS whoop_sleep_start_idx ON whoop_sleep (start DESC);

CREATE TABLE IF NOT EXISTS whoop_workout (
  id                   UUID PRIMARY KEY,
  start                TIMESTAMPTZ NOT NULL,
  "end"                TIMESTAMPTZ,
  timezone_offset      TEXT,
  sport_name           TEXT,
  score_state          TEXT,
  strain               REAL,
  average_heart_rate   INTEGER,
  max_heart_rate       INTEGER,
  kilojoule            REAL,
  percent_recorded     REAL,
  distance_meter       REAL,
  altitude_gain_meter  REAL,
  altitude_change_meter REAL,
  zone_zero_milli      BIGINT,
  zone_one_milli       BIGINT,
  zone_two_milli       BIGINT,
  zone_three_milli     BIGINT,
  zone_four_milli      BIGINT,
  zone_five_milli      BIGINT,
  created_at           TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS whoop_workout_start_idx ON whoop_workout (start DESC);

-- Generic app settings (single-user), e.g. WHOOP chart smoothing. JSONB so
-- values stay schemaless and portable.
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-resource incremental sync cursor (last record updated_at we ingested).
CREATE TABLE IF NOT EXISTS whoop_sync_state (
  resource     TEXT PRIMARY KEY,   -- 'cycle' | 'recovery' | 'sleep' | 'workout'
  last_synced  TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
