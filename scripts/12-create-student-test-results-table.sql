-- Create table for storing student test results
CREATE TABLE IF NOT EXISTS public.student_test_results (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  student_email character varying NOT NULL,
  course_id uuid NOT NULL,
  element_id character varying NOT NULL,
  result jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT student_test_results_pkey PRIMARY KEY (id),
  CONSTRAINT student_test_results_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
  CONSTRAINT unique_student_element_attempt UNIQUE (student_email, course_id, element_id, ((result->>'attemptNumber')::integer))
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_test_results_student_course 
ON public.student_test_results (student_email, course_id);

CREATE INDEX IF NOT EXISTS idx_student_test_results_element 
ON public.student_test_results (element_id);

-- Enable RLS
ALTER TABLE public.student_test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Students can view their own test results" ON public.student_test_results
  FOR SELECT USING (true);

CREATE POLICY "Students can insert their own test results" ON public.student_test_results
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.student_test_results TO authenticated;
GRANT ALL ON public.student_test_results TO anon;
