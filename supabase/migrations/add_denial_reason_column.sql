-- Add denial_reason column to complaints table
alter table public.complaints
add column if not exists denial_reason text;