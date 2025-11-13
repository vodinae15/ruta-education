-- Create students table for student authentication and management
CREATE TABLE IF NOT EXISTS public.students (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  student_type character varying NULL,
  test_results jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create policy for students to access their own data
CREATE POLICY "Students can view their own data" ON public.students
  FOR SELECT USING (email = current_setting('app.current_student_email', true));

CREATE POLICY "Students can insert their own data" ON public.students
  FOR INSERT WITH CHECK (email = current_setting('app.current_student_email', true));

CREATE POLICY "Students can update their own data" ON public.students
  FOR UPDATE USING (email = current_setting('app.current_student_email', true));
