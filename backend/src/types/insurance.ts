export type Evidence<T> = { value: T | null; confidence?: number };

export type ExtractedInsurance = {
  document_type?:
    | "CERTIFICATE_OF_INSURANCE"
    | "ENDORSEMENT"
    | "UNKNOWN"
    | "UNRELATED";
  named_insured?: string | null;
  general_liability?: {
    each_occurrence?: Evidence<number | string>;
    aggregate?: Evidence<number | string>;
    effective_date?: Evidence<string>;
    expiration_date?: Evidence<string>;
  };
  workers_comp?: { present?: Evidence<boolean> };
  auto_liability?: {
    limit?: Evidence<number | string>;
    effective_date?: Evidence<string>;
    expiration_date?: Evidence<string>;
  };
  additional_insured?: Evidence<boolean>;
  waiver_of_subrogation?: Evidence<boolean>;
};

export type InsuranceRequirements = {
  general_liability?: {
    required?: boolean;
    occurrence_min?: number | string;
    aggregate_min?: number | string;
  };
  workers_comp?: { required?: boolean };
  auto_liability?: { required?: boolean; minimum?: number | string };
  additional_insured?: boolean;
  waiver_of_subrogation?: boolean;
};

export type ComplianceCheck = {
  rule: string;
  status: "PASS" | "FAIL" | "REVIEW" | "NOT_APPLICABLE";
  required?: number | boolean | string | null;
  provided?: number | boolean | string | null;
};

export type ComplianceResult = {
  compliant: boolean;
  checks: ComplianceCheck[];
  deficiencies: string[];
};
