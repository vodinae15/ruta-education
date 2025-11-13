-- Create author_profiles table for storing author test results and personalization data
CREATE TABLE IF NOT EXISTS author_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  author_type TEXT NOT NULL CHECK (author_type IN ('Новичок', 'Оратор', 'Методист', 'Автор на вдохновении', 'Загруженный эксперт', 'Педагог с эмпатией', 'Практик-рационал', 'Интуитивный автор')),
  style_axis TEXT NOT NULL CHECK (style_axis IN ('говорю', 'пишу', 'структурирую', 'миксую')),
  motivation_axis TEXT NOT NULL CHECK (motivation_axis IN ('опыт', 'доход', 'знания', 'польза', 'комфорт')),
  barrier_axis TEXT NOT NULL CHECK (barrier_axis IN ('перегруз', 'страх', 'уверенность', 'время')),
  test_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id ON author_profiles(user_id);

-- Enable RLS
ALTER TABLE author_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for authors to access their own profiles
CREATE POLICY "Authors can view own profile" ON author_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authors can insert own profile" ON author_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can update own profile" ON author_profiles
  FOR UPDATE USING (auth.uid() = user_id);
