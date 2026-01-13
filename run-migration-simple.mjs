import { createClient } from '@supabase/supabase-js';

// Use environment variables directly from process.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  console.error('Looking for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running migration to add priority, state, and district columns...');
    
    // Let's try a simpler approach - run the SQL directly
    const migrationSQL = `
      -- Add priority, state, and district fields to complaints table
      ALTER TABLE public.complaints
      ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
      ADD COLUMN IF NOT EXISTS state TEXT,
      ADD COLUMN IF NOT EXISTS district TEXT;

      -- Add complaint_number serial field if it doesn't exist (for existing tables)
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name='complaints' AND column_name='complaint_number') THEN
              ALTER TABLE public.complaints ADD COLUMN complaint_number SERIAL NOT NULL;
          END IF;
      END $$;

      -- Create indexes for better filtering performance
      CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);
      CREATE INDEX IF NOT EXISTS idx_complaints_state ON public.complaints(state);
      CREATE INDEX IF NOT EXISTS idx_complaints_district ON public.complaints(district);
      CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
      CREATE INDEX IF NOT EXISTS idx_complaints_complaint_number ON public.complaints(complaint_number);
    `;
    
    console.log('Attempting to run migration SQL...');
    
    // Try to execute the SQL using a simple query
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      console.error('Error details:', error.message);
      
      // If exec_sql doesn't work, let's try individual queries
      console.log('Trying individual queries...');
      
      const queries = [
        'ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN (\'Low\', \'Medium\', \'High\'));',
        'ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS state TEXT;',
        'ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS district TEXT;',
        'CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);',
        'CREATE INDEX IF NOT EXISTS idx_complaints_state ON public.complaints(state);',
        'CREATE INDEX IF NOT EXISTS idx_complaints_district ON public.complaints(district);',
        'CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);'
      ];
      
      for (const query of queries) {
        try {
          const { error: queryError } = await supabase.rpc('exec_sql', { sql: query });
          if (queryError) {
            console.log('Query failed:', query.substring(0, 50) + '...', queryError.message);
          } else {
            console.log('✓ Query executed successfully');
          }
        } catch (err) {
          console.log('Query error:', err.message);
        }
      }
    } else {
      console.log('✓ Migration completed successfully!');
      console.log('Result:', data);
    }
    
  } catch (error) {
    console.error('Error running migration:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runMigration();