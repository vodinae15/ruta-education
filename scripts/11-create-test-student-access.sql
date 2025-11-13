-- Create test student and give access to all courses from test@mail.ru author
DO $$
DECLARE
    test_student_id uuid;
    course_record RECORD;
BEGIN
    -- Insert or get test student
    INSERT INTO students (email, student_type, created_at)
    VALUES ('teststudent@mail.ru', NULL, NOW())
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO test_student_id;
    
    -- If student already exists, get their ID
    IF test_student_id IS NULL THEN
        SELECT id INTO test_student_id FROM students WHERE email = 'teststudent@mail.ru';
    END IF;
    
    -- Give access to all courses from test@mail.ru author
    FOR course_record IN 
        SELECT c.id as course_id
        FROM courses c
        JOIN auth.users u ON c.author_id = u.id
        WHERE u.email = 'test@mail.ru'
        AND c.is_published = true
    LOOP
        INSERT INTO student_course_access (
            student_id, 
            course_id, 
            first_accessed_at, 
            last_accessed_at,
            progress
        )
        VALUES (
            test_student_id,
            course_record.course_id,
            NOW(),
            NOW(),
            '{}'::jsonb
        )
        ON CONFLICT (student_id, course_id) DO UPDATE SET
            last_accessed_at = NOW();
    END LOOP;
    
    RAISE NOTICE 'Test student teststudent@mail.ru has been given access to all courses from test@mail.ru';
END $$;
