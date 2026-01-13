-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the id column is properly configured with UUID default
ALTER TABLE public.complaints 
ALTER COLUMN id SET DEFAULT gen_random_uuid(),
ALTER COLUMN id SET NOT NULL;

-- Ensure the primary key constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='complaints' AND constraint_type='PRIMARY KEY'
    ) THEN
        ALTER TABLE public.complaints ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Add priority, state, and district fields if they don't exist
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS district TEXT;

-- Add complaint_number serial field if it doesn't exist (for sequential numbering)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='complaints' AND column_name='complaint_number') THEN
        ALTER TABLE public.complaints ADD COLUMN complaint_number SERIAL;
    END IF;
END $$;

-- Create indexes for better filtering performance
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON public.complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_state ON public.complaints(state);
CREATE INDEX IF NOT EXISTS idx_complaints_district ON public.complaints(district);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_number ON public.complaints(complaint_number);