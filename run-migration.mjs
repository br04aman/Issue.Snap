import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running migration to add priority, state, and district columns...');
    
    // Add priority column
    const { error: priorityError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('Low', 'Medium', 'High'));`
    });
    
    if (priorityError) {
      console.log('Priority column might already exist or error:', priorityError.message);
    } else {
      console.log('✓ Priority column added');
    }
    
    // Add state column
    const { error: stateError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS state TEXT;`
    });
    
    if (stateError) {
      console.log('State column might already exist or error:', stateError.message);
    } else {
      console.log('✓ State column added');
    }
    
    // Add district column
    const { error: districtError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS district TEXT;`
    });
    
    if (districtError) {
      console.log('District column might already exist or error:', districtError.message);
    } else {
      console.log('✓ District column added');
    }
    
    // Add complaint_number column if it doesn't exist
    const { error: complaintNumberError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='complaints' AND column_name='complaint_number') THEN
                ALTER TABLE public.complaints ADD COLUMN complaint_number SERIAL NOT NULL;
            END IF;
        END $$;
      `
    });
    
    if (complaintNumberError) {
      console.log('Complaint number column might already exist or error:', complaintNumberError.message);
    } else {
      console.log('✓ Complaint number column added');
    }
    
    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);',
      'CREATE INDEX IF NOT EXISTS idx_complaints_state ON public.complaints(state);',
      'CREATE INDEX IF NOT EXISTS idx_complaints_district ON public.complaints(district);',
      'CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);',
      'CREATE INDEX IF NOT EXISTS idx_complaints_complaint_number ON public.complaints(complaint_number);'
    ];
    
    for (const indexSQL of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql: indexSQL });
      if (error) {
        console.log('Index creation error:', error.message);
      } else {
        console.log('✓ Index created');
      }
    }
    
    console.log('Migration completed!');
    
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();