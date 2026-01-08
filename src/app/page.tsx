
import type { Complaint } from '@/app/employee/dashboard/page';
import { ComplaintCardClientOnly } from '@/components/complaint-card-client-only';
import { HeroGlassSection } from '@/components/hero-glass-section';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import aboutImage from '@/img/img2.jpg';
import heroBackground from '@/img/webp1.jpeg';
import { createClient } from '@/lib/supabase/server';
import {
  Bot,
  Camera,
  CheckCircle,
  Hourglass,
  LayoutDashboard,
  Send,
  ShieldCheck,
  Wand2,
  XCircle,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let complaints = [];
  let error = null;

  try {
    const supabase = await createClient();
    const result = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });
    
    complaints = result.data || [];
    error = result.error;
  } catch (e) {
    console.error('Error fetching complaints:', e);
    error = e;
  }

  if (error) {
    console.error('Error details:', error);
  }

  // ...rest of your code...




// export default async function Home() {
//   const supabase = await createClient();
//   const { data: complaints, error } = await supabase
//     .from('complaints')
//     .select('*')
//     .order('created_at', { ascending: false });

//   if (error) {
//     console.error('Error fetching complaints:', error);
//   }

  const ongoingComplaints =
    complaints?.filter(
      (c) => c.status === 'New' || c.status === 'In Progress'
    ) || [];
  const resolvedComplaints =
    complaints?.filter((c) => c.status === 'Resolved') || [];
  const deniedComplaints =
    complaints?.filter((c) => c.status === 'Denied') || [];

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src={heroBackground}
          alt="Abstract geometric background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-background/70 dark:bg-background/80" />
      </div>
      <header className="relative z-20">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">IssueSnap</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-foreground">
            <a href="#how-it-works" className="hover:text-primary transition-colors">
              How it works
            </a>
            <a href="#dashboard" className="hover:text-primary transition-colors">
              Public dashboard
            </a>
            <Link
              href="/report"
              className="hover:text-primary transition-colors"
            >
              Report issue
            </Link>
            <Link href="/employee/login">
              <Button size="sm" variant="outline">
                Employee login
              </Button>
            </Link>
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <Link href="/report">
              <Button size="sm">Report</Button>
            </Link>
            <Link href="/employee/login">
              <Button size="sm" variant="outline">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="relative flex-1">
        <section className="w-full pt-24 pb-12 md:pt-28 md:pb-20 lg:pt-32 lg:pb-28">
          <HeroGlassSection />
        </section>

        <section id="how-it-works" className="py-16 md:py-24 bg-secondary/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                How It Works
              </h2>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                Reporting a community issue has never been easier. Just three
                simple steps.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-6 rounded-lg transition-all hover:bg-card hover:shadow-lg">
                <div className="p-4 bg-primary/10 rounded-full border border-primary/20">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">1. Snap a Photo</h3>
                <p className="mt-2 text-muted-foreground">
                  Use your phone to take a picture of the issue, whether it's a
                  pothole, graffiti, or dumped trash.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg transition-all hover:bg-card hover:shadow-lg">
                <div className="p-4 bg-primary/10 rounded-full border border-primary/20">
                  <Wand2 className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">2. AI Analysis</h3>
                <p className="mt-2 text-muted-foreground">
                  Our AI instantly analyzes the image, drafts a complaint, and
                  categorizes the issue for you.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-lg transition-all hover:bg-card hover:shadow-lg">
                <div className="p-4 bg-primary/10 rounded-full border border-primary/20">
                  <Send className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">
                  3. Submit the Report
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Review the auto-generated report, add any extra details, and
                  submit. It's that simple.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Public Dashboard Section */}
        <section id="dashboard" className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Public Complaints Dashboard
              </h2>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                Track the status of reported issues in real-time.
              </p>
            </div>
            {complaints && complaints.length > 0 ? (
              <Tabs defaultValue="ongoing" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ongoing">
                    <Hourglass className="mr-2" /> Ongoing ({ongoingComplaints.length})
                  </TabsTrigger>
                  <TabsTrigger value="resolved">
                    <CheckCircle className="mr-2" /> Resolved ({resolvedComplaints.length})
                  </TabsTrigger>
                  <TabsTrigger value="denied">
                    <XCircle className="mr-2" /> Denied ({deniedComplaints.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="ongoing">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
                    {ongoingComplaints.map((complaint) => (
                      <ComplaintCardClientOnly
                        key={complaint.id}
                        complaint={complaint as Complaint}
                      />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="resolved">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
                    {resolvedComplaints.map((complaint) => (
                      <ComplaintCardClientOnly
                        key={complaint.id}
                        complaint={complaint as Complaint}
                      />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="denied">
                   <Card className="mt-6 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                    <CardHeader>
                      <CardTitle className="text-amber-900 dark:text-amber-200">About Denied Complaints</CardTitle>
                      <CardDescription className="text-amber-800 dark:text-amber-300">
                        These are reports that have been reviewed by a municipal employee and marked as invalid. This could be because the issue is a duplicate, not a civic responsibility, or lacks sufficient information.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
                    {deniedComplaints.map((complaint) => (
                      <ComplaintCardClientOnly
                        key={complaint.id}
                        complaint={complaint as Complaint}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  No complaints have been submitted yet.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* About & Goals Section */}
        <section className="py-16 md:py-24 bg-secondary/50">
          <div className="container mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                About IssueSnap
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                IssueSnap is a proof-of-concept application designed to
                revolutionize how municipal complaints are handled. By leveraging
                the power of generative AI, we empower citizens to become active
                stewards of their communities while helping city departments
                streamline their workflow.
              </p>
              <h3 className="mt-8 text-2xl font-bold text-foreground">
                Our Project Goals
              </h3>
              <ul className="mt-4 space-y-3 text-lg text-muted-foreground">
                <li className="flex items-start">
                  <ShieldCheck className="h-6 w-6 mr-3 mt-1 text-primary shrink-0" />
                  <span>
                    <strong>Empower Citizens:</strong> Make reporting civic
                    issues effortless and accessible to everyone.
                  </span>
                </li>
                <li className="flex items-start">
                  <Zap className="h-6 w-6 mr-3 mt-1 text-primary shrink-0" />
                  <span>
                    <strong>Increase Efficiency:</strong> Automate complaint
                    categorization and assignment to save time for city
                    employees.
                  </span>
                </li>
                <li className="flex items-start">
                  <Bot className="h-6 w-6 mr-3 mt-1 text-primary shrink-0" />
                  <span>
                    <strong>Leverage AI:</strong> Showcase the practical
                    application of modern AI models for real-world civic tech
                    solutions.
                  </span>
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <Image
                src={aboutImage}
                alt="City street with a smartphone"
                width={800}
                height={600}
                className="rounded-xl shadow-2xl"
                data-ai-hint="city street smartphone"
              />
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Key Features
              </h2>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                Packed with features for both citizens and city employees.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-6 bg-card rounded-lg shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                <Bot className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">
                  AI-Powered Analysis
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Image recognition and natural language processing to
                  auto-draft and categorize complaints.
                </p>
              </div>
              <div className="p-6 bg-card rounded-lg shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                <Send className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">
                  Automated Department Routing
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Intelligently assigns each issue to the correct municipal
                  department (e.g., Public Works, Sanitation).
                </p>
              </div>
              <div className="p-6 bg-card rounded-lg shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                <LayoutDashboard className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-xl font-semibold">
                  Real-Time Employee Dashboard
                </h3>
                <p className="mt-2 text-muted-foreground">
                  A central hub for employees to view, manage, and resolve
                  incoming complaints with live updates.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t bg-background" suppressHydrationWarning>
        <div className="container mx-auto px-4 md:px-6 flex justify-center items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} IssueSnap. A Project by Team Radicals.
          </p>
        </div>
      </footer>
    </div>
  );
}
