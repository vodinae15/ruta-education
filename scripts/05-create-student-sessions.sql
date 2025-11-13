-- Create student_sessions table for storing student progress and personalization
CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_identifier TEXT, -- Can be email or anonymous ID
  student_type TEXT CHECK (student_type IN ('визуал', 'аудиал', 'кинестетик')),
  feedback_type TEXT CHECK (feedback_type IN ('прямой', 'поддерживающий', 'самостоятельный')),
  test_results JSONB,
  progress JSONB DEFAULT '{}'::jsonb,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  current_module INTEGER DEFAULT 1,
  completed_modules INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_sessions_course_id ON student_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_identifier ON student_sessions(student_identifier);
CREATE INDEX IF NOT EXISTS idx_student_sessions_activity ON student_sessions(last_activity);

-- Enable RLS
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies - students can access their own sessions
CREATE POLICY "Students can view own sessions" ON student_sessions
  FOR SELECT USING (true); -- We'll handle access control in the application

CREATE POLICY "Students can insert sessions" ON student_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Students can update own sessions" ON student_sessions
  FOR UPDATE USING (true);

-- Authors can view sessions for their courses
CREATE POLICY "Authors can view course sessions" ON student_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = student_sessions.course_id 
      AND courses.author_id = auth.uid()
    )
  );
