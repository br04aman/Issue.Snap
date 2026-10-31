export type PriorityLabel = 'Low' | 'Medium' | 'High' | 'Critical';

export type PrioritizableComplaint = {
  id: string;
  created_at: string;
  issue: string;
  category?: string | null;
  department?: string | null;
  location_description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string | null;
};

export type ComplaintPriorityMetrics = {
  priority_score: number;
  priority_label: PriorityLabel;
  priority_rank: number;
  severity_score: number;
  occurrence_score: number;
  exposure_score: number;
  recurrence_count: number;
  road_importance: number;
};

const NINETY_DAYS_IN_MS = 90 * 24 * 60 * 60 * 1000;
const CLUSTER_RADIUS_KM = 2;

const CATEGORY_SEVERITY_MAP: Record<string, number> = {
  pothole: 7.0,
  'broken streetlight': 6.0,
  trash: 4.0,
  graffiti: 3.5,
  other: 2.0,
};

const DEPARTMENT_SEVERITY_MAP: Record<string, number> = {
  'public works': 6.5,
  sanitation: 4.0,
  'community services': 3.5,
  'general administration': 2.0,
};

const CATEGORY_ROAD_CLASS_MAP: Record<string, number> = {
  pothole: 4,
  'broken streetlight': 4,
  trash: 2,
  graffiti: 2,
  other: 2,
};

const DEPARTMENT_ROAD_CLASS_MAP: Record<string, number> = {
  'public works': 4,
  sanitation: 2,
  'community services': 2,
  'general administration': 2,
};

const SEVERITY_KEYWORD_RULES: Array<{ score: number; keywords: string[] }> = [
  {
    score: 9.5,
    keywords: ['collapse', 'collapsed', 'structural', 'building crack', 'falling wall'],
  },
  {
    score: 9.0,
    keywords: ['traffic signal', 'signal outage', 'signal not working', 'lights not working at junction'],
  },
  {
    score: 8.0,
    keywords: ['sewer', 'flood', 'flooding', 'water main', 'overflow', 'drainage'],
  },
  {
    score: 7.0,
    keywords: ['pothole', 'road damage', 'road crack', 'street damage'],
  },
  {
    score: 6.0,
    keywords: ['streetlight', 'street light', 'dark road', 'dark street'],
  },
  {
    score: 5.5,
    keywords: ['sidewalk', 'footpath', 'fallen tree', 'tree branch'],
  },
  {
    score: 4.0,
    keywords: ['trash', 'garbage', 'dumping', 'waste', 'dirty'],
  },
  {
    score: 3.5,
    keywords: ['graffiti', 'noise', 'loud music'],
  },
  {
    score: 2.0,
    keywords: ['billing', 'tax', 'paperwork', 'certificate'],
  },
];

const ROAD_IMPORTANCE_RULES: Array<{ roadClass: number; keywords: string[] }> = [
  {
    roadClass: 5,
    keywords: ['highway', 'expressway', 'freeway', 'flyover'],
  },
  {
    roadClass: 4,
    keywords: [
      'main road',
      'arterial',
      'avenue',
      'boulevard',
      'intersection',
      'junction',
      'crossroad',
      'market',
      'school',
      'hospital',
      'bus stop',
      'station',
    ],
  },
  {
    roadClass: 3,
    keywords: ['street', 'road', 'lane', 'residential'],
  },
];

const STATUS_ORDER: Record<string, number> = {
  New: 0,
  'In Progress': 1,
  'In Review': 2,
  Resolved: 3,
  Denied: 4,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function haversineDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasCoordinates(complaint: PrioritizableComplaint) {
  return Number.isFinite(complaint.latitude) && Number.isFinite(complaint.longitude);
}

function isSameArea(target: PrioritizableComplaint, candidate: PrioritizableComplaint) {
  if (hasCoordinates(target) && hasCoordinates(candidate)) {
    return (
      haversineDistanceKm(
        target.latitude as number,
        target.longitude as number,
        candidate.latitude as number,
        candidate.longitude as number
      ) <= CLUSTER_RADIUS_KM
    );
  }

  const targetLocation = normalizeText(target.location_description);
  const candidateLocation = normalizeText(candidate.location_description);

  return !!targetLocation && targetLocation === candidateLocation;
}

function isSameIssueCluster(target: PrioritizableComplaint, candidate: PrioritizableComplaint) {
  const targetCategory = normalizeText(target.category);
  const candidateCategory = normalizeText(candidate.category);

  if (targetCategory && candidateCategory && targetCategory !== candidateCategory) {
    return false;
  }

  const targetDepartment = normalizeText(target.department);
  const candidateDepartment = normalizeText(candidate.department);

  if (!targetCategory && !candidateCategory && targetDepartment && candidateDepartment && targetDepartment !== candidateDepartment) {
    return false;
  }

  return isSameArea(target, candidate);
}

function getSeverityFromKeywords(issue: string) {
  const normalizedIssue = normalizeText(issue);

  for (const rule of SEVERITY_KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => normalizedIssue.includes(keyword))) {
      return rule.score;
    }
  }

  return 2.0;
}

function getSeverityScore(complaint: PrioritizableComplaint) {
  const categorySeverity = CATEGORY_SEVERITY_MAP[normalizeText(complaint.category)] ?? 2.0;
  const departmentSeverity = DEPARTMENT_SEVERITY_MAP[normalizeText(complaint.department)] ?? 2.0;
  const keywordSeverity = getSeverityFromKeywords(complaint.issue);

  return clamp(Math.max(categorySeverity, departmentSeverity, keywordSeverity), 1, 10);
}

function estimateRoadImportance(complaint: PrioritizableComplaint) {
  const categoryRoadClass = CATEGORY_ROAD_CLASS_MAP[normalizeText(complaint.category)] ?? 2;
  const departmentRoadClass = DEPARTMENT_ROAD_CLASS_MAP[normalizeText(complaint.department)] ?? 2;
  const locationText = normalizeText(`${complaint.location_description ?? ''} ${complaint.issue}`);

  let inferredRoadClass = Math.max(categoryRoadClass, departmentRoadClass);

  for (const rule of ROAD_IMPORTANCE_RULES) {
    if (rule.keywords.some((keyword) => locationText.includes(keyword))) {
      inferredRoadClass = Math.max(inferredRoadClass, rule.roadClass);
    }
  }

  return clamp(inferredRoadClass, 1, 5);
}

function getRecurrenceCount(target: PrioritizableComplaint, complaints: PrioritizableComplaint[]) {
  const targetTimestamp = new Date(target.created_at).getTime();

  if (Number.isNaN(targetTimestamp)) {
    return 1;
  }

  const windowStart = targetTimestamp - NINETY_DAYS_IN_MS;
  const recurrence = complaints.filter((complaint) => {
    const timestamp = new Date(complaint.created_at).getTime();

    if (Number.isNaN(timestamp) || timestamp < windowStart || timestamp > targetTimestamp) {
      return false;
    }

    return isSameIssueCluster(target, complaint);
  }).length;

  return clamp(recurrence || 1, 1, 50);
}

function getPriorityLabel(priorityScore: number): PriorityLabel {
  if (priorityScore < 3.2) {
    return 'Low';
  }

  if (priorityScore < 4.5) {
    return 'Medium';
  }

  if (priorityScore < 6.0) {
    return 'High';
  }

  return 'Critical';
}

function compareComplaints(
  left: PrioritizableComplaint &
    Omit<ComplaintPriorityMetrics, 'priority_rank'>,
  right: PrioritizableComplaint &
    Omit<ComplaintPriorityMetrics, 'priority_rank'>
) {
  const statusDelta = (STATUS_ORDER[left.status ?? 'Denied'] ?? 99) - (STATUS_ORDER[right.status ?? 'Denied'] ?? 99);

  if (statusDelta !== 0) {
    return statusDelta;
  }

  const priorityDelta = right.priority_score - left.priority_score;

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
}

export function withComplaintPriority<T extends PrioritizableComplaint>(complaints: T[]) {
  const scoredComplaints = complaints.map((complaint) => {
    const severityScore = getSeverityScore(complaint);
    const recurrenceCount = getRecurrenceCount(complaint, complaints);
    const roadImportance = estimateRoadImportance(complaint);
    const occurrenceScore = 1 + 9 * ((recurrenceCount - 1) / 49);
    const exposureScore = 1 + 9 * ((roadImportance - 1) / 4);
    const priorityScore = clamp(
      0.45 * severityScore +
        0.2 * occurrenceScore +
        0.1 * exposureScore +
        0.035 * severityScore * occurrenceScore,
      1,
      10
    );

    return {
      ...complaint,
      severity_score: roundToTwo(severityScore),
      recurrence_count: recurrenceCount,
      road_importance: roadImportance,
      occurrence_score: roundToTwo(occurrenceScore),
      exposure_score: roundToTwo(exposureScore),
      priority_score: roundToTwo(priorityScore),
      priority_label: getPriorityLabel(priorityScore),
    };
  });

  return scoredComplaints
    .sort(compareComplaints)
    .map((complaint, index) => ({
      ...complaint,
      priority_rank: index + 1,
    })) as Array<T & ComplaintPriorityMetrics>;
}
