-- Create content_blocks table for storing individual content blocks within modules
CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('header', 'video', 'text', 'image', 'test', 'discussion', 'file', 'reading', 'quiz')),
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_blocks_module_id ON content_blocks(module_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_order ON content_blocks(module_id, order_index);

-- Enable RLS
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authors can manage own content blocks" ON content_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      WHERE cm.id = content_blocks.module_id 
      AND c.author_id = auth.uid()
    )
  );

-- Public can view blocks of published courses
CREATE POLICY "Public can view published content blocks" ON content_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      WHERE cm.id = content_blocks.module_id 
      AND c.status = 'published'
    )
  );
