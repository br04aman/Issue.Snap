import { EmployeeDashboardClientOnly } from '@/components/employee-dashboard-client-only';
import { createClient } from '@/lib/supabase/server';
import type { Complaint } from '@/types/complaint';
import Link from 'next/link';

// This line is the fix for the DYNAMIC_SERVER_USAGE error
export const dynamic = 'force-dynamic';

export default async function EmployeeDashboard() {
  let complaints: Complaint[] = [];
  let errorMessage: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Supabase / PostgREST errors can be opaque. Log as a warning so a
      // transient failure does not trigger the Next.js dev overlay.
      console.warn('Error fetching complaints:', error);
      errorMessage = error.message || 'Could not load complaints.';
    } else {
      complaints = (data as Complaint[]) || [];
    }
  } catch (error) {
    // Network / session hiccups (e.g. a stale auth cookie) — degrade gracefully.
    console.warn('Error fetching complaints:', error);
    errorMessage = 'Could not reach the server. Please try again.';
  }

  if (errorMessage) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 text-center sm:p-6 lg:p-8">
        <p className="text-destructive">Error loading complaints: {errorMessage}</p>
        <Link href="/employee/dashboard" className="mt-4 text-sm underline">
          Retry
        </Link>
      </main>
    );
  }

  return <EmployeeDashboardClientOnly complaints={complaints} />;
}
