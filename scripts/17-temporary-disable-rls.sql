-- TEMPORARY FIX: Disable RLS for students table to allow login
-- This is a temporary solution until proper RLS policies are set up

-- Disable RLS temporarily
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- Also disable RLS for student_course_access temporarily
ALTER TABLE public.student_course_access DISABLE ROW LEVEL SECURITY;

-- NOTE: This should be re-enabled with proper policies after testing
