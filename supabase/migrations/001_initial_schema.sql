-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises (system presets + user custom)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL CHECK (muscle_group IN (
    'CHEST','BACK','SHOULDERS','BICEPS','TRICEPS',
    'FOREARMS','QUADS','HAMSTRINGS','GLUTES','CALVES','ABS'
  )),
  equipment TEXT CHECK (equipment IN (
    'BARBELL','DUMBBELL','MACHINE','CABLE','BODYWEIGHT','OTHER'
  )),
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  total_volume_kg NUMERIC(10,2),
  duration_seconds INTEGER,
  body_weight_kg NUMERIC(5,2),
  trained_at DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout sets
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id),
  exercise_name TEXT NOT NULL,
  muscle_group TEXT CHECK (muscle_group IN (
    'CHEST','BACK','SHOULDERS','BICEPS','TRICEPS',
    'FOREARMS','QUADS','HAMSTRINGS','GLUTES','CALVES','ABS'
  )),
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC(6,2),
  reps INTEGER,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout templates
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  exercises JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Body weight records
CREATE TABLE IF NOT EXISTS body_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recorded_at)
);

-- Body photos
CREATE TABLE IF NOT EXISTS body_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  weight_kg NUMERIC(5,2),
  notes TEXT,
  taken_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplement stacks
CREATE TABLE IF NOT EXISTS supplement_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'PRE_WORKOUT','PROTEIN','CREATINE','EAA','OTHER'
  )),
  product_name TEXT NOT NULL,
  brand TEXT,
  affiliate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Exercises policies (system presets visible to all, custom only to owner)
CREATE POLICY "System exercises visible to all" ON exercises FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can manage own exercises" ON exercises FOR ALL USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can manage own sessions" ON workout_sessions FOR ALL USING (auth.uid() = user_id);

-- Sets policies
CREATE POLICY "Users can manage own sets" ON workout_sets FOR ALL
  USING (session_id IN (SELECT id FROM workout_sessions WHERE user_id = auth.uid()));

-- Templates policies
CREATE POLICY "Users can manage own templates" ON workout_templates FOR ALL USING (auth.uid() = user_id);

-- Body weights policies
CREATE POLICY "Users can manage own weights" ON body_weights FOR ALL USING (auth.uid() = user_id);

-- Body photos policies
CREATE POLICY "Users can manage own photos" ON body_photos FOR ALL USING (auth.uid() = user_id);

-- Supplement stacks policies
CREATE POLICY "Users can manage own stacks" ON supplement_stacks FOR ALL USING (auth.uid() = user_id);

-- Badges policies
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Preset exercises
INSERT INTO exercises (user_id, name, muscle_group, equipment, is_custom) VALUES
  (NULL, 'ベンチプレス', 'CHEST', 'BARBELL', FALSE),
  (NULL, 'インクラインベンチプレス', 'CHEST', 'BARBELL', FALSE),
  (NULL, 'ダンベルフライ', 'CHEST', 'DUMBBELL', FALSE),
  (NULL, 'ケーブルフライ', 'CHEST', 'CABLE', FALSE),
  (NULL, 'ディップス', 'CHEST', 'BODYWEIGHT', FALSE),
  (NULL, 'デッドリフト', 'BACK', 'BARBELL', FALSE),
  (NULL, 'ラットプルダウン', 'BACK', 'MACHINE', FALSE),
  (NULL, 'ベントオーバーロウ', 'BACK', 'BARBELL', FALSE),
  (NULL, 'シーテッドロウ', 'BACK', 'CABLE', FALSE),
  (NULL, 'チンニング', 'BACK', 'BODYWEIGHT', FALSE),
  (NULL, 'ショルダープレス', 'SHOULDERS', 'BARBELL', FALSE),
  (NULL, 'ダンベルショルダープレス', 'SHOULDERS', 'DUMBBELL', FALSE),
  (NULL, 'サイドレイズ', 'SHOULDERS', 'DUMBBELL', FALSE),
  (NULL, 'フロントレイズ', 'SHOULDERS', 'DUMBBELL', FALSE),
  (NULL, 'リアデルトフライ', 'SHOULDERS', 'DUMBBELL', FALSE),
  (NULL, 'バーベルカール', 'BICEPS', 'BARBELL', FALSE),
  (NULL, 'ダンベルカール', 'BICEPS', 'DUMBBELL', FALSE),
  (NULL, 'ハンマーカール', 'BICEPS', 'DUMBBELL', FALSE),
  (NULL, 'インクラインダンベルカール', 'BICEPS', 'DUMBBELL', FALSE),
  (NULL, 'トライセップスプレスダウン', 'TRICEPS', 'CABLE', FALSE),
  (NULL, 'スカルクラッシャー', 'TRICEPS', 'BARBELL', FALSE),
  (NULL, 'オーバーヘッドトライセップスエクステンション', 'TRICEPS', 'DUMBBELL', FALSE),
  (NULL, 'リストカール', 'FOREARMS', 'BARBELL', FALSE),
  (NULL, 'スクワット', 'QUADS', 'BARBELL', FALSE),
  (NULL, 'レッグプレス', 'QUADS', 'MACHINE', FALSE),
  (NULL, 'レッグエクステンション', 'QUADS', 'MACHINE', FALSE),
  (NULL, 'ブルガリアンスクワット', 'QUADS', 'DUMBBELL', FALSE),
  (NULL, 'レッグカール', 'HAMSTRINGS', 'MACHINE', FALSE),
  (NULL, 'ルーマニアンデッドリフト', 'HAMSTRINGS', 'BARBELL', FALSE),
  (NULL, 'ヒップスラスト', 'GLUTES', 'BARBELL', FALSE),
  (NULL, 'カーフレイズ', 'CALVES', 'MACHINE', FALSE),
  (NULL, 'クランチ', 'ABS', 'BODYWEIGHT', FALSE),
  (NULL, 'レッグレイズ', 'ABS', 'BODYWEIGHT', FALSE),
  (NULL, 'プランク', 'ABS', 'BODYWEIGHT', FALSE),
  (NULL, 'アブローラー', 'ABS', 'OTHER', FALSE)
ON CONFLICT DO NOTHING;
