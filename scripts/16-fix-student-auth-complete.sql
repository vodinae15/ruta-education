-- Complete fix for student authentication issues
-- This script fixes RLS policies and adds missing columns

-- 1. Add user_id column to students table if it doesn't exist
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);

-- 3. Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;

-- 4. Create new RLS policies that work with Supabase Auth
-- Allow authenticated users to view their own student record
CREATE POLICY "Authenticated users can view their own student data" ON public.students
  FOR SELECT USING (
    auth.uid()::text = user_id OR 
    email = auth.jwt() ->> 'email' OR
    auth.role() = 'service_role'
  );

-- Allow authenticated users to insert their own student record
CREATE POLICY "Authenticated users can insert their own student data" ON public.students
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id OR 
    email = auth.jwt() ->> 'email' OR
    auth.role() = 'service_role'
  );

-- Allow authenticated users to update their own student record
CREATE POLICY "Authenticated users can update their own student data" ON public.students
  FOR UPDATE USING (
    auth.uid()::text = user_id OR 
    email = auth.jwt() ->> 'email' OR
    auth.role() = 'service_role'
  );

-- 5. Also fix student_course_access table RLS if needed
-- Drop existing policies
DROP POLICY IF EXISTS "Students can manage their own sessions" ON public.student_course_access;

-- Create new policy for student_course_access
CREATE POLICY "Authenticated users can access their course data" ON public.student_course_access
  FOR ALL USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE user_id = auth.uid()::text OR email = auth.jwt() ->> 'email'
    ) OR
    auth.role() = 'service_role'
  );
