
export interface DetailedDiagnosis {
  faceArchitecture: {
    shape: string;
    structuralAnalysis: string;
    skinAge: number;
    agingMarkers: string[];
  };
  zones: ZoneAnalysis[];
  positiveAttributes: string[]; // List of strengths (e.g. "Strong Barrier")
  lifestyle_triggers: LifestyleTrigger[]; // New: Face Mapping Logic
  summary: string;
}

export interface LifestyleTrigger {
  issue: string; // e.g. "Right Cheek Acne"
  trigger: string; // e.g. "Dirty Pillowcase"
  habit: string; // e.g. "Change pillowcase every 2 days"
}

export interface ZoneAnalysis {
  zoneName: 'Forehead' | 'Nose' | 'Left Cheek' | 'Right Cheek' | 'Chin' | 'Under-eyes' | 'Jawline' | 'Neck';
  oilLevel: 'Dry' | 'Balanced' | 'Oily' | 'Very Oily';
  textureScore: number; // 1-10
  issues: IssueDetail[];
}

export interface IssueDetail {
  commonName: string; // e.g., "Pimples"
  medicalTerm: string; // e.g., "Acne Vulgaris"
  category: 'Inflammation' | 'Dryness' | 'Pigmentation' | 'Texture' | 'Aging';
  severity: 'Mild' | 'Moderate' | 'Severe';
  rootCause: string;
  cureStrategy: string;
  // New: Locations keyed by view angle
  locations: {
    view: 'Front' | 'Left' | 'Right';
    box: number[]; // [ymin, xmin, ymax, xmax] 0-1000
  }[];
}

export interface ProductRecommendation {
  category: string;
  name: string;
  brand: string;
  reason: string; // "why_this_specific_bottle" linking to analysis
  keyIngredients: string[]; // Top 3 ingredients
  usageInstructions: string; // Specific tips
  approxPrice: string;
}

export interface RoutineStep {
  stepName: string; // "Cleanse", "Treat", "Moisturize", "Protect"
  productName: string; // Matches a product in essentialKit
  action: string; // "Massage", "Pat", "Dab"
  duration: string; // "60 seconds"
  surface: string; // "Damp skin"
  technique: string; // "Circular motions upward"
  proTip: string; // Esthetician hack
  frequency?: string; // "Daily" or "3x/week"
}

export interface RoutineResult {
  routineGoal: string; // e.g. "The Repair Protocol"
  essentialKit: ProductRecommendation[]; // Items that fit the budget
  recommendedAddon?: ProductRecommendation; // The item skipped due to budget (optional)
  compromiseNote?: string; // Explanation of the trade-off
  safety_warnings: { type: string; warning: string }[]; // New: Ingredient conflicts
  amRoutine: RoutineStep[];
  pmRoutine: RoutineStep[];
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  REPORT = 'REPORT',
  BUDGET = 'BUDGET',
  ROUTINE = 'ROUTINE'
}

export enum BudgetOption {
  BUDGET = '₹500 - ₹1,000',
  STANDARD = '₹1,000 - ₹2,500',
  PREMIUM = '₹2,500+'
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageSize = "1K" | "2K" | "4K";

// --- GLOWUP HUB TYPES ---
export type Gender = 'Men' | 'Women';

export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  full_markdown_content: string; // Using markdown for rich text
  image_generation_prompt: string;
  generated_image_url?: string; // Populated after image gen
  category: string;
  readTime: string;
}

export interface GenderContent {
  tip: {
    title: string;
    content: string;
  };
  blog: BlogPost;
}

export interface DailyFeed {
  date: string; // "YYYY-MM-DD"
  men: GenderContent;
  women: GenderContent;
  generatedAt: number; // Timestamp
}

export interface ContentDB {
  [date: string]: DailyFeed;
}
