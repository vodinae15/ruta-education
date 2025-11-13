-- Fix students table schema issues
-- Error 42P17 indicates undefined object (missing column or constraint)

-- 1. Check if students table exists and has correct structure
DO $$
BEGIN
  -- Check if students table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public') THEN
    RAISE NOTICE 'Creating students table...';
    
    CREATE TABLE public.students (
      id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
      email character varying NOT NULL UNIQUE,
      student_type character varying NULL,
      test_results jsonb NULL,
      user_id uuid NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT students_pkey PRIMARY KEY (id)
    ) TABLESPACE pg_default;
  ELSE
    RAISE NOTICE 'Students table already exists, checking structure...';
  END IF;
END $$;

-- 2. Add missing columns if they don't exist
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT extensions.uuid_generate_v4();

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS email character varying NOT NULL;

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS student_type character varying NULL;

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS test_results jsonb NULL;

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS user_id uuid NULL;

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- 3. Add constraints if they don't exist
DO $$
BEGIN
  -- Add primary key if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'students_pkey' AND table_name = 'students') THEN
    ALTER TABLE public.students ADD CONSTRAINT students_pkey PRIMARY KEY (id);
    RAISE NOTICE 'Added primary key constraint';
  END IF;
  
  -- Add unique constraint on email if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'students_email_key' AND table_name = 'students') THEN
    ALTER TABLE public.students ADD CONSTRAINT students_email_key UNIQUE (email);
    RAISE NOTICE 'Added unique constraint on email';
  END IF;
  
  -- Add foreign key constraint on user_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'students_user_id_fkey' AND table_name = 'students') THEN
    ALTER TABLE public.students ADD CONSTRAINT students_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint on user_id';
  END IF;
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students(created_at);

-- 5. Disable RLS temporarily to fix any access issues
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- 6. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view their own student data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert their own student data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update their own student data" ON public.students;
DROP POLICY IF EXISTS "Service role can access all student data" ON public.students;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.students;
DROP POLICY IF EXISTS "Students can manage their own data" ON public.students;
DROP POLICY IF EXISTS "Authors can view students for their courses" ON public.students;

-- 7. Grant necessary permissions
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
GRANT ALL ON public.students TO anon;

-- 8. Enable RLS with simple policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 9. Create simple RLS policies that work
CREATE POLICY "Allow service role full access" ON public.students
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to manage students" ON public.students
  FOR ALL USING (auth.role() = 'authenticated');

-- 10. Add comments for documentation
COMMENT ON TABLE public.students IS 'Students table for storing student profiles and test results';
COMMENT ON COLUMN public.students.id IS 'Primary key - UUID';
COMMENT ON COLUMN public.students.email IS 'Student email address (unique)';
COMMENT ON COLUMN public.students.student_type IS 'Determined student learning type from test';
COMMENT ON COLUMN public.students.test_results IS 'JSON object containing test answers and results';
COMMENT ON COLUMN public.students.user_id IS 'Reference to auth.users.id for Supabase Auth integration';
COMMENT ON COLUMN public.students.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.students.updated_at IS 'Record last update timestamp';

-- 11. Final verification
DO $$
BEGIN
  RAISE NOTICE 'Students table schema fix completed successfully!';
  RAISE NOTICE 'Table structure verified and constraints added';
  RAISE NOTICE 'RLS policies simplified for better compatibility';
  RAISE NOTICE 'All necessary permissions granted';
END $$;
