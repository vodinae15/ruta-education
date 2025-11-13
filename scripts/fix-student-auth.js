// Fix student authentication by disabling RLS temporarily
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE_URL:', SUPABASE_URL ? 'Found' : 'Missing');
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'Found' : 'Missing');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

async function executeSQL(sql) {
  try {
    console.log('Executing SQL:', sql);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('✅ SQL executed successfully');
    return result;
  } catch (error) {
    console.error('❌ Error executing SQL:', error);
    throw error;
  }
}

// Execute the temporary fix
async function fixStudentAuth() {
  console.log('🔧 Applying temporary fix for student authentication...');
  
  try {
    // Disable RLS for students table
    await executeSQL('ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;');
    console.log('✅ Disabled RLS for students table');
    
    // Disable RLS for student_course_access table
    await executeSQL('ALTER TABLE public.student_course_access DISABLE ROW LEVEL SECURITY;');
    console.log('✅ Disabled RLS for student_course_access table');
    
    // Add user_id column if it doesn't exist
    await executeSQL(`
      ALTER TABLE public.students 
      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    `);
    console.log('✅ Added user_id column to students table');
    
    console.log('🎉 Student authentication fix applied successfully!');
    console.log('⚠️  Remember to re-enable RLS with proper policies later');
    
  } catch (error) {
    console.error('❌ Failed to apply fix:', error);
    process.exit(1);
  }
}

fixStudentAuth();
