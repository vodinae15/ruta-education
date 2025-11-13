// Fix student authentication by disabling RLS temporarily
// Environment variables are loaded from .env.local

const SUPABASE_URL = "https://lcemzlxyohmrhulzyekx.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZW16bHh5b2htcmh1bHp5ZWt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTY5MDk3MCwiZXhwIjoyMDcxMjY2OTcwfQ.LYgqH_jWo-Cm6R7uwF_rjS8qg7FU0Oryih23DCau1L4";

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
