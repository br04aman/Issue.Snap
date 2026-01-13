'use client';

import dynamic from 'next/dynamic';
import type { Complaint } from '@/types/complaint';
import { Skeleton } from './ui/skeleton';

const ComplaintCard = dynamic(
  () => import('./complaint-card-client').then((mod) => mod.ComplaintCard),
  {
    ssr: false,
    loading: () => <ComplaintCardSkeleton />,
  }
);

export function ComplaintCardClientOnly({ complaint }: { complaint: Complaint }) {
  return <ComplaintCard complaint={complaint} />;
}


function ComplaintCardSkeleton() {
    return (
      <div className="w-full overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-xl flex flex-col border rounded-lg bg-card">
        <Skeleton className="h-40 w-full" />
        <div className="p-4 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-5 w-full mb-1" />
          <Skeleton className="h-5 w-3/4 mb-3" />
          <Skeleton className="h-4 w-5/6 mb-3" />
          <Skeleton className="h-4 w-1/2 mt-auto mb-4" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }
  
