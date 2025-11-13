-- Update author_profiles table to ensure proper schema
-- Add updated_at column if it doesn't exist
ALTER TABLE public.author_profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create or replace function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for author_profiles
DROP TRIGGER IF EXISTS update_author_profiles_updated_at ON public.author_profiles;
CREATE TRIGGER update_author_profiles_updated_at
    BEFORE UPDATE ON public.author_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_author_profiles_author_type 
ON public.author_profiles(author_type);

CREATE INDEX IF NOT EXISTS idx_author_profiles_communication_style 
ON public.author_profiles(communication_style);

CREATE INDEX IF NOT EXISTS idx_author_profiles_created_at 
ON public.author_profiles(created_at);

-- Update RLS policies to ensure proper access control
ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile
DROP POLICY IF EXISTS "Users can view their own author profile" ON public.author_profiles;
CREATE POLICY "Users can view their own author profile"
ON public.author_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy for users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own author profile" ON public.author_profiles;
CREATE POLICY "Users can insert their own author profile"
ON public.author_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update their own author profile" ON public.author_profiles;
CREATE POLICY "Users can update their own author profile"
ON public.author_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure courses table has proper RLS as well
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own courses
DROP POLICY IF EXISTS "Users can view their own courses" ON public.courses;
CREATE POLICY "Users can view their own courses"
ON public.courses FOR SELECT
USING (auth.uid() = author_id);

-- Policy for users to insert their own courses
DROP POLICY IF EXISTS "Users can insert their own courses" ON public.courses;
CREATE POLICY "Users can insert their own courses"
ON public.courses FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Policy for users to update their own courses
DROP POLICY IF EXISTS "Users can update their own courses" ON public.courses;
CREATE POLICY "Users can update their own courses"
ON public.courses FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Add missing columns to courses table if needed
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger for courses updated_at
DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
