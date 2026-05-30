ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'auto' CHECK (language IN ('auto', 'en', 'ja'));
