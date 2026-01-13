
'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Complaint } from '@/types/complaint';
import { ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';

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
                    {complaint.status === 'Denied' && complaint.denial_reason && (
                         <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                            <p className="text-sm font-medium text-destructive">Denial Reason</p>
                            <p className="text-sm text-foreground">{complaint.denial_reason}</p>
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
