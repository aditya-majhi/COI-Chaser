import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dashboard } from "./components/dashboard";
import { AddVendorForm } from "./components/add-vendor";
import { Login } from "./components/login";
import { OrganizationSetup } from "./components/organization-setup";
import { useSession } from "./hooks/useSession";
import { listVendors } from "./services/api/vendors";
import {
  createCase,
  decideHumanReview,
  requestCase,
} from "./services/api/cases";
import { uploadDocument } from "./services/api/documents";
import { signOut } from "./services/auth";
import type { VendorSummary } from "./types/dashboard";

const ORGANIZATION_STORAGE_KEY = "coi_organization_id";
const ACTIVE_STATUSES = new Set([
  "DOCUMENT_RECEIVED",
  "PROCESSING",
  "NON_COMPLIANT",
]);
const STABLE_STATUSES = new Set([
  "CLEARED",
  "WAITING_FOR_CORRECTION",
  "HUMAN_REVIEW",
  "BLOCKED",
  "CLOSED",
]);

function App() {
  const { session, loading: sessionLoading } = useSession();
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [processingCaseIds, setProcessingCaseIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(
    () =>
      import.meta.env.VITE_ORGANIZATION_ID ??
      localStorage.getItem(ORGANIZATION_STORAGE_KEY)
  );

  const selectOrganization = (id: string) => {
    localStorage.setItem(ORGANIZATION_STORAGE_KEY, id);
    setOrganizationId(id);
  };

  const refresh = async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    try {
      setVendors((await listVendors(organizationId)) as VendorSummary[]);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not refresh vendors."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [organizationId]);

  useEffect(() => {
    setProcessingCaseIds(current =>
      current.filter(
        caseId =>
          !vendors.some(vendor =>
            vendor.coi_cases?.some(
              item => item.id === caseId && STABLE_STATUSES.has(item.status)
            )
          )
      )
    );
  }, [vendors]);

  useEffect(() => {
    if (
      !organizationId ||
      (processingCaseIds.length === 0 &&
        !vendors.some(vendor =>
          vendor.coi_cases?.some(item => ACTIVE_STATUSES.has(item.status))
        ))
    )
      return;
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [organizationId, vendors, processingCaseIds]);

  if (sessionLoading) return null;
  if (!session) return <Login />;
  if (!organizationId)
    return <OrganizationSetup onCreated={selectOrganization} />;

  const review = async (
    caseId: string,
    decision: "REQUEST_MORE_EVIDENCE" | "REJECT" | "APPROVE_EXCEPTION"
  ) => {
    if (!organizationId) return;
    await runAction(`review:${caseId}`, "Review decision saved.", async () => {
      await decideHumanReview(organizationId, caseId, decision);
      await refresh();
    });
  };

  const createCaseForVendor = async (
    vendorId: string,
    workStartDate: string
  ) => {
    if (!organizationId) return;
    await runAction(
      `case:${vendorId}`,
      "Case started and request recorded.",
      async () => {
        const created = (await createCase(organizationId, vendorId, {
          work_start_date: workStartDate,
        })) as { id: string };
        await requestCase(organizationId, created.id);
        await refresh();
      }
    );
  };

  const uploadDocumentForCase = async (caseId: string, file: File) => {
    if (!organizationId) return;
    await runAction(
      `upload:${caseId}`,
      "PDF uploaded. Extraction is running in the background.",
      async () => {
        await uploadDocument(organizationId, caseId, file);
        setProcessingCaseIds(current =>
          current.includes(caseId) ? current : [...current, caseId]
        );
        await refresh();
      }
    );
  };

  const runAction = async (
    key: string,
    success: string,
    action: () => Promise<void>
  ) => {
    setPendingAction(key);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#17201b]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#d7ddd5] pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173d32] text-[#eff6df]">
              <ShieldCheck size={22} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-[#5a675f]">
                COI
              </p>
              <h1 className="text-lg font-semibold tracking-tight">
                Compliance Agent
              </h1>
            </div>
          </div>
          <span className="flex items-center gap-3">
            <span className="rounded-full border border-[#c8d1c6] px-3 py-1 text-xs font-medium text-[#5a675f]">
              Operations dashboard
            </span>
            <button
              onClick={() => void signOut()}
              className="text-xs font-medium text-[#5a675f] underline"
            >
              Sign out
            </button>
          </span>
        </header>

        <section className="flex-1 py-12">
          {(notice || error) && (
            <div
              className={`mb-4 border p-3 text-sm ${error ? "border-[#e2b9b9] bg-[#fff6f6] text-[#a33e32]" : "border-[#c8d8c0] bg-[#f4fbef] text-[#365247]"}`}
            >
              {error ?? notice}
            </div>
          )}
          <AddVendorForm
            organizationId={organizationId}
            onCreated={() => void refresh()}
          />
          <Dashboard
            vendors={vendors}
            loading={loading}
            onRefresh={() => void refresh()}
            onReview={(caseId, decision) => void review(caseId, decision)}
            onCreateCase={(vendorId, workStartDate) =>
              void createCaseForVendor(vendorId, workStartDate)
            }
            onUploadDocument={(caseId, file) =>
              void uploadDocumentForCase(caseId, file)
            }
            pendingAction={pendingAction}
            processingCaseIds={processingCaseIds}
          />
        </section>

        <footer className="border-t border-[#d7ddd5] pt-5 text-sm text-[#718078]">
          Case state is the source of truth.
        </footer>
      </div>
    </main>
  );
}

export default App;
