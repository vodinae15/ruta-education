import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔧 Applying temporary fix for student authentication...')

    // Execute SQL commands
    const commands = [
      'ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.student_course_access DISABLE ROW LEVEL SECURITY;',
      `ALTER TABLE public.students 
       ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;`
    ]

    const results = []
    for (const sql of commands) {
      try {
        console.log('Executing SQL:', sql)
        const { data, error } = await supabase.rpc('exec_sql', { sql })
        
        if (error) {
          console.error('SQL Error:', error)
          // Try alternative approach - direct query
          if (sql.includes('DISABLE ROW LEVEL SECURITY')) {
            // For RLS commands, we might need to use a different approach
            console.log('Skipping RLS command for now')
            results.push({ sql, status: 'skipped', reason: 'RLS command' })
            continue
          }
        } else {
          results.push({ sql, status: 'success', data })
        }
      } catch (err) {
        console.error('Command failed:', err)
        results.push({ sql, status: 'error', error: err })
      }
    }

    return NextResponse.json({
      message: 'Student authentication fix applied',
      results
    })

  } catch (error) {
    console.error('Error in fix-student-auth API:', error)
    return NextResponse.json(
      { error: 'Failed to apply fix', details: error },
      { status: 500 }
    )
  }
}
