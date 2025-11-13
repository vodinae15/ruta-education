-- Setup complete student access system
-- This script ensures all tables and policies are properly configured for student access management

-- 1. Ensure students table has proper structure
CREATE TABLE IF NOT EXISTS public.students (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
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

-- 4. Ensure student_course_access table exists with proper structure
CREATE TABLE IF NOT EXISTS public.student_course_access (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  first_accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  progress jsonb NULL DEFAULT '{}',
  CONSTRAINT student_course_access_pkey PRIMARY KEY (id),
  CONSTRAINT student_course_access_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
  CONSTRAINT student_course_access_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses (id) ON DELETE CASCADE,
  CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
) TABLESPACE pg_default;

-- 5. Create indexes for student_course_access
CREATE INDEX IF NOT EXISTS idx_student_course_access_student_id ON public.student_course_access(student_id);
CREATE INDEX IF NOT EXISTS idx_student_course_access_course_id ON public.student_course_access(course_id);
CREATE INDEX IF NOT EXISTS idx_student_course_access_last_accessed ON public.student_course_access(last_accessed_at);

-- 6. Disable RLS temporarily to fix access issues
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_course_access DISABLE ROW LEVEL SECURITY;

-- 7. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view their own student data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert their own student data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update their own student data" ON public.students;
DROP POLICY IF EXISTS "Service role can access all student data" ON public.students;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.students;

DROP POLICY IF EXISTS "Students can view their own course access" ON public.student_course_access;
DROP POLICY IF EXISTS "Students can insert their own course access" ON public.student_course_access;
DROP POLICY IF EXISTS "Students can update their own course access" ON public.student_course_access;
DROP POLICY IF EXISTS "Authenticated users can access their course data" ON public.student_course_access;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.student_course_access;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.student_course_access;

-- 8. Grant necessary permissions
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
GRANT ALL ON public.student_course_access TO authenticated;
GRANT ALL ON public.student_course_access TO service_role;

-- 9. Enable RLS with proper policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_course_access ENABLE ROW LEVEL SECURITY;

-- 10. Create comprehensive RLS policies for students table
-- Allow authenticated users to manage their own student record
CREATE POLICY "Students can manage their own data" ON public.students
  FOR ALL USING (
    auth.uid()::text = user_id OR 
    email = auth.jwt() ->> 'email' OR
    auth.role() = 'service_role'
  );

-- Allow course authors to view student data for their courses
CREATE POLICY "Authors can view students for their courses" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_course_access sca
      JOIN public.courses c ON sca.course_id = c.id
      WHERE sca.student_id = students.id
      AND c.author_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- 11. Create comprehensive RLS policies for student_course_access table
-- Allow students to view their own course access
CREATE POLICY "Students can view their own course access" ON public.student_course_access
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE user_id = auth.uid() OR email = auth.jwt() ->> 'email'
    ) OR
    auth.role() = 'service_role'
  );

-- Allow students to update their own course access (for progress tracking)
CREATE POLICY "Students can update their own course access" ON public.student_course_access
  FOR UPDATE USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE user_id = auth.uid() OR email = auth.jwt() ->> 'email'
    ) OR
    auth.role() = 'service_role'
  );

-- Allow course authors to manage access to their courses
CREATE POLICY "Authors can manage access to their courses" ON public.student_course_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = student_course_access.course_id 
      AND courses.author_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- 12. Create function to automatically update last_accessed_at
CREATE OR REPLACE FUNCTION update_last_accessed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. Create trigger to automatically update last_accessed_at on student_course_access
DROP TRIGGER IF EXISTS update_student_course_access_last_accessed ON public.student_course_access;
CREATE TRIGGER update_student_course_access_last_accessed
  BEFORE UPDATE ON public.student_course_access
  FOR EACH ROW
  EXECUTE FUNCTION update_last_accessed_at();

-- 14. Create function to automatically update updated_at for students
CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 15. Create trigger to automatically update updated_at for students
DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION update_students_updated_at();

-- 16. Add comments for documentation
COMMENT ON TABLE public.students IS 'Students table for storing student profiles and test results';
COMMENT ON TABLE public.student_course_access IS 'Junction table linking students to courses they have access to';
COMMENT ON COLUMN public.students.user_id IS 'Reference to auth.users.id for Supabase Auth integration';
COMMENT ON COLUMN public.students.email IS 'Student email address (unique)';
COMMENT ON COLUMN public.students.student_type IS 'Determined student learning type from test';
COMMENT ON COLUMN public.students.test_results IS 'JSON object containing test answers and results';
COMMENT ON COLUMN public.student_course_access.progress IS 'JSON object tracking student progress in the course';

-- 17. Create view for easy access to student course information
CREATE OR REPLACE VIEW public.student_course_info AS
SELECT 
  sca.id as access_id,
  sca.student_id,
  sca.course_id,
  sca.first_accessed_at,
  sca.last_accessed_at,
  sca.progress,
  s.email as student_email,
  s.student_type,
  s.test_results,
  c.title as course_title,
  c.description as course_description,
  c.author_id,
  au.email as author_email
FROM public.student_course_access sca
JOIN public.students s ON sca.student_id = s.id
JOIN public.courses c ON sca.course_id = c.id
LEFT JOIN auth.users au ON c.author_id = au.id;

-- 18. Grant permissions on the view
GRANT SELECT ON public.student_course_info TO authenticated;
GRANT SELECT ON public.student_course_info TO service_role;

-- 19. Create RLS policy for the view
ALTER VIEW public.student_course_info SET (security_invoker = true);

-- 20. Final verification queries
DO $$
BEGIN
  RAISE NOTICE 'Student access system setup completed successfully!';
  RAISE NOTICE 'Tables created/updated: students, student_course_access';
  RAISE NOTICE 'Policies created: comprehensive RLS policies for both tables';
  RAISE NOTICE 'Triggers created: automatic timestamp updates';
  RAISE NOTICE 'View created: student_course_info for easy querying';
  RAISE NOTICE 'Permissions granted: authenticated and service_role users';
END $$;
