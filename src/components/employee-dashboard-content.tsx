
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
import { createClient } from '@/lib/supabase/client';
import type { Complaint } from '@/types/complaint';
import {
  CheckCircle,
  Database,
  Eye,
  FileText,
  Filter,
  Info,
  Layers,
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

  // Filter complaints based on selected filters
  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      if (stateFilter && stateFilter !== 'all' && complaint.state !== stateFilter) return false;
      if (districtFilter && districtFilter !== 'all' && complaint.district !== districtFilter) return false;
      if (priorityFilter && priorityFilter !== 'all' && complaint.priority !== priorityFilter) return false;
      if (statusFilter && statusFilter !== 'all' && complaint.status !== statusFilter) return false;
      return true;
    });
  }, [complaints, stateFilter, districtFilter, priorityFilter, statusFilter]);

  const { totalComplaints, newComplaints, resolvedComplaints, chartData, statusChartData, priorityChartData } =
    useMemo(() => {
      const categoryCounts = filteredComplaints.reduce((acc, complaint) => {
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
      
      const newCount = filteredComplaints.filter((c) => c.status === 'New').length;
      const resolvedCount = filteredComplaints.filter((c) => c.status === 'Resolved').length;
      const deniedCount = filteredComplaints.filter((c) => c.status === 'Denied').length;
      const inProgressCount = filteredComplaints.filter((c) => c.status === 'In Progress').length;
      const inReviewCount = filteredComplaints.filter((c) => c.status === 'In Review').length;


      const statusChartData = [
          { status: 'New', count: newCount, fill: 'hsl(var(--chart-2))' },
          { status: 'In Progress', count: inProgressCount, fill: 'hsl(var(--chart-4))' },
          { status: 'In Review', count: inReviewCount, fill: 'hsl(var(--chart-5))' },
          { status: 'Resolved', count: resolvedCount, fill: 'hsl(var(--chart-1))' },
          { status: 'Denied', count: deniedCount, fill: 'hsl(var(--destructive))' },
      ].filter(item => item.count > 0);

      const priorityCounts = filteredComplaints.reduce((acc, complaint) => {
        const priority = complaint.priority || 'Unknown';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityChartData = [
          { priority: 'Low', count: priorityCounts['Low'] || 0, fill: '#10b981' },
          { priority: 'Medium', count: priorityCounts['Medium'] || 0, fill: '#f59e0b' },
          { priority: 'High', count: priorityCounts['High'] || 0, fill: '#dc2626' },
          { priority: 'Unknown', count: priorityCounts['Unknown'] || 0, fill: 'hsl(var(--muted))' },
      ].filter(item => item.count > 0);

      return {
        totalComplaints: complaints.length,
        newComplaints: newCount,
        resolvedComplaints: resolvedCount,
        chartData,
        statusChartData,
        priorityChartData,
      };
    }, [filteredComplaints]);

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
        <Card className="animate-fade-in border-none shadow-lg" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Layers className="h-6 w-6 text-primary" />
                Recent Complaints
                <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-primary/20 animate-pulse">
                  <span className="mr-1 h-2 w-2 rounded-full bg-primary" />
                  Live
                </Badge>
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Manage and respond to the latest issues reported by the community.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.map((complaint) => (
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
                    <TableCell>
                      <Badge 
                        variant={
                          complaint.priority === 'High' ? 'destructive' :
                          complaint.priority === 'Medium' ? 'default' :
                          complaint.priority === 'Low' ? 'secondary' :
                          'secondary'
                        }
                        className={
                          complaint.priority === 'Low' ? 'bg-emerald-500 hover:bg-emerald-600' :
                          complaint.priority === 'Medium' ? 'bg-amber-500 hover:bg-amber-600' :
                          complaint.priority === 'High' ? 'bg-red-600 hover:bg-red-700' :
                          ''
                        }
                      >
                        {complaint.priority || 'Not Set'}
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
            <AlertDialogAction onClick={handleDenyComplaint} disabled={isDenying}>
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
