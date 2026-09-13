export const REPORT_TYPES = [
  "membership",
  "attendance",
  "welfare",
  "finance",
  "department",
  "visitors",
  "annual",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_LABELS: Record<ReportType, string> = {
  membership: "Membership Report",
  attendance: "Attendance Report",
  welfare: "Welfare Report",
  finance: "Financial Report",
  department: "Department Report",
  visitors: "Visitor Report",
  annual: "Annual Church Report",
};

export const EMPTY_PERIOD = "No data available for this period.";

export type ReportFilters = {
  type: ReportType;
  year: number;
  month?: number;
  from?: string;
  to?: string;
  departmentId?: string;
  remarks?: string;
};

export type ChurchThemeRecord = {
  id: string;
  year: number;
  title: string;
  scripture: string | null;
  description: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
};

export type ReportStat = { label: string; value: string };
export type ReportSection = {
  title: string;
  empty?: boolean;
  stats?: ReportStat[];
  columns?: string[];
  rows?: (string | number)[][];
  note?: string;
};

export type BuiltReport = {
  type: ReportType;
  title: string;
  churchName: string;
  assemblyName: string;
  year: number;
  periodLabel: string;
  from: string;
  to: string;
  theme: Pick<ChurchThemeRecord, "year" | "title" | "scripture" | "description"> | null;
  generatedAt: string;
  preparedBy: string;
  approvedBy: string;
  remarks?: string;
  sections: ReportSection[];
  restrictedNote?: string;
};
