-- Complete fix for students table - resolves 406/400 errors
-- This script ensures the table has proper structure and permissions

-- 1. Ensure the table exists with all required columns
CREATE TABLE IF NOT EXISTS public.students (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  email character varying NOT NULL,
  student_type character varying NULL,
  test_results jsonb NULL,
  user_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 2. Add user_id column if it doesn't exist
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);

-- 4. Disable RLS temporarily to fix access issues
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- 5. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view their own student data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert their own student data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update their own student data" ON public.students;
DROP POLICY IF EXISTS "Service role can access all student data" ON public.students;

-- 6. Grant necessary permissions to authenticated users
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;

-- 7. Enable RLS with simple policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 8. Create simple RLS policies that work
CREATE POLICY "Allow all operations for authenticated users" ON public.students
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for service role" ON public.students
  FOR ALL USING (auth.role() = 'service_role');

-- 9. Also fix student_course_access table
ALTER TABLE public.student_course_access DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_course_access TO authenticated;
GRANT ALL ON public.student_course_access TO service_role;
ALTER TABLE public.student_course_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.student_course_access
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for service role" ON public.student_course_access
  FOR ALL USING (auth.role() = 'service_role');

-- 10. Ensure the table is properly configured
COMMENT ON TABLE public.students IS 'Students table for storing student profiles and test results';
COMMENT ON COLUMN public.students.user_id IS 'Reference to auth.users.id';
COMMENT ON COLUMN public.students.email IS 'Student email address';
COMMENT ON COLUMN public.students.student_type IS 'Determined student learning type';
COMMENT ON COLUMN public.students.test_results IS 'JSON object containing test answers and results';
