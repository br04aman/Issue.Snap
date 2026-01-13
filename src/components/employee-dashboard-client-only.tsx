'use client';
import dynamic from 'next/dynamic';
import type { Complaint } from '@/types/complaint';
import { Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

const EmployeeDashboardContent = dynamic(
  () => import('./employee-dashboard-content').then((mod) => mod.EmployeeDashboardContent),
  {
    ssr: false,
    loading: () => (
        <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
            <div className="p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-80" />
                    </div>
                    <Skeleton className="h-10 w-28" />
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Skeleton className="col-span-4 h-96 rounded-lg" />
                <Skeleton className="col-span-3 h-96 rounded-lg" />
            </div>
            <Skeleton className="h-[400px] rounded-lg" />
        </div>
      ),
  }
);

export function EmployeeDashboardClientOnly({ complaints }: { complaints: Complaint[] }) {
  return <EmployeeDashboardContent initialComplaints={complaints} />;
}
