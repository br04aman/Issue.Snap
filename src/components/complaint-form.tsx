
'use client';

import { generateComplaintFromImage } from '@/ai/flows/generate-complaint-from-image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  Camera,
  CheckCircle,
  HardHat,
  Loader2,
  MapPin,
  RefreshCcw,
  Send,
  Upload,
  Wand2,
} from 'lucide-react';
import Image from 'next/image';
import { ChangeEvent, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';


type Location = { latitude: number; longitude: number };

async function getAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );

    if (!response.ok) {
      return null;
    }

    const data: any = await response.json();

    if (data && typeof data.display_name === 'string') {
      return data.display_name;
    }

    return null;
  } catch {
    return null;
  }
}

export function ComplaintForm() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [locationDescription, setLocationDescription] =
    useState<string>('My current location');
  const [complaint, setComplaint] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
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
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setImagePreview(URL.createObjectURL(file));
        setImageDataUri(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocationRequest = () => {
    setIsLocationLoading(true);
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
      });
      setIsLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { latitude, longitude };

        setLocation(newLocation);
        setLocationDescription(
          `approx. ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        );

        try {
          const address = await getAddressFromCoordinates(latitude, longitude);

          if (address) {
            setLocationDescription(
              `${address} (lat ${latitude.toFixed(
                5
              )}, lon ${longitude.toFixed(5)})`
            );
          }

          toast({
            title: 'Location Acquired',
            description: address
              ? 'Your location address has been successfully recorded.'
              : 'Your location has been successfully recorded.',
          });
        } catch {
          toast({
            title: 'Location Acquired',
            description: 'Your location has been successfully recorded.',
          });
        } finally {
          setIsLocationLoading(false);
        }
      },
      () => {
        toast({
          variant: 'destructive',
          title: 'Location access denied',
          description: 'Please enable location services to proceed.',
        });
        setIsLocationLoading(false);
      }
    );
  };

  const handleGenerateComplaint = async () => {
    if (!imageDataUri || !locationDescription) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please provide both an image and a location.',
      });
      return;
    }

    setIsGenerating(true);
    setComplaint('');
    try {
      const result = await generateComplaintFromImage({
        photoDataUri: imageDataUri,
        locationDescription,
      });
      setComplaint(result.complaintDraft);
      setCategory(result.category);
      setDepartment(result.department);
      toast({
        title: 'Complaint Drafted!',
        description: 'Review and edit the AI-generated complaint below.',
      });
    } catch (error) {
      console.error('Error generating complaint:', error);
      toast({
        variant: 'destructive',
        title: 'Error generating complaint',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !complaint || !location) return;

    setIsSubmitting(true);

    try {
      // 1. Upload image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('complaint-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // 2. Get public URL for the image
      const { data: urlData } = await supabase.storage
        .from('complaint-images')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      
      const complaintData: any = {
        issue: complaint,
        location_description: locationDescription,
        image_url: imageUrl,
        latitude: location.latitude,
        longitude: location.longitude,
      };

      if (category) {
        complaintData.category = category;
      }
      if (department) {
        complaintData.department = department;
      }


      // 3. Insert complaint into Supabase database
      const { error: insertError } = await supabase
        .from('complaints')
        .insert(complaintData);

      if (insertError) {
        const message = insertError.message || '';
        const code = insertError.code;

        if (
          code === 'PGRST204' &&
          message.includes("'category' column of 'complaints'")
        ) {
          const fallbackComplaintData: any = { ...complaintData };
          delete fallbackComplaintData.category;
          delete fallbackComplaintData.department;

          const { error: retryError } = await supabase
            .from('complaints')
            .insert(fallbackComplaintData);

          if (retryError) {
            throw retryError;
          }
        } else {
          throw insertError;
        }
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting complaint:', JSON.stringify(error, null, 2));
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unexpected error occurred.',
      });
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setImagePreview(null);
    setImageDataUri(null);
    setImageFile(null);
    setLocation(null);
    setLocationDescription('My current location');
    setComplaint('');
    setCategory('');
    setDepartment('');
    setIsGenerating(false);
    setIsSubmitting(false);
    setIsSubmitted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center p-8 flex flex-col items-center gap-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 animate-fade-in">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h3 className="text-2xl font-semibold text-green-800 dark:text-green-300 font-headline">
          Complaint Submitted!
        </h3>
        <p className="text-green-700 dark:text-green-400">
          Thank you for your report. You can track its status on the homepage.
        </p>
        <Button onClick={resetForm} className="mt-4">
          <RefreshCcw className="mr-2" />
          File Another Complaint
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h3 className="text-lg font-medium text-foreground font-headline flex items-center"><span className="flex items-center justify-center w-6 h-6 mr-2 text-xs font-bold rounded-full bg-primary text-primary-foreground">1</span> Capture the Issue</h3>
        <div className="p-4 border-2 border-dashed rounded-lg text-center bg-secondary/30 hover:border-primary transition-colors">
          {imagePreview ? (
            <div className="relative group w-full aspect-video rounded-md overflow-hidden">
              <Image
                src={imagePreview}
                alt="Issue preview"
                fill
                className="object-contain"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2" />
                  Change Photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
              <Upload className="h-10 w-10" />
              <p className="font-semibold">Upload an image of the issue</p>
              <p className="text-sm">PNG, JPG, or WEBP up to 4MB</p>
              <Button
                type="button"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="mr-2" />
                Take or Upload Photo
              </Button>
            </div>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
          accept="image/*"
          capture="environment"
        />
      </div>

      <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-lg font-medium text-foreground font-headline flex items-center"><span className="flex items-center justify-center w-6 h-6 mr-2 text-xs font-bold rounded-full bg-primary text-primary-foreground">2</span> Confirm Location</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-secondary/30">
          <Button
            type="button"
            onClick={handleLocationRequest}
            disabled={isLocationLoading || !!location}
            className="w-full sm:w-auto"
          >
            {isLocationLoading ? (
              <Loader2 className="mr-2 animate-spin" />
            ) : (
              <MapPin className="mr-2" />
            )}
            {location ? 'Location Acquired' : 'Get My Location'}
          </Button>
          <div className="flex-grow flex items-center gap-2 text-sm text-muted-foreground">
            {location ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span>{locationDescription}</span>
              </>
            ) : (
              <span>We need your location to process the complaint.</span>
            )}
          </div>
        </div>
      </div>

      {(imagePreview && location) && (
        <div className="space-y-4 pt-4 border-t animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-lg font-medium text-foreground font-headline flex items-center"><span className="flex items-center justify-center w-6 h-6 mr-2 text-xs font-bold rounded-full bg-primary text-primary-foreground">3</span> Generate & Submit</h3>
          {!complaint && (
            <Button
              type="button"
              onClick={handleGenerateComplaint}
              disabled={isGenerating || !imagePreview || !location}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 animate-spin" />
              ) : (
                <Wand2 className="mr-2" />
              )}
              Generate Complaint with AI
            </Button>
          )}

           {(isGenerating || complaint) && (
            <div className="space-y-4">
              {isGenerating && !complaint && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>Hang tight!</AlertTitle>
                  <AlertDescription>
                    Our AI is analyzing the image and drafting your complaint. This might take a moment.
                  </AlertDescription>
                </Alert>
              )}
              {complaint && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex items-center gap-3 text-sm p-3 bg-muted/50 rounded-lg">
                    <HardHat className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <div className="font-semibold text-muted-foreground">Department</div>
                      <p className="font-bold text-foreground">{department || 'N/A'}</p>
                    </div>
                  </div>
                   <div className="flex items-center gap-3 text-sm p-3 bg-muted/50 rounded-lg">
                    <Wand2 className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <div className="font-semibold text-muted-foreground">Category</div>
                      <p className="font-bold text-foreground">{category || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
              <Textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="AI is generating your complaint..."
                rows={8}
                className="bg-card"
                disabled={isGenerating}
              />
              <Button
                type="submit"
                disabled={isSubmitting || isGenerating || !complaint}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 animate-spin" />
                ) : (
                  <Send className="mr-2" />
                )}
                Submit Complaint
              </Button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
