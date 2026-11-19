
'use client';

import { ResolveComplaintModal } from '@/components/resolve-complaint-modal';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { INDIAN_STATES_AND_DISTRICTS, getDistrictsByState } from '@/data/indian-states-districts';
import { useToast } from '@/hooks/use-toast';
import { withComplaintPriority } from '@/lib/priority';
import { createClient } from '@/lib/supabase/client';
import type { Complaint } from '@/types/complaint';
import {
  CheckCircle,
  Database,
  Eye,
  FileText,
  Filter,
  Info,
  Loader2,
  LocateFixed,
  LogOut,
  MapPin,
  Newspaper,
  ShieldAlert,
  XCircle
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
    color: 'hsl(var(--chart-1))',
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

const categoryChartColors: Record<string, string> = {
  Pothole: 'hsl(var(--chart-1))',
  Graffiti: 'hsl(var(--chart-2))',
  Trash: 'hsl(var(--chart-3))',
  'Broken Streetlight': 'hsl(var(--chart-4))',
  Other: 'hsl(var(--chart-5))',
};

export function EmployeeDashboardContent({ initialComplaints }: {initialComplaints: Complaint[]}) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [complaintToDeny, setComplaintToDeny] = useState<Complaint | null>(null);
  const [complaintToShowDetails, setComplaintToShowDetails] = useState<Complaint | null>(null);
  const [isDenying, setIsDenying] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  
  // Filter states
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);

  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
    router.push('/admin');
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

  // Update available districts when state changes
  useEffect(() => {
    if (stateFilter && stateFilter !== 'all') {
      const districts = getDistrictsByState(stateFilter);
      setAvailableDistricts(districts);
      // Reset district filter if it's not in the new state
      if (districtFilter !== 'all' && !districts.includes(districtFilter)) {
        setDistrictFilter('all');
      }
    } else {
      setAvailableDistricts([]);
      setDistrictFilter('all');
    }
  }, [stateFilter, districtFilter]);


  const handleComplaintResolved = (updatedComplaint: Complaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === updatedComplaint.id ? updatedComplaint : c))
    );
    setSelectedComplaint(null);
  };

  const handleDenyComplaint = async () => {
    if (!complaintToDeny || !denialReason.trim()) {
      if (!denialReason.trim()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please provide a reason for denying the complaint.',
        });
      }
      return;
    }

    setIsDenying(true);
    const { data, error } = await supabase
      .from('complaints')
      .update({ 
        status: 'Denied',
        denial_reason: denialReason.trim()
      })
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
    setDenialReason('');
  };

  // Score every complaint once so the research-based priority label is
  // available for filtering, then re-rank the filtered subset.
  const scoredComplaints = useMemo(
    () => withComplaintPriority(complaints),
    [complaints]
  );

  // Filter complaints based on selected filters
  const filteredComplaints = useMemo(() => {
    return scoredComplaints.filter((complaint) => {
      if (stateFilter && stateFilter !== 'all' && complaint.state !== stateFilter) return false;
      if (districtFilter && districtFilter !== 'all' && complaint.district !== districtFilter) return false;
      if (priorityFilter && priorityFilter !== 'all' && complaint.priority_label !== priorityFilter) return false;
      if (statusFilter && statusFilter !== 'all' && complaint.status !== statusFilter) return false;
      return true;
    });
  }, [scoredComplaints, stateFilter, districtFilter, priorityFilter, statusFilter]);

  const prioritizedComplaints = useMemo(
    () =>
      filteredComplaints.map((complaint, index) => ({
        ...complaint,
        priority_rank: index + 1,
      })),
    [filteredComplaints]
  );

  const { totalComplaints, newComplaints, resolvedComplaints, chartData, statusChartData, priorityChartData } =
    useMemo(() => {
      const categoryCounts = prioritizedComplaints.reduce((acc, complaint) => {
        const category = complaint.category || 'Other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const chartData = Object.entries(categoryCounts)
        .map(([name, total]) => ({
          name,
          complaints: total,
          fill: categoryChartColors[name] ?? categoryChartColors.Other,
        }))
        .sort((a, b) => b.complaints - a.complaints);
      
      const newCount = prioritizedComplaints.filter((c) => c.status === 'New').length;
      const resolvedCount = prioritizedComplaints.filter((c) => c.status === 'Resolved').length;
      const deniedCount = prioritizedComplaints.filter((c) => c.status === 'Denied').length;
      const inProgressCount = prioritizedComplaints.filter((c) => c.status === 'In Progress').length;
      const inReviewCount = prioritizedComplaints.filter((c) => c.status === 'In Review').length;


      const statusChartData = [
          { status: 'New', count: newCount, fill: 'hsl(var(--chart-2))' },
          { status: 'In Progress', count: inProgressCount, fill: 'hsl(var(--chart-4))' },
          { status: 'In Review', count: inReviewCount, fill: 'hsl(var(--chart-5))' },
          { status: 'Resolved', count: resolvedCount, fill: 'hsl(var(--chart-1))' },
          { status: 'Denied', count: deniedCount, fill: 'hsl(var(--destructive))' },
      ].filter(item => item.count > 0);

      const priorityCounts = prioritizedComplaints.reduce((acc, complaint) => {
        const priority = complaint.priority_label || 'Unknown';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityChartData = [
          { priority: 'Low', count: priorityCounts['Low'] || 0, fill: '#10b981' },
          { priority: 'Medium', count: priorityCounts['Medium'] || 0, fill: '#f59e0b' },
          { priority: 'High', count: priorityCounts['High'] || 0, fill: '#dc2626' },
          { priority: 'Critical', count: priorityCounts['Critical'] || 0, fill: '#7f1d1d' },
      ].filter(item => item.count > 0);

      return {
        totalComplaints: prioritizedComplaints.length,
        newComplaints: newCount,
        resolvedComplaints: resolvedCount,
        chartData,
        statusChartData,
        priorityChartData,
      };
    }, [prioritizedComplaints]);

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

  const getPriorityBadgeClassName = (priorityLabel?: Complaint['priority_label']) => {
    switch (priorityLabel) {
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
          <Card className="col-span-4 md:col-span-3">
            <CardHeader>
              <CardTitle>Complaints by Priority</CardTitle>
              <CardDescription>
                Distribution of complaints by priority level.
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
                      data={priorityChartData}
                      dataKey="count"
                      nameKey="priority"
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
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
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
            <CardTitle>Priority Queue</CardTitle>
            <CardDescription>
              Complaints are ranked using the research-paper severity, recurrence, and exposure model.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {complaints.length === 0 ? (
              <div className="mb-6 p-8 bg-muted/50 border-2 border-dashed rounded-xl text-center">
                <Info className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-foreground">No complaints found</h3>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                  The database is currently empty. New reports will appear here automatically as they are submitted.
                </p>
              </div>
            ) : (
              <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary/60 uppercase tracking-wider">Total Data</p>
                    <p className="text-xl font-bold text-primary">{complaints.length}</p>
                  </div>
                </div>
                <div className="p-4 bg-orange-500/5 rounded-xl border border-orange-500/10 flex items-start gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Filter className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-orange-600/60 uppercase tracking-wider">Filtered</p>
                    <p className="text-xl font-bold text-orange-600">{filteredComplaints.length}</p>
                  </div>
                </div>
                <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-600/60 uppercase tracking-wider">Active States</p>
                    <p className="text-xl font-bold text-blue-600 truncate max-w-[120px]">
                      {[...new Set(complaints.map(c => c.state).filter(Boolean))].length}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <LocateFixed className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-600/60 uppercase tracking-wider">Districts</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {[...new Set(complaints.map(c => c.district).filter(Boolean))].length}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Controls */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">State</label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {INDIAN_STATES_AND_DISTRICTS.map((state) => (
                      <SelectItem key={state.state} value={state.state}>
                        {state.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">District</label>
                <Select value={districtFilter} onValueChange={setDistrictFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {availableDistricts.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="In Review">In Review</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Clear Filters Button */}
            {(stateFilter !== 'all' || districtFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all') && (
              <div className="mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStateFilter('all');
                    setDistrictFilter('all');
                    setPriorityFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Score</TableHead>
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
                {prioritizedComplaints.map((complaint) => (
                  <TableRow key={complaint.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-semibold">#{complaint.priority_rank}</TableCell>
                    <TableCell className="font-semibold">#{complaint.complaint_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityBadgeClassName(complaint.priority_label)}>
                        {complaint.priority_label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {complaint.priority_score?.toFixed(2) ?? '--'}
                    </TableCell>
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
       <AlertDialog open={!!complaintToDeny} onOpenChange={(open) => {
          if (!open) {
            setComplaintToDeny(null);
            setDenialReason('');
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to deny this complaint?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently mark the complaint as "Denied" and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="denial-reason" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Reason for denial *
              </label>
              <textarea
                id="denial-reason"
                placeholder="Please provide a reason for denying this complaint..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                disabled={isDenying}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDenying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDenyComplaint}
              disabled={isDenying}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
