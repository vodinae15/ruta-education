-- ============================================
-- ПОЛНАЯ МИГРАЦИЯ БАЗЫ ДАННЫХ RUTA EDUCATION
-- ============================================
-- Этот скрипт создает все необходимые таблицы в правильном порядке
-- Выполните его в Supabase Dashboard > SQL Editor
-- ============================================

-- ============================================
-- 1. AUTHOR PROFILES
-- ============================================
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_author_profiles_user_id ON author_profiles(user_id);

ALTER TABLE author_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own profile" ON author_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authors can insert own profile" ON author_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can update own profile" ON author_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 2. COURSES
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_courses_author_id ON courses(author_id);
CREATE INDEX IF NOT EXISTS idx_courses_unique_link ON courses(unique_link);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own courses" ON courses
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authors can insert own courses" ON courses
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own courses" ON courses
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Public can view published courses" ON courses
  FOR SELECT USING (status = 'published');

-- ============================================
-- 3. COURSE MODULES
-- ============================================
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL CHECK (module_number BETWEEN 1 AND 9),
  title TEXT NOT NULL,
  description TEXT,
  content JSONB DEFAULT '[]'::jsonb,
  is_completed BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, module_number)
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_order ON course_modules(course_id, order_index);

ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage own course modules" ON course_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_modules.course_id 
      AND courses.author_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published course modules" ON course_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_modules.course_id 
      AND courses.status = 'published'
    )
  );

-- ============================================
-- 4. CONTENT BLOCKS
-- ============================================
CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('header', 'video', 'text', 'image', 'test', 'discussion', 'file', 'reading', 'quiz')),
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_blocks_module_id ON content_blocks(module_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_order ON content_blocks(module_id, order_index);

ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can manage own content blocks" ON content_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      WHERE cm.id = content_blocks.module_id 
      AND c.author_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published content blocks" ON content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      WHERE cm.id = content_blocks.module_id 
      AND c.status = 'published'
    )
  );

-- ============================================
-- 5. STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own record" ON students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own record" ON students
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own record" ON students
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 6. STUDENT COURSE ACCESS
-- ============================================
CREATE TABLE IF NOT EXISTS student_course_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  access_granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_student_course_access_student ON student_course_access(student_id);
CREATE INDEX IF NOT EXISTS idx_student_course_access_course ON student_course_access(course_id);

ALTER TABLE student_course_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own access" ON student_course_access
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = student_course_access.student_id 
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can manage access to own courses" ON student_course_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = student_course_access.course_id 
      AND courses.author_id = auth.uid()
    )
  );

-- ============================================
-- 7. STUDENT SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}'::jsonb,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_student ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_course ON student_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_module ON student_sessions(module_id);

ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own sessions" ON student_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = student_sessions.student_id 
      AND students.user_id = auth.uid()
    )
  );

-- ============================================
-- 8. STUDENT TEST RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS student_test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  test_data JSONB NOT NULL,
  results JSONB,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_test_results_student ON student_test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_student_test_results_completed ON student_test_results(completed_at);

ALTER TABLE student_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own test results" ON student_test_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = student_test_results.student_id 
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own test results" ON student_test_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students 
      WHERE students.id = student_test_results.student_id 
      AND students.user_id = auth.uid()
    )
  );

-- ============================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================
-- Все таблицы созданы!
-- Проверьте в Supabase Dashboard > Table Editor

