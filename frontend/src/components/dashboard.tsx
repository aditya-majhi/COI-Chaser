import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import type { VendorSummary } from "../types/dashboard";

type Props = {
  vendors: VendorSummary[];
  loading: boolean;
  onRefresh: () => void;
  onReview: (
    caseId: string,
    decision: "REQUEST_MORE_EVIDENCE" | "REJECT" | "APPROVE_EXCEPTION"
  ) => void;
  onCreateCase: (vendorId: string, workStartDate: string) => void;
  onUploadDocument: (caseId: string, file: File) => void;
  pendingAction: string | null;
  processingCaseIds: string[];
};

const attention = new Set([
  "NON_COMPLIANT",
  "WAITING_FOR_CORRECTION",
  "HUMAN_REVIEW",
  "BLOCKED",
]);
const terminal = new Set(["CLEARED", "BLOCKED", "CLOSED"]);

function NewCaseControl({
  disabled,
  onCreateCase,
  vendorId,
}: {
  disabled: boolean;
  onCreateCase: Props["onCreateCase"];
  vendorId: string;
}) {
  const [workStartDate, setWorkStartDate] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={event => {
        event.preventDefault();
        if (workStartDate && !disabled) onCreateCase(vendorId, workStartDate);
      }}
    >
      <input
        type="date"
        required
        disabled={disabled}
        value={workStartDate}
        onChange={event => setWorkStartDate(event.target.value)}
        className="rounded border border-[#ccd6cb] px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded bg-[#173d32] px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
      >
        {disabled ? "Starting..." : "Start case"}
      </button>
    </form>
  );
}

export function Dashboard({
  vendors,
  loading,
  onRefresh,
  onReview,
  onCreateCase,
  onUploadDocument,
  pendingAction,
  processingCaseIds,
}: Props) {
  const cases = vendors.flatMap(vendor => vendor.coi_cases ?? []);
  const cleared = cases.filter(item => item.status === "CLEARED").length;
  const blocked = cases.filter(item => item.status === "BLOCKED").length;
  const handling = cases.filter(
    item =>
      item.status === "WAITING_FOR_DOCUMENT" || item.status === "PROCESSING"
  ).length;
  const needsYou = cases.filter(item => attention.has(item.status)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b35d38]">
            Insurance compliance
          </p>
          <h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[#173d32]">
            Good morning, here is the work.
          </h2>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg border border-[#ccd6cb] bg-white px-3 py-2 text-sm font-semibold text-[#365247] hover:bg-[#eef3eb]"
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Active vendors", vendors.length, "#173d32"],
          ["Cleared", cleared, "#3d7657"],
          ["Agent handling", handling, "#b35d38"],
          ["Need you", needsYou + blocked, "#a33e32"],
        ].map(([label, value, color]) => (
          <div
            key={label}
            className="border-t-4 bg-white p-5 shadow-[0_8px_24px_rgba(32,57,42,0.05)]"
            style={{ borderColor: color as string }}
          >
            <p className="text-sm text-[#718078]">{label}</p>
            <p
              className="mt-2 text-4xl font-semibold"
              style={{ color: color as string }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
      <section className="overflow-hidden border border-[#d7ddd5] bg-white">
        <div className="flex items-center justify-between border-b border-[#e2e7e1] px-5 py-4">
          <div>
            <h3 className="font-semibold text-[#173d32]">Vendor queue</h3>
            <p className="mt-1 text-sm text-[#718078]">
              Cases requiring a clear next action
            </p>
          </div>
          <ArrowUpRight size={18} className="text-[#718078]" />
        </div>
        {vendors.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-[#718078]">
            No vendors are connected to this organization yet.
          </div>
        ) : (
          <div className="divide-y divide-[#edf0ec]">
            {vendors.map(vendor => {
              const latest = vendor.coi_cases?.[0];
              const isClear = latest?.status === "CLEARED";
              const casePending = pendingAction === `case:${vendor.id}`;
              const uploadPending = latest
                ? pendingAction === `upload:${latest.id}` ||
                  processingCaseIds.includes(latest.id)
                : false;
              const reviewPending = latest
                ? pendingAction === `review:${latest.id}`
                : false;
              return (
                <div
                  key={vendor.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7eee0] text-[#365247]">
                      <ShieldCheck size={17} />
                    </div>
                    <div>
                      <p className="font-semibold text-[#263a30]">
                        {vendor.name}
                      </p>
                      <p className="text-xs text-[#718078]">
                        {vendor.vendor_requirements?.length
                          ? "Requirements assigned"
                          : "Requirements missing"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 text-sm font-semibold ${isClear ? "text-[#3d7657]" : "text-[#b35d38]"}`}
                  >
                    {isClear ? (
                      <CircleCheck size={16} />
                    ) : (
                      <CircleAlert size={16} />
                    )}
                    {uploadPending
                      ? "PROCESSING DOCUMENT"
                      : (latest?.status ?? "NO CASE")}
                    {!latest && (
                      <NewCaseControl
                        disabled={casePending}
                        vendorId={vendor.id}
                        onCreateCase={(vendorId, workStartDate) => {
                          if (!casePending)
                            onCreateCase(vendorId, workStartDate);
                        }}
                      />
                    )}
                    {latest && !terminal.has(latest.status) && (
                      <label
                        className={`rounded border border-[#ccd6cb] px-2 py-1 text-xs font-medium text-[#365247] ${uploadPending ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      >
                        {uploadPending ? "Uploading..." : "Upload PDF"}
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={uploadPending}
                          className="hidden"
                          onChange={event => {
                            const file = event.target.files?.[0];
                            if (file) onUploadDocument(latest.id, file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    {latest?.status === "HUMAN_REVIEW" && (
                      <div className="flex gap-2 text-xs">
                        <button
                          disabled={reviewPending}
                          className="rounded border border-[#ccd6cb] px-2 py-1 text-[#365247]"
                          onClick={() =>
                            onReview(latest.id, "REQUEST_MORE_EVIDENCE")
                          }
                        >
                          Request evidence
                        </button>
                        <button
                          disabled={reviewPending}
                          className="rounded bg-[#173d32] px-2 py-1 text-white"
                          onClick={() =>
                            onReview(latest.id, "APPROVE_EXCEPTION")
                          }
                        >
                          Approve exception
                        </button>
                        <button
                          disabled={reviewPending}
                          className="rounded bg-[#a33e32] px-2 py-1 text-white"
                          onClick={() => onReview(latest.id, "REJECT")}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
