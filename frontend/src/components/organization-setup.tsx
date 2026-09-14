import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { createOrganization } from "../services/api/organizations";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OrganizationSetup({
  onCreated,
}: {
  onCreated: (organizationId: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const organization = await createOrganization({
        name,
        slug: slugify(name),
      });
      onCreated(organization.id);
    } catch {
      setError("Could not create the organization. Try a different name.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f4] text-[#17201b]">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-[#d7ddd5] bg-white p-8 shadow-[0_8px_24px_rgba(32,57,42,0.05)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173d32] text-[#eff6df]">
            <ShieldCheck size={22} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[#5a675f]">
              COI
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              Set up your organization
            </h1>
          </div>
        </div>
        <label className="mb-5 block text-sm font-medium text-[#365247]">
          Organization name
          <input
            required
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Acme Property Management"
            className="mt-1 w-full rounded border border-[#ccd6cb] px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="mb-4 text-sm text-[#a33e32]">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full rounded bg-[#173d32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create organization"}
        </button>
      </form>
    </main>
  );
}
