
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Complaint } from '@/app/employee/dashboard/page';
import { Badge } from './ui/badge';
import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type ComplaintDetailsModalProps = {
  complaint: Complaint;
  onOpenChange: (open: boolean) => void;
};

export function ComplaintDetailsModal({
  complaint,
  onOpenChange,
}: ComplaintDetailsModalProps) {
  const [submittedDate, setSubmittedDate] = useState('');
  const [resolvedDate, setResolvedDate] = useState('');

  useEffect(() => {
    // This will only run on the client, preventing hydration mismatch
    if (complaint.created_at) {
        setSubmittedDate(new Date(complaint.created_at).toLocaleString());
    }
    if (complaint.resolved_at) {
        setResolvedDate(new Date(complaint.resolved_at).toLocaleString());
    }
  }, [complaint]);

  const getStatusVariant = () => {
    switch (complaint.status) {
      case 'New':
        return 'secondary';
      case 'In Progress':
        return 'outline';
      case 'Resolved':
        return 'default';
      case 'Denied':
        return 'destructive';
      case 'In Review':
          return 'outline'
      default:
        return 'secondary';
    }
  };

  const getPriorityBadgeClassName = () => {
    switch (complaint.priority_label) {
      case 'Critical':
        return 'border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200';
      case 'High':
        return 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200';
      case 'Medium':
        return 'border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200';
      case 'Low':
      default:
        return 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200';
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Complaint Details: #{complaint.complaint_number}</DialogTitle>
          <DialogDescription>
            Viewing full details for complaint ID #{complaint.complaint_number}.
          </DialogDescription>
        </DialogHeader>

        {complaint.status === 'In Review' && (
          <Alert variant="destructive" className="border-yellow-500 text-yellow-700 [&>svg]:text-yellow-700 dark:border-yellow-700 dark:text-yellow-400 dark:[&>svg]:text-yellow-400">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Resolution In Review</AlertTitle>
            <AlertDescription>
              The submitted resolution photo was flagged by AI for review. Please upload a clearer photo showing the issue has been fully resolved.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column */}
            <div>
                <h4 className="font-semibold mb-2 text-foreground">Issue Details</h4>
                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <Badge variant={getStatusVariant()}>{complaint.status}</Badge>
                    </div>
                    {complaint.priority_label && typeof complaint.priority_score === 'number' && (
                        <>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Priority</p>
                                <Badge variant="outline" className={getPriorityBadgeClassName()}>
                                    {complaint.priority_label}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Priority Score</p>
                                <p className="text-sm text-foreground">{complaint.priority_score.toFixed(2)} / 10</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Priority Model</p>
                                <p className="text-sm text-foreground">
                                    Severity {complaint.severity_score?.toFixed(2) ?? '--'} | Occurrence {complaint.occurrence_score?.toFixed(2) ?? '--'} | Exposure {complaint.exposure_score?.toFixed(2) ?? '--'}
                                </p>
                            </div>
                        </>
                    )}
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Description</p>
                        <p className="text-sm text-foreground">{complaint.issue}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Location</p>
                        <p className="text-sm text-foreground">{complaint.location_description}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Category</p>
                        <p className="text-sm text-foreground">{complaint.category}</p>
                    </div>
                     <div>
                        <p className="text-sm font-medium text-muted-foreground">Department</p>
                        <p className="text-sm text-foreground">{complaint.department}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Submission Date</p>
                        <p className="text-sm text-foreground" suppressHydrationWarning>{submittedDate || '...'}</p>
                    </div>
                    {complaint.resolved_at && (
                         <div>
                            <p className="text-sm font-medium text-muted-foreground">Resolution Date</p>
                            <p className="text-sm text-foreground" suppressHydrationWarning>{resolvedDate || '...'}</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Right Column */}
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold mb-2 text-foreground">Complaint Image</h4>
                    <div className="relative aspect-video w-full rounded-md overflow-hidden border">
                         <Image src={complaint.image_url} alt="Complaint Image" fill className="object-cover" />
                    </div>
                </div>
                {complaint.resolution_image_url && (
                    <div>
                        <h4 className="font-semibold mb-2 text-foreground">Resolution Image</h4>
                        <div className="relative aspect-video w-full rounded-md overflow-hidden border">
                            <Image src={complaint.resolution_image_url} alt="Resolution Image" fill className="object-cover" />
                        </div>
                    </div>
                )}
                 {!complaint.resolution_image_url && complaint.status === 'Resolved' && (
                     <div>
                        <h4 className="font-semibold mb-2 text-foreground">Resolution Image</h4>
                        <div className="relative aspect-video w-full rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                            <p className='text-sm text-muted-foreground'>Image not provided.</p>
                        </div>
                    </div>
                 )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
