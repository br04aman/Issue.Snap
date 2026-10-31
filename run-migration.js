const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function runMigration() {
  try {
    console.log('Running migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
    console.log('Result:', data);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();