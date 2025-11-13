-- Create student_sessions table for anonymous student authentication
CREATE TABLE IF NOT EXISTS public.student_sessions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  email character varying NOT NULL,
  course_id uuid NOT NULL,
  student_type character varying NULL,
  test_results jsonb NULL,
  progress jsonb NULL DEFAULT '{"completed_modules": [], "current_module": 0}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT student_sessions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_sessions_email_course ON public.student_sessions USING btree (email, course_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_course_id ON public.student_sessions USING btree (course_id);

-- Enable RLS
ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_sessions
-- Students can read and update their own sessions
CREATE POLICY "Students can manage their own sessions" ON public.student_sessions
  FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_student_sessions_updated_at 
  BEFORE UPDATE ON public.student_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
