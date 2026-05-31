-- Workout Photo Logs
-- One photo per session, private to owner, stored in Supabase Storage bucket "workout-photos"

CREATE TABLE IF NOT EXISTS workout_photo_logs (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_session_id UUID        NOT NULL,
  workout_date       DATE        NOT NULL,
  image_path         TEXT        NOT NULL,   -- Storage path: {user_id}/{session_id}/original.jpg
  image_width        INTEGER,
  image_height       INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, workout_session_id)
);

ALTER TABLE workout_photo_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own photo logs"
  ON workout_photo_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_workout_photo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workout_photo_updated_at
  BEFORE UPDATE ON workout_photo_logs
  FOR EACH ROW EXECUTE FUNCTION update_workout_photo_updated_at();
