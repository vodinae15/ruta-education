-- Fix RLS policies for students table to work with Supabase Auth
-- Drop existing policies
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;

-- Create new policies that work with Supabase Auth
-- Allow authenticated users to view their own student record
CREATE POLICY "Authenticated users can view their own student data" ON public.students
  FOR SELECT USING (auth.uid()::text = user_id OR email = auth.jwt() ->> 'email');

-- Allow authenticated users to insert their own student record
CREATE POLICY "Authenticated users can insert their own student data" ON public.students
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR email = auth.jwt() ->> 'email');

-- Allow authenticated users to update their own student record
CREATE POLICY "Authenticated users can update their own student data" ON public.students
  FOR UPDATE USING (auth.uid()::text = user_id OR email = auth.jwt() ->> 'email');

-- Allow service role to access all student data (for admin operations)
CREATE POLICY "Service role can access all student data" ON public.students
  FOR ALL USING (auth.role() = 'service_role');
