-- Update students table to add user_id field for Supabase Auth integration
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);

-- Update RLS policies to work with Supabase Auth
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;

-- Create new policies that work with Supabase Auth
CREATE POLICY "Students can view their own data" ON public.students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own data" ON public.students
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own data" ON public.students
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow service role to manage all student data
CREATE POLICY "Service role can manage all student data" ON public.students
  FOR ALL USING (auth.role() = 'service_role');


