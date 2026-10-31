import { createClient } from '@supabase/supabase-js';

// Use the actual values from your .env file
const supabaseUrl = 'https://tpxjtfahdmyovlldctpt.supabase.co';
const supabaseKey = 'sb_publishable_M7P5fXNwYwzpK1fppn_kJA_FUSSZ3iJ';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running migration to fix ID column issue...');
    
    // First, let's check the current table structure
    console.log('Checking current table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_name', 'complaints')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.log('Could not get table info:', tableError.message);
    } else {
      console.log('Current columns:');
      tableInfo.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
    }
    
    // Try to fix the ID column issue
    console.log('Attempting to fix ID column...');
    
    // First, enable UUID extension
    try {
      const { error: extError } = await supabase.rpc('exec_sql', { 
        sql: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 
      });
      if (extError) throw extError;
      console.log('✓ UUID extension enabled');
    } catch (err) {
      console.log('Note: UUID extension may already be enabled or exec_sql not available');
    }
    
    // Try to run individual fixes
    const fixes = [
      {
        name: 'Set ID default',
        sql: 'ALTER TABLE public.complaints ALTER COLUMN id SET DEFAULT gen_random_uuid();'
      },
      {
        name: 'Set ID not null',
        sql: 'ALTER TABLE public.complaints ALTER COLUMN id SET NOT NULL;'
      },
      {
        name: 'Add primary key',
        sql: 'ALTER TABLE public.complaints ADD PRIMARY KEY (id);'
      }
    ];
    
    for (const fix of fixes) {
      try {
        console.log(`Trying: ${fix.name}`);
        const { error } = await supabase.rpc('exec_sql', { sql: fix.sql });
        if (error) {
          console.log(`  ⚠ Failed: ${error.message}`);
        } else {
          console.log(`  ✓ Success`);
        }
      } catch (err) {
        console.log(`  ⚠ Error: ${err.message}`);
      }
    }
    
    console.log('Migration attempt completed!');
    
  } catch (error) {
    console.error('Error running migration:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runMigration();