-- Migration: Create course_files table for storing uploaded media files
-- This table stores metadata for images, videos, audio, and documents uploaded to courses

-- Create course_files table
CREATE TABLE IF NOT EXISTS course_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  block_id TEXT, -- ID блока внутри урока (не FK, так как блоки хранятся в JSONB)
  element_id TEXT, -- ID элемента внутри блока
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document')),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  -- Метаданные для медиа файлов
  duration INTEGER, -- длительность для видео/аудио в секундах
  width INTEGER,    -- ширина для изображений/видео
  height INTEGER,   -- высота для изображений/видео
  thumbnail_url TEXT, -- миниатюра для видео
  -- Аудит
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_course_files_course_id ON course_files(course_id);
CREATE INDEX IF NOT EXISTS idx_course_files_lesson_id ON course_files(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_files_file_type ON course_files(file_type);
CREATE INDEX IF NOT EXISTS idx_course_files_uploaded_by ON course_files(uploaded_by);

-- Включаем RLS
ALTER TABLE course_files ENABLE ROW LEVEL SECURITY;

-- Политика: Авторы могут управлять файлами своих курсов
CREATE POLICY "Authors can manage their course files"
  ON course_files
  FOR ALL
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_files.course_id
      AND courses.author_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM course_collaborators
      WHERE course_collaborators.course_id = course_files.course_id
      AND course_collaborators.collaborator_user_id = auth.uid()
    )
  );

-- Политика: Студенты могут просматривать файлы курсов, к которым есть доступ
CREATE POLICY "Students can view course files they have access to"
  ON course_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_course_access
      WHERE student_course_access.course_id = course_files.course_id
      AND student_course_access.student_id = auth.uid()
    )
  );

-- Политика: Публичные курсы доступны всем
CREATE POLICY "Public course files are viewable by all"
  ON course_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_files.course_id
      AND courses.is_published = true
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_course_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_course_files_updated_at ON course_files;
CREATE TRIGGER trigger_update_course_files_updated_at
  BEFORE UPDATE ON course_files
  FOR EACH ROW
  EXECUTE FUNCTION update_course_files_updated_at();

-- Комментарии к таблице
COMMENT ON TABLE course_files IS 'Metadata for files uploaded to courses (images, videos, audio, documents)';
COMMENT ON COLUMN course_files.block_id IS 'ID of the block within the lesson (JSONB reference)';
COMMENT ON COLUMN course_files.element_id IS 'ID of the element within the block (JSONB reference)';
COMMENT ON COLUMN course_files.duration IS 'Duration in seconds for video/audio files';
COMMENT ON COLUMN course_files.thumbnail_url IS 'Thumbnail/preview URL for videos';
