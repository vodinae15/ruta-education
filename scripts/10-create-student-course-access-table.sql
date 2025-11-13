-- Create student_course_access table to track which courses students have access to
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

-- Enable RLS
ALTER TABLE public.student_course_access ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Students can view their own course access" ON public.student_course_access
  FOR SELECT USING (student_id IN (
    SELECT id FROM public.students WHERE email = current_setting('app.current_student_email', true)
  ));

CREATE POLICY "Students can insert their own course access" ON public.student_course_access
  FOR INSERT WITH CHECK (student_id IN (
    SELECT id FROM public.students WHERE email = current_setting('app.current_student_email', true)
  ));

CREATE POLICY "Students can update their own course access" ON public.student_course_access
  FOR UPDATE USING (student_id IN (
    SELECT id FROM public.students WHERE email = current_setting('app.current_student_email', true)
  ));
