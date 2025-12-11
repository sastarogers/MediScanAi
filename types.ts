
export enum View {
  HOME = 'HOME',
  SYMPTOM_CHECKER = 'SYMPTOM_CHECKER',
  MEDICATION_SCANNER = 'MEDICATION_SCANNER',
  TIMELINE = 'TIMELINE',
  EMERGENCY = 'EMERGENCY',
  FIND_DOCTOR = 'FIND_DOCTOR'
}

export enum TriageLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  EMERGENCY = 'Emergency'
}

export interface UserProfile {
  id: string;
  name: string;
  type: 'self' | 'child' | 'elderly' | 'other';
  age?: number;
  avatarColor?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: string[]; // Base64 strings
  timestamp: number;
}

export interface HealthRecord {
  id: string;
  profileId: string; // Linked to UserProfile
  date: number;
  type: 'symptom' | 'medication' | 'emergency' | 'appointment' | 'note';
  summary: string;
  details: string; // Markdown content
  triageLevel?: TriageLevel;
  confidence?: number;
  attachments?: string[]; // Base64 strings
  notes?: string; // User added notes
}

export interface VisualAnalysis {
  color: string;
  texture: string;
  shape: string;
  location: string;
  findings: string;
}

export interface Diagnosis {
  condition: string;
  likelihood: string; // High, Medium, Low
  reasoning: string;
  severity: string; // Emergency, High, Moderate, Low
  action: string;
}

export interface AnalysisResponse {
  status: 'in_progress' | 'complete';
  nextQuestion?: string; // Populated if status is in_progress
  
  // Fields below are populated if status is complete
  summary?: string;
  recommendedSpecialist?: string; // e.g. "Dermatologist", "Cardiologist"
  visualAnalysis?: VisualAnalysis;
  differentialDiagnosis?: Diagnosis[];
  detailedAnalysis?: string; // Markdown summary
  triageLevel?: TriageLevel;
  confidenceScore?: number;
  recommendations?: string[];
  disclaimer?: string;
}

export interface DrugInteraction {
  drugName: string;
  severity: 'None' | 'Minor' | 'Moderate' | 'Major' | 'Contraindicated';
  description: string;
  mechanism: string;
  action: string; // e.g., "Consult doctor", "Avoid combination"
}

export interface MedicationResponse {
  name: string;
  genericName?: string;
  dosage: string;
  type: string; // Pill, Capsule, Liquid, etc.
  treatsBodyPart: string; // e.g., "Heart", "Stomach", "General"
  treatsConditions: string[]; // e.g., ["Hypertension", "Angina"]
  uses: string[];
  sideEffects: { common: string[]; rare: string[] };
  usageInstructions: string; // Timing, food, etc.
  missedDose: string;
  storage: string;
  warnings: string[];
  interactionsWithList: DrugInteraction[];
  isExpired: boolean;
  confidence: number;
}

// Represents a medication currently in the user's cabinet
export interface SavedMedication extends MedicationResponse {
  id: string;
  profileId: string; // Linked to UserProfile
  dateAdded: number;
  image: string; // Base64
  notes?: string;
}

export interface HealthPattern {
  type: 'trend' | 'recurrence' | 'correlation' | 'alert';
  title: string;
  description: string;
  severity: 'positive' | 'neutral' | 'negative';
  relatedRecords?: string[]; // IDs of related records
}

export interface HealthInsight {
  summary: string;
  patterns: HealthPattern[];
  recommendations: string[];
  generatedAt: number;
}

export interface FirstAidStep {
  title: string;
  instruction: string;
  hasTimer?: boolean;
  timerSeconds?: number;
  warning?: string;
}

export interface FirstAidGuide {
  title: string;
  severity: 'Critical' | 'Urgent' | 'Moderate';
  steps: FirstAidStep[];
  postEmergency: string[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  number: string;
}

export interface DoctorListing {
  name: string;
  address: string;
  rating?: string;
  phone?: string;
  summary?: string;
  lat?: number;
  lng?: number;
}

export interface AccessibilityConfig {
  fontSize: 'normal' | 'large' | 'xl';
  highContrast: boolean;
  simpleMode: boolean;
  voiceNav: boolean;
  lowData: boolean;
}

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'ur', name: 'اردو (Urdu)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'am', name: 'አማርኛ (Amharic)' },
  { code: 'zh', name: '中文 (Mandarin)' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Tiếng Việt' },
];