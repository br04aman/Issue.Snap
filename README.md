# IssueSnap - Complaint Reporting App


IssueSnap is a web application that allows users to report civic issues by simply snapping a photo. The app uses AI to analyze the image, generate a complaint draft, categorize the issue, and assign it to the correct municipal department. Employees can then view, manage, and resolve these complaints through a dedicated dashboard.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (with App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Database & Auth:** [Supabase](https://supabase.com/)
- **AI/Generative AI:** [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **Deployment:** Firebase App Hosting

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Getting Started

Follow these steps to set up and run the project locally.


Available at:

https://issuesnap.vercel.app/

### 1. Clone the Repository

First, clone this repository to your local machine.

```bash
git clone <your-repository-url>
cd <your-repository-directory>

Available at:

https://issuesnap.vercel.app/
```

### 2. Install Dependencies

Install the project dependencies using npm or yarn.

```bash
npm install
# or
yarn install
```

### 3. Set Up Supabase

This project uses Supabase for the database, authentication, and file storage.

1.  Go to [Supabase](https://supabase.com/) and create a new project.
2.  Once your project is created, navigate to **Project Settings** > **API**.
3.  You will find your **Project URL** and your **Project API Keys**. You will need the `anon` `public` key.

### 4. Set Up Environment Variables

Create a new file named `.env.local` in the root of your project. Copy and paste the following content, replacing the placeholder values with your actual Supabase credentials from the previous step.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# You can leave this empty for local development if you aren't using a specific Genkit/Gemini key
GEMINI_API_KEY=
```

### 5. Run the Database Migrations

You need to set up your database schema. Go to the **SQL Editor** in your Supabase dashboard and run the following SQL queries one by one.

**a. Create the `complaints` table:**

```sql
create table public.complaints (
    id uuid default gen_random_uuid() not null,
    created_at timestamp with time zone default now() not null,
    issue text not null,
    location_description text not null,
    status text default 'New'::text not null,
    image_url text not null,
    latitude double precision not null,
    longitude double precision not null,
    category text null,
    resolution_image_url text null,
    resolved_at timestamp with time zone null,
    department text null,
    constraint complaints_pkey primary key (id)
);
grant delete on table public.complaints to anon;
grant insert on table public.complaints to anon;
grant references on table public.complaints to anon;
grant select on table public.complaints to anon;
grant trigger on table public.complaints to anon;
grant truncate on table public.complaints to anon;
grant update on table public.complaints to anon;
grant delete on table public.complaints to authenticated;
grant insert on table public.complaints to authenticated;
grant references on table public.complaints to authenticated;
grant select on table public.complaints to authenticated;
grant trigger on table public.complaints to authenticated;
grant truncate on table public.complaints to authenticated;
grant update on table public.complaints to authenticated;
grant delete on table public.complaints to service_role;
grant insert on table public.complaints to service_role;
grant references on table public.complaints to service_role;
grant select on table public.complaints to service_role;
grant trigger on table public.complaints to service_role;
grant truncate on table public.complaints to service_role;
grant update on table public.complaints to service_role;
```

**b. Create the `complaint-images` storage bucket:**
Go to the **Storage** section in your Supabase dashboard and create a new public bucket named `complaint-images`.

**c. Set up Row-Level Security (RLS) Policies:**

```sql
-- Enable RLS on the complaints table
alter table public.complaints enable row level security;

-- Policy: Allow anonymous users to insert complaints
create policy "Allow anonymous inserts"
on "public"."complaints"
as permissive
for insert
to anon
with check (true);

-- Policy: Allow authenticated users (employees) to read all complaints
create policy "Allow read access to authenticated users"
on "public"."complaints"
as permissive
for select
to authenticated
using (true);

-- Policy: Allow authenticated users (employees) to update complaints
create policy "Allow authenticated users to update complaints"
on "public"."complaints"
as permissive
for update
to authenticated
using (true)
with check (true);
```

### 6. Run the Development Server

You are now ready to start the application.

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

---

Now you're all set! You have a comprehensive README file that will help you or anyone else get this project up and running smoothly. You can now commit this to your GitHub repository.
