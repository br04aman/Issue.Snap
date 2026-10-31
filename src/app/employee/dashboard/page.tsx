
import { EmployeeDashboardClientOnly } from '@/components/employee-dashboard-client-only';
<<<<<<< HEAD
import type { ComplaintPriorityMetrics } from '@/lib/priority';

// This line is the fix for the DYNAMIC_SERVER_USAGE error
export const dynamic = 'force-dynamic';
export type Complaint = {
  id: string;
  complaint_number: number;
  issue: string;
  location_description: string;
  status: 'New' | 'In Progress' | 'Resolved' | 'Denied' | 'In Review';
  image_url: string;
  created_at: string;
  latitude: number;
  longitude: number;
  category: string | null;
  department: string | null;
  resolution_image_url: string | null;
  resolved_at: string | null;
} & Partial<ComplaintPriorityMetrics>;
=======
import { createClient } from '@/lib/supabase/server';
import type { Complaint } from '@/types/complaint';

// This line is the fix for the DYNAMIC_SERVER_USAGE error
export const dynamic = 'force-dynamic';
>>>>>>> bcfe58c1eb2cae74674c2b694a3f4b7df2b406ad

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
                <p className="text-destructive">Error loading complaints: {error.message}</p>
            </main>
        );
    }

    // Debug logging
    console.log(`Fetched ${data?.length || 0} complaints from database`);
    if (data && data.length > 0) {
        console.log('Sample complaint:', {
            id: data[0].id,
            issue: data[0].issue,
            state: data[0].state,
            district: data[0].district,
            location: data[0].location_description
        });
    }

  return <EmployeeDashboardClientOnly complaints={data as Complaint[]} />;
}
