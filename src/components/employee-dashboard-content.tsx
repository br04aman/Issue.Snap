
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle,
  Eye,
  FileText,
  Loader2,
  LogOut,
  Newspaper,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { ResolveComplaintModal } from '@/components/resolve-complaint-modal';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Complaint } from '@/app/employee/dashboard/page';
import { ComplaintDetailsModal } from './complaint-details-modal';


function DateCell({ dateString }: { dateString: string | null }) {
  const [formattedDate, setFormattedDate] = useState<string>('...');

  useEffect(() => {
    // This will only run on the client, preventing hydration mismatch
    if (dateString) {
      setFormattedDate(
        new Date(dateString).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } else {
      setFormattedDate('---');
    }
  }, [dateString]);

  return <TableCell suppressHydrationWarning>{formattedDate}</TableCell>;
}

const chartConfig = {
  complaints: {
    label: 'Complaints',
  },
  Pothole: {
    label: 'Pothole',
    color: 'hsl(var(--chart-1))',
  },
  Graffiti: {
    label: 'Graffiti',
    color: 'hsl(var(--chart-2))',
  },
  Trash: {
    label: 'Trash',
    color: 'hsl(var(--chart-3))',
  },
  'Broken Streetlight': {
    label: 'Broken Streetlight',
    color: 'hsl(var(--chart-4))',
  },
  Other: {
    label: 'Other',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;

export function EmployeeDashboardContent({ initialComplaints }: {initialComplaints: Complaint[]}) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [complaintToDeny, setComplaintToDeny] = useState<Complaint | null>(null);
  const [complaintToShowDetails, setComplaintToShowDetails] = useState<Complaint | null>(null);
  const [isDenying, setIsDenying] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
    router.push('/employee/login');
  };

  useEffect(() => {
    const channel = supabase
      .channel('realtime-complaints')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        (payload) => {
           if (payload.eventType === 'INSERT') {
            const newComplaint = payload.new as Complaint;
            setComplaints((prev) => [newComplaint, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          } else if (payload.eventType === 'UPDATE') {
            const updatedComplaint = payload.new as Complaint;
            setComplaints((prev) =>
              prev.map((c) =>
                c.id === updatedComplaint.id ? updatedComplaint : c
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);


  const handleComplaintResolved = (updatedComplaint: Complaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updatedComplaint.id ? updatedComplaint : c))
    );
    setSelectedComplaint(null);
  };

  const handleDenyComplaint = async () => {
    if (!complaintToDeny) return;

    setIsDenying(true);
    const { data, error } = await supabase
      .from('complaints')
      .update({ status: 'Denied' })
      .eq('id', complaintToDeny.id)
      .select()
      .single();
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to deny the complaint. Please try again.',
      });
    } else {
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintToDeny.id ? data as Complaint : c
        )
      );
      toast({
        variant: 'destructive',
        title: 'Complaint Denied',
        description: `Complaint #${complaintToDeny.complaint_number} has been marked as denied.`,
      });
    }
    setIsDenying(false);
    setComplaintToDeny(null);
  };

  const { totalComplaints, newComplaints, resolvedComplaints, chartData, statusChartData } =
    useMemo(() => {
      const categoryCounts = complaints.reduce((acc, complaint) => {
        const category = complaint.category || 'Other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const chartData = Object.entries(categoryCounts)
        .map(([name, total]) => ({
          name,
          complaints: total,
          fill: chartConfig[name as keyof typeof chartConfig]?.color || chartConfig['Other'].color,
        }))
        .sort((a, b) => b.complaints - a.complaints);
      
      const newCount = complaints.filter((c) => c.status === 'New').length;
      const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
      const deniedCount = complaints.filter((c) => c.status === 'Denied').length;
      const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length;
      const inReviewCount = complaints.filter((c) => c.status === 'In Review').length;


      const statusChartData = [
          { status: 'New', count: newCount, fill: 'hsl(var(--chart-2))' },
          { status: 'In Progress', count: inProgressCount, fill: 'hsl(var(--chart-4))' },
          { status: 'In Review', count: inReviewCount, fill: 'hsl(var(--chart-5))' },
          { status: 'Resolved', count: resolvedCount, fill: 'hsl(var(--chart-1))' },
          { status: 'Denied', count: deniedCount, fill: 'hsl(var(--destructive))' },
      ].filter(item => item.count > 0);

      return {
        totalComplaints: complaints.length,
        newComplaints: newCount,
        resolvedComplaints: resolvedCount,
        chartData,
        statusChartData,
      };
    }, [complaints]);

  const getStatusVariant = (status: Complaint['status']) => {
    switch (status) {
      case 'New':
        return 'secondary';
      case 'In Progress':
        return 'outline';
      case 'Resolved':
        return 'default';
      case 'Denied':
        return 'destructive';
      case 'In Review':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      <main className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="p-4 bg-card rounded-lg border">
          <div className="flex items-center justify-between space-y-2 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Complaints Dashboard
              </h1>
              <p className="text-muted-foreground">An overview of all reported issues.</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Card className="transition-transform transform hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Complaints
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalComplaints}</div>
            </CardContent>
          </Card>
          <Card className="transition-transform transform hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Complaints</CardTitle>
              <Newspaper className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newComplaints}</div>
            </CardContent>
          </Card>
          <Card className="transition-transform transform hover:-translate-y-1 hover:shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Resolved Complaints
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{resolvedComplaints}</div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Overview by District wise</CardTitle>
              <CardDescription>Number of complaints per reported district.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--accent))' }}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar
                      dataKey="complaints"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card className="col-span-4 md:col-span-3">
            <CardHeader>
              <CardTitle>Complaints by Status</CardTitle>
              <CardDescription>
                Live distribution of all complaint statuses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={statusChartData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={60}
                      strokeWidth={5}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        index,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            className="text-xs font-bold"
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle>Recent Complaints</CardTitle>
            <CardDescription>
              Here are the latest issues reported by users. Select a row to take action.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((complaint) => (
                  <TableRow key={complaint.id} className="hover:bg-muted/50 transition-colors">
                     <TableCell className="font-semibold">#{complaint.complaint_number}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {complaint.issue}
                    </TableCell>
                    <TableCell>
                      <Image
                        src={complaint.image_url}
                        alt={complaint.issue}
                        width={100}
                        height={66}
                        className="rounded-md object-cover"
                      />
                    </TableCell>
                    <TableCell>
                      {complaint.resolution_image_url ? (
                        <Image
                          src={complaint.resolution_image_url}
                          alt={`Resolution for ${complaint.issue}`}
                          width={100}
                          height={66}
                          className="rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-[100px] h-[66px] bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                          Pending
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline">
                        {complaint.category || 'Other'}
                      </Badge>
                    </TableCell>
                    <TableCell>{complaint.department || 'N/A'}</TableCell>
                    <TableCell>
                      {complaint.location_description}
                    </TableCell>
                     <DateCell dateString={complaint.created_at} />
                     <DateCell dateString={complaint.resolved_at} />
                    <TableCell>
                      <Badge variant={getStatusVariant(complaint.status)}>
                        {complaint.status === 'In Review' && <ShieldAlert className="mr-1 h-3 w-3" />}
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className='flex gap-2 justify-end'>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setComplaintToShowDetails(complaint)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> Details
                          </Button>
                          {(complaint.status === 'New' || complaint.status === 'In Progress' || complaint.status === 'In Review') && (
                            <>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setComplaintToDeny(complaint)}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Deny
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setSelectedComplaint(complaint)}
                              >
                                 <CheckCircle className="mr-2 h-4 w-4" /> Resolve
                              </Button>
                            </>
                          )}
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      {selectedComplaint && (
        <ResolveComplaintModal
          complaint={selectedComplaint}
          onOpenChange={() => setSelectedComplaint(null)}
          onComplaintResolved={handleComplaintResolved}
        />
      )}
       <AlertDialog open={!!complaintToDeny} onOpenChange={(open) => !open && setComplaintToDeny(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to deny this complaint?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently mark the complaint as "Denied" and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDenying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDenyComplaint} disabled={isDenying} variant="destructive">
              {isDenying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Deny Complaint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       {complaintToShowDetails && (
        <ComplaintDetailsModal
          complaint={complaintToShowDetails}
          onOpenChange={() => setComplaintToShowDetails(null)}
        />
      )}
    </>
  );
}
