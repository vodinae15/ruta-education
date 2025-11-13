-- Create courses table for storing course information
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  unique_link TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  modules_count INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_author_id ON courses(author_id);
CREATE INDEX IF NOT EXISTS idx_courses_unique_link ON courses(unique_link);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authors can view own courses" ON courses
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authors can insert own courses" ON courses
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own courses" ON courses
  FOR UPDATE USING (auth.uid() = author_id);

-- Public can view published courses by unique link
CREATE POLICY "Public can view published courses" ON courses
  FOR SELECT USING (status = 'published');
