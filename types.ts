export interface DetailedDiagnosis {
  faceArchitecture: {
    shape: string;
    structuralAnalysis: string;
    skinAge: number;
    agingMarkers: string[];
  };
  zones: ZoneAnalysis[];
  positiveAttributes: string[]; // List of strengths (e.g. "Strong Barrier")
  summary: string;
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

export interface RoutineResult {
  routineGoal: string; // e.g. "The Repair Protocol"
  essentialKit: ProductRecommendation[]; // Items that fit the budget
  recommendedAddon?: ProductRecommendation; // The item skipped due to budget (optional)
  compromiseNote?: string; // Explanation of the trade-off
  amRoutine: string[];
  pmRoutine: string[];
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