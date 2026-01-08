-- Create a table for public employee profiles
create table employees (
  id uuid not null references auth.users on delete cascade,
  full_name text,
  -- add other employee-specific columns here
  primary key (id)
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security
alter table employees
  enable row level security;

create policy "Public employee profiles are viewable by everyone." on employees
  for select using (true);

create policy "Employees can insert their own profile." on employees
  for insert with check (auth.uid() = id);

create policy "Employees can update own profile." on employees
  for update using (auth.uid() = id);

-- This trigger automatically creates an employee profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.employees (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;
-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Create complaints table
create table if not exists complaints (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  issue text not null,
  location_description text,
  latitude float,
  longitude float,
  image_url text,
  category text,
  department text,
  district text,
  status text default 'New' not null
);

-- Enable RLS for complaints table
alter table complaints enable row level security;

-- Policy: Allow anonymous users to insert complaints
drop policy if exists "Allow anonymous inserts" on complaints;
create policy "Allow anonymous inserts" on complaints for insert with check (true);


-- Policy: Allow authenticated users (employees) to view all complaints
drop policy if exists "Allow authenticated users to view all complaints" on complaints;
create policy "Allow authenticated users to view all complaints" on complaints for select to authenticated using (true);

-- Set up storage for complaint images
insert into storage.buckets (id, name, public)
values ('complaint-images', 'complaint-images', true)
on conflict (id) do nothing;

create policy "Complaint images are publicly accessible." on storage.objects
  for select using (bucket_id = 'complaint-images');

create policy "Anyone can upload a complaint image." on storage.objects
  for insert with check (bucket_id = 'complaint-images');
