import { useState } from "react";
import { createVendor } from "../services/api/vendors";
import { assignRequirements } from "../services/api/vendors";

type Props = { organizationId: string; onCreated: () => void };

export function AddVendorForm({ organizationId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [glOccurrence, setGlOccurrence] = useState("1000000");
  const [glAggregate, setGlAggregate] = useState("2000000");
  const [autoMinimum, setAutoMinimum] = useState("1000000");
  const [workersComp, setWorkersComp] = useState(true);
  const [additionalInsured, setAdditionalInsured] = useState(true);
  const [waiver, setWaiver] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const vendor = (await createVendor(organizationId, {
        name,
        contacts: contactEmail
          ? [{ name: "Primary contact", email: contactEmail, is_primary: true }]
          : [],
      })) as { id: string };

      await assignRequirements(organizationId, vendor.id, {
        requirements: {
          general_liability: {
            required: true,
            occurrence_min: Number(glOccurrence),
            aggregate_min: Number(glAggregate),
          },
          workers_comp: { required: workersComp },
          auto_liability: { required: true, minimum: Number(autoMinimum) },
          additional_insured: additionalInsured,
          waiver_of_subrogation: waiver,
        },
      });

      setName("");
      setContactEmail("");
      setOpen(false);
      onCreated();
    } catch {
      setError("Could not create the vendor. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 rounded bg-[#173d32] px-4 py-2 text-sm font-semibold text-white"
      >
        Add vendor
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 space-y-3 border border-[#d7ddd5] bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#173d32]">Add vendor</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[#718078]"
        >
          Cancel
        </button>
      </div>
      <label className="block text-sm font-medium text-[#365247]">
        Vendor name
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          className="mt-1 w-full rounded border border-[#ccd6cb] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-[#365247]">
        Primary contact email
        <input
          type="email"
          value={contactEmail}
          onChange={e => setContactEmail(e.target.value)}
          className="mt-1 w-full rounded border border-[#ccd6cb] px-3 py-2 text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-[#365247]">
          GL each occurrence min
          <input
            value={glOccurrence}
            onChange={e => setGlOccurrence(e.target.value)}
            className="mt-1 w-full rounded border border-[#ccd6cb] px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-[#365247]">
          GL aggregate min
          <input
            value={glAggregate}
            onChange={e => setGlAggregate(e.target.value)}
            className="mt-1 w-full rounded border border-[#ccd6cb] px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-[#365247]">
          Auto liability minimum
          <input
            value={autoMinimum}
            onChange={e => setAutoMinimum(e.target.value)}
            className="mt-1 w-full rounded border border-[#ccd6cb] px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-[#365247]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={workersComp}
            onChange={e => setWorkersComp(e.target.checked)}
          />{" "}
          Workers comp required
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={additionalInsured}
            onChange={e => setAdditionalInsured(e.target.checked)}
          />{" "}
          Additional insured required
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={waiver}
            onChange={e => setWaiver(e.target.checked)}
          />{" "}
          Waiver of subrogation required
        </label>
      </div>
      {error && <p className="text-sm text-[#a33e32]">{error}</p>}
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="rounded bg-[#173d32] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Create vendor"}
      </button>
    </form>
  );
}
