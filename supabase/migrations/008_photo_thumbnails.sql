-- Add thumbnail storage path and performance indexes to workout_photo_logs

ALTER TABLE workout_photo_logs
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- Fast lookup by user + date (all list/calendar queries)
CREATE INDEX IF NOT EXISTS idx_wpl_user_date
  ON workout_photo_logs (user_id, workout_date DESC);

-- Fast lookup by user + insert time (profile streak, home page)
CREATE INDEX IF NOT EXISTS idx_wpl_user_created
  ON workout_photo_logs (user_id, created_at DESC);
