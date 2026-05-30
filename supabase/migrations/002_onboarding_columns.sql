ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  ADD COLUMN IF NOT EXISTS goal TEXT CHECK (goal IN ('muscle_gain', 'fat_loss', 'strength', 'endurance', 'general')),
  ADD COLUMN IF NOT EXISTS experience TEXT CHECK (experience IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS workout_frequency INTEGER CHECK (workout_frequency BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
