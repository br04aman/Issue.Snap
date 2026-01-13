import { ComplaintForm } from '@/components/complaint-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Camera } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ReportPage() {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Redirect to login page with a return URL
    redirect('/login?return_to=/report');
  }
  
  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-background p-4 sm:p-6 lg:p-8">
       <div className="w-full max-w-2xl">
        <div className="mb-4">
          <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>
        <Card className="w-full shadow-lg border">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex items-center justify-center bg-primary/10 p-4 rounded-full w-fit border border-primary/20">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4 text-3xl font-bold tracking-tight text-foreground font-headline">
              Report an Issue
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Fill out the form below to submit your complaint. The more details, the better!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ComplaintForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
