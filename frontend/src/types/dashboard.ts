export type VendorSummary = {
  id: string;
  name: string;
  vendor_requirements:
    | { requirements: Record<string, unknown> }
    | { requirements: Record<string, unknown> }[]
    | null;
  coi_cases?: {
    id: string;
    status: string;
    work_start_date: string;
    updated_at: string;
  }[];
};
