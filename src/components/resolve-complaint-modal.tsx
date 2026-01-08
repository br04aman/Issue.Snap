
'use client';

import { verifyResolution } from '@/ai/flows/verify-resolution-flow';
import type { Complaint } from '@/app/employee/dashboard/page';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Loader2, ShieldAlert, Upload } from 'lucide-react';
import Image from 'next/image';
import { ChangeEvent, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type ResolveComplaintModalProps = {
  complaint: Complaint;
  onOpenChange: (open: boolean) => void;
  onComplaintResolved: (complaint: Complaint) => void;
};

export function ResolveComplaintModal({
  complaint,
  onOpenChange,
  onComplaintResolved,
}: ResolveComplaintModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVerificationError(null);
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Image too large',
          description: 'Please upload an image smaller than 4MB.',
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setImageDataUri(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const getBase64FromUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  }

  const handleSubmit = async () => {
    if (!imageFile || !imageDataUri) {
      toast({
        variant: 'destructive',
        title: 'Missing Image',
        description: 'Please upload an image of the resolved issue.',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setIsSubmitting(true);
    let updatedComplaint: Complaint;
    
    try {
      // 1. Get original image as data URI for verification
      const originalPhotoDataUri = await getBase64FromUrl(complaint.image_url);

      // 2. Call AI verification flow
      const verificationResult = await verifyResolution({
          originalPhotoDataUri,
          resolutionPhotoDataUri: imageDataUri,
          issueDescription: complaint.issue
      });

      if (!verificationResult.isResolvedCorrectly) {
        setVerificationError(verificationResult.reasoning);
        const {data, error} = await supabase.from('complaints').update({ status: 'In Review' }).eq('id', complaint.id).select().single();
        if (error) throw error;
        updatedComplaint = data as Complaint;
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description: `AI determined the issue was not resolved. Reason: ${verificationResult.reasoning}`,
          duration: 8000,
        });
        setIsVerifying(false);
        setIsSubmitting(false);
        onComplaintResolved(updatedComplaint);
        return;
      }

      setIsVerifying(false);

      // 3. Upload image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `resolution-${uuidv4()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('complaint-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // 4. Get public URL for the image
      const { data: urlData } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(fileName);

      const resolutionImageUrl = urlData.publicUrl;
      const resolvedAt = new Date().toISOString();

      // 5. Update complaint in Supabase database
      const { error: updateError } = await supabase
        .from('complaints')
        .update({
          status: 'Resolved',
          resolution_image_url: resolutionImageUrl,
          resolved_at: resolvedAt,
        })
        .eq('id', complaint.id);

      if (updateError) throw updateError;
      
      updatedComplaint = {
        ...complaint,
        status: 'Resolved',
        resolution_image_url: resolutionImageUrl,
        resolved_at: resolvedAt,
      } as Complaint;

      toast({
        title: 'Complaint Resolved!',
        description: 'AI has verified the resolution and the issue has been marked as resolved.',
      });
      onComplaintResolved(updatedComplaint);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error resolving complaint:', JSON.stringify(error, null, 2));
      toast({
        variant: 'destructive',
        title: 'Resolution Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsVerifying(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !isSubmitting && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Complaint</DialogTitle>
          <DialogDescription>
            Upload a photo of the resolved issue. Our AI will verify if the resolution is correct before closing the complaint.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="p-4 border-2 border-dashed rounded-lg text-center bg-secondary/30 hover:border-primary transition-colors">
            {imagePreview ? (
              <div className="relative group w-full aspect-video rounded-md overflow-hidden">
                <Image
                  src={imagePreview}
                  alt="Resolution preview"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
                <Upload className="h-10 w-10" />
                <p className="font-semibold">Upload resolution photo</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  Choose File
                </Button>
              </div>
            )}
          </div>
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/*"
            capture="environment"
          />

          {isVerifying && (
             <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>AI Verification in Progress</AlertTitle>
              <AlertDescription>
                Our AI is comparing the images to verify the resolution. Please wait...
              </AlertDescription>
            </Alert>
          )}

          {verificationError && (
             <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>AI Rejection</AlertTitle>
                <AlertDescription>
                  {verificationError} Please upload a new, clearer photo of the completed work.
                </AlertDescription>
            </Alert>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !imageFile}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {isVerifying ? 'Verifying...' : 'Mark as Resolved'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
