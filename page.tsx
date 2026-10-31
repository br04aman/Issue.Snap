
import { EmployeeDashboardClientOnly } from '@/components/employee-dashboard-client-only';
import { createClient } from '@/lib/supabase/server';
import type { Complaint } from '@/types/complaint';

// This line is the fix for the DYNAMIC_SERVER_USAGE error
export const dynamic = 'force-dynamic';

export default async function EmployeeDashboard() {
  const supabase = await createClient();
    const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching complaints:', error);
        return (
            <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
                <p className="text-destructive">Error loading complaints.</p>
            </main>
        );
    }

  return <EmployeeDashboardClientOnly complaints={data as Complaint[]} />;
}
