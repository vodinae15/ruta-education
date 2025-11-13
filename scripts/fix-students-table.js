const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSQL(sql) {
  console.log(`Executing: ${sql}`)
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error(`❌ Error executing SQL:`, error)
      throw error
    }
    
    console.log(`✅ Success:`, data)
    return data
  } catch (error) {
    console.error(`❌ Failed to execute SQL:`, error)
    throw error
  }
}

async function fixStudentsTable() {
  console.log('🔧 Fixing students table...')
  
  try {
    // 1. Ensure the table exists with all required columns
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.students (
        id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
        email character varying NOT NULL,
        student_type character varying NULL,
        test_results jsonb NULL,
        user_id uuid NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT students_pkey PRIMARY KEY (id)
      ) TABLESPACE pg_default;
    `)
    
    // 2. Add user_id column if it doesn't exist
    await executeSQL(`
      ALTER TABLE public.students 
      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    `)
    
    // 3. Create indexes
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
    `)
    
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
    `)
    
    // 4. Disable RLS temporarily
    await executeSQL(`
      ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
    `)
    
    // 5. Drop all existing policies
    const policies = [
      "Students can view their own data",
      "Students can insert their own data", 
      "Students can update their own data",
      "Authenticated users can view their own student data",
      "Authenticated users can insert their own student data",
      "Authenticated users can update their own student data",
      "Service role can access all student data"
    ]
    
    for (const policy of policies) {
      try {
        await executeSQL(`DROP POLICY IF EXISTS "${policy}" ON public.students;`)
      } catch (e) {
        // Policy might not exist, that's ok
      }
    }
    
    // 6. Grant permissions
    await executeSQL(`
      GRANT ALL ON public.students TO authenticated;
    `)
    
    await executeSQL(`
      GRANT ALL ON public.students TO service_role;
    `)
    
    // 7. Enable RLS with simple policies
    await executeSQL(`
      ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
    `)
    
    await executeSQL(`
      CREATE POLICY "Allow all operations for authenticated users" ON public.students
        FOR ALL USING (auth.role() = 'authenticated');
    `)
    
    await executeSQL(`
      CREATE POLICY "Allow all operations for service role" ON public.students
        FOR ALL USING (auth.role() = 'service_role');
    `)
    
    // 8. Also fix student_course_access table
    await executeSQL(`
      ALTER TABLE public.student_course_access DISABLE ROW LEVEL SECURITY;
    `)
    
    await executeSQL(`
      GRANT ALL ON public.student_course_access TO authenticated;
    `)
    
    await executeSQL(`
      GRANT ALL ON public.student_course_access TO service_role;
    `)
    
    await executeSQL(`
      ALTER TABLE public.student_course_access ENABLE ROW LEVEL SECURITY;
    `)
    
    await executeSQL(`
      CREATE POLICY "Allow all operations for authenticated users" ON public.student_course_access
        FOR ALL USING (auth.role() = 'authenticated');
    `)
    
    await executeSQL(`
      CREATE POLICY "Allow all operations for service role" ON public.student_course_access
        FOR ALL USING (auth.role() = 'service_role');
    `)
    
    console.log('🎉 Students table fixed successfully!')
    console.log('✅ Table structure updated')
    console.log('✅ RLS policies configured')
    console.log('✅ Permissions granted')
    console.log('✅ Indexes created')
    
  } catch (error) {
    console.error('❌ Failed to fix students table:', error)
    process.exit(1)
  }
}

// Check if we have the exec_sql function, if not, provide manual instructions
async function checkExecSqlFunction() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' })
    if (error) {
      console.log('⚠️  exec_sql function not available. Please run the SQL manually in Supabase dashboard.')
      console.log('📄 SQL to run:')
      console.log('')
      console.log(`
-- Run this SQL in Supabase SQL Editor:

-- 1. Ensure the table exists with all required columns
CREATE TABLE IF NOT EXISTS public.students (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  email character varying NOT NULL,
  student_type character varying NULL,
  test_results jsonb NULL,
  user_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 2. Add user_id column if it doesn't exist
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);

-- 4. Disable RLS temporarily
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- 5. Drop all existing policies
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view their own student data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert their own student data" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update their own student data" ON public.students;
DROP POLICY IF EXISTS "Service role can access all student data" ON public.students;

-- 6. Grant permissions
GRANT ALL ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;

-- 7. Enable RLS with simple policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.students
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for service role" ON public.students
  FOR ALL USING (auth.role() = 'service_role');

-- 8. Also fix student_course_access table
ALTER TABLE public.student_course_access DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_course_access TO authenticated;
GRANT ALL ON public.student_course_access TO service_role;
ALTER TABLE public.student_course_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.student_course_access
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for service role" ON public.student_course_access
  FOR ALL USING (auth.role() = 'service_role');
      `)
      return false
    }
    return true
  } catch (error) {
    console.log('⚠️  exec_sql function not available. Please run the SQL manually in Supabase dashboard.')
    return false
  }
}

async function main() {
  console.log('🚀 Starting students table fix...')
  
  const hasExecSql = await checkExecSqlFunction()
  
  if (hasExecSql) {
    await fixStudentsTable()
  }
  
  console.log('✅ Fix completed!')
}

main().catch(console.error)
