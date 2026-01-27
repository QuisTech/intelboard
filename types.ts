export enum NodeType {
  EVENT = 'eventNode',
  PERSON = 'personNode',
  NOTE = 'noteNode',
}

export enum InvestigationType {
  KIDNAPPING = 'kidnapping',
  FINANCIAL_CRIME = 'financial_crime',
  TERRORISM = 'terrorism',
  CORRUPTION = 'corruption',
  GENERAL = 'general'
}

export enum KidnapStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  FATAL = 'fatal'
}

export type PersonStatus = 'suspect' | 'witness' | 'victim' | 'informant' | 'unknown';
export type EvidenceType = 'physical' | 'digital' | 'testimonial' | 'circumstantial' | 'forensic';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  url: string; // Base64 or external link
}

export interface NodeData {
  label: string;
  date?: string;
  evidenceSource?: string;
  notes?: string;
  details?: string;
  
  // Enhanced Intelligence Fields
  aliases?: string;
  personStatus?: PersonStatus;
  evidenceType?: EvidenceType;
  reliability?: number; // 1-5 scale
  
  // Media & GIS
  image?: string; // Base64 string for profile picture
  attachments?: MediaAttachment[];
  coordinates?: Coordinates;
  
  // Note specific
  noteColor?: string;

  // Flexible fields for analysis
  role?: string;
  identifier?: string;
  amount?: number | string;
  location?: string;
  description?: string;
  type?: string;
  medium?: string; // For communication nodes
  deadline?: string;
  suspectedGroup?: string;
  equipment?: string;
  priorCases?: number;
  medicalCondition?: string;
  abductionTime?: string;
  familyWealth?: string;
  insurance?: string;
  [key: string]: any;
}

// 5-LAYER ENGINE OUTPUT STRUCTURE (User Friendly Version)
export interface AnalysisResult {
  // The Narrative
  summary: string;
  
  // Actionable Insights (Rule Engine)
  gaps: string[];
  redFlags: Array<{
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    type: string;
  }>;
  
  // Network Structure (Clustering)
  connections: string[]; // Text description of clusters
  clusters: Array<{
    id: number;
    label: string;
    members: string[];
  }>;

  // Timeline Analysis (Trends)
  temporalTrend: {
    direction: 'Increasing Activity' | 'Decreasing Activity' | 'Stable' | 'Sudden Burst';
    velocity: string; // e.g., "High frequency (3 events/day)"
  };

  // Financial & Geo (Restored)
  financialPatterns: Array<{
    description: string;
    amount?: number;
    type: string;
  }>;
  
  geographicalInsights: Array<{
    location: string;
    activityCount: number;
    significance: string;
  }>;

  // Stats
  stats: {
    totalEntities: number;
    unverifiedSources: number;
    missingTimestamps: number;
  };
}