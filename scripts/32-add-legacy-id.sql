-- Add missing columns to course_lessons for full lesson support
-- This enables full migration from modules.lessons

-- Add legacy_id for backward compatibility
ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS legacy_id TEXT;

-- Add materials array
ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS materials TEXT[] DEFAULT '{}';

-- Add tests array
ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS tests TEXT[] DEFAULT '{}';

-- Add status column
ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_lessons_legacy_id
ON course_lessons(legacy_id)
WHERE legacy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_lessons_status
ON course_lessons(status);

-- Add comments
COMMENT ON COLUMN course_lessons.legacy_id IS 'Original ID from modules.lessons (timestamp or string) for migration compatibility';
COMMENT ON COLUMN course_lessons.materials IS 'Array of material references (URLs, file IDs, etc.)';
COMMENT ON COLUMN course_lessons.tests IS 'Array of test references';
COMMENT ON COLUMN course_lessons.status IS 'Publication status of the lesson';
