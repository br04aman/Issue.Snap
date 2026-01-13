export type Complaint = {
  id: string;
  complaint_number: number;
  issue: string;
  location_description: string;
  status: 'New' | 'In Progress' | 'Resolved' | 'Denied' | 'In Review';
  image_url: string;
  created_at: string;
  latitude: number;
  longitude: number;
  category: string;
  department: string;
  priority: 'Low' | 'Medium' | 'High' | null;
  state: string | null;
  district: string | null;
  resolution_image_url: string | null;
  resolved_at: string | null;
  denial_reason: string | null;
};
