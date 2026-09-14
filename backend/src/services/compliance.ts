import type {
  ComplianceResult,
  ExtractedInsurance,
  InsuranceRequirements,
} from "../types/insurance.js";

export function normalizeLimit(value: number | string | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = value
    .trim()
    .toUpperCase()
    .replace(/[$,\s]/g, "");
  const multiplier = text.endsWith("M")
    ? 1_000_000
    : text.endsWith("K")
      ? 1_000
      : 1;
  const number = Number.parseFloat(text.replace(/[MK]$/, ""));
  return Number.isFinite(number) ? number * multiplier : null;
}

function evidenceValue<T>(
  evidence: { value?: T | null; confidence?: number } | undefined
) {
  if (!evidence || evidence.value == null)
    return { value: null as T | null, review: true };
  return {
    value: evidence.value,
    review: evidence.confidence != null && evidence.confidence < 0.8,
  };
}

function check(
  checks: ComplianceResult["checks"],
  deficiencies: string[],
  rule: string,
  provided: number | boolean | string | null,
  required: number | boolean | string | null | undefined,
  deficiency: string,
  review = false
) {
  const needsReview = review || provided === null;
  const passed =
    !needsReview &&
    (typeof required === "number"
      ? (provided as number) >= required
      : provided === required);
  checks.push({
    rule,
    status: needsReview ? "REVIEW" : passed ? "PASS" : "FAIL",
    provided,
    ...(required !== undefined ? { required } : {}),
  });
  if (needsReview || !passed) deficiencies.push(deficiency);
}

function dateCheck(
  checks: ComplianceResult["checks"],
  deficiencies: string[],
  rule: string,
  provided: string | null,
  workStartDate: string,
  valid: boolean,
  deficiency: string,
  review: boolean
) {
  const status = review || !provided ? "REVIEW" : valid ? "PASS" : "FAIL";
  checks.push({ rule, status, provided, required: workStartDate });
  if (status !== "PASS") deficiencies.push(deficiency);
}

export function evaluateCompliance(
  requirements: InsuranceRequirements,
  extracted: ExtractedInsurance,
  workStartDate: string
): ComplianceResult {
  const checks: ComplianceResult["checks"] = [];
  const deficiencies: string[] = [];
  const gl = extracted.general_liability;
  if (requirements.general_liability?.required !== false) {
    const occurrence = evidenceValue(gl?.each_occurrence);
    const aggregate = evidenceValue(gl?.aggregate);
    check(
      checks,
      deficiencies,
      "GENERAL_LIABILITY_OCCURRENCE",
      normalizeLimit(occurrence.value),
      normalizeLimit(requirements.general_liability?.occurrence_min),
      "GENERAL_LIABILITY_OCCURRENCE",
      occurrence.review
    );
    check(
      checks,
      deficiencies,
      "GENERAL_LIABILITY_AGGREGATE",
      normalizeLimit(aggregate.value),
      normalizeLimit(requirements.general_liability?.aggregate_min),
      "GENERAL_LIABILITY_AGGREGATE",
      aggregate.review
    );
  }

  const workers = evidenceValue(extracted.workers_comp?.present);
  if (requirements.workers_comp?.required)
    check(
      checks,
      deficiencies,
      "WORKERS_COMP_PRESENT",
      workers.value,
      true,
      "WORKERS_COMP_MISSING",
      workers.review
    );

  const auto = evidenceValue(extracted.auto_liability?.limit);
  if (requirements.auto_liability?.required)
    check(
      checks,
      deficiencies,
      "AUTO_LIMIT",
      normalizeLimit(auto.value),
      normalizeLimit(requirements.auto_liability.minimum),
      "AUTO_LIMIT_TOO_LOW",
      auto.review
    );

  const additional = evidenceValue(extracted.additional_insured);
  if (requirements.additional_insured)
    check(
      checks,
      deficiencies,
      "ADDITIONAL_INSURED",
      additional.value,
      true,
      "ADDITIONAL_INSURED_MISSING",
      additional.review
    );
  const waiver = evidenceValue(extracted.waiver_of_subrogation);
  if (requirements.waiver_of_subrogation)
    check(
      checks,
      deficiencies,
      "WAIVER_OF_SUBROGATION",
      waiver.value,
      true,
      "WAIVER_MISSING",
      waiver.review
    );

  for (const [name, dates] of [
    ["GL", gl],
    ["AUTO", extracted.auto_liability],
  ] as const) {
    if (!dates) continue;
    const start = evidenceValue(dates.effective_date);
    const end = evidenceValue(dates.expiration_date);
    dateCheck(
      checks,
      deficiencies,
      `${name}_EFFECTIVE_DATE`,
      start.value,
      workStartDate,
      Boolean(start.value && start.value <= workStartDate),
      `${name}_EFFECTIVE_DATE_INVALID`,
      start.review
    );
    dateCheck(
      checks,
      deficiencies,
      `${name}_EXPIRATION_DATE`,
      end.value,
      workStartDate,
      Boolean(end.value && end.value >= workStartDate),
      `${name}_EXPIRATION_DATE_INVALID`,
      end.review
    );
  }

  return { compliant: deficiencies.length === 0, checks, deficiencies };
}
