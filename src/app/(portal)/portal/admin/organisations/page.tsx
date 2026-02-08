"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import Modal from "@/components/portal/Modal";
import { adminInvoke } from "@/lib/adminApi";

type OrgRow = {
  organization_id: number;
  name: string;
  organization_type: string | null;
  country: string | null;
  city: string | null;
  website: string | null;
  is_claimed: boolean;
  approval_status?: "pending" | "approved" | "blocked" | "removed" | null;
  account_status?: "active" | "inactive" | null;
  blocked_at?: string | null;
  approved_at?: string | null;
  removed_at?: string | null;
  created_at: string | null;
  user_count: number;
  report_count: number;
};

type OrgDetails = {
  organisation: {
    organization_id: number;
    name: string;
    organization_type: string | null;
    legal_type: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    website: string | null;
    company_code: string | null;
    employees_number: number | null;
    contact_info: string | null;
    is_claimed: boolean;
    approval_status: "pending" | "approved" | "blocked" | "removed";
    account_status: "active" | "inactive";
    approved_at: string | null;
    blocked_at: string | null;
    removed_at: string | null;
    removal_reason: string | null;
    created_at: string | null;
  };
  users: Array<{
    user_id: string;
    display_name: string;
    email: string;
    role: string;
    is_active: boolean;
  }>;
  report_count: number;
};

type OrgTypeRow = {
  type_key: string;
  label: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export default function AdminOrganisationsPage() {
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [orgTypes, setOrgTypes] = useState<OrgTypeRow[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState<OrgDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [newTypeKey, setNewTypeKey] = useState("");
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeDescription, setNewTypeDescription] = useState("");

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      adminInvoke<{ organisations: OrgRow[] }>("listOrganisations"),
      adminInvoke<{ types: OrgTypeRow[] }>("listOrganizationTypes"),
    ])
      .then(([orgData, typeData]) => {
        if (!isMounted) return;
        setRows(orgData.organisations);
        setOrgTypes(typeData.types);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load organisations.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectTypeOptions = useMemo(() => {
    const fromDb = orgTypes.map((item) => item.type_key);
    const fromRows = rows
      .map((row) => row.organization_type || "")
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...fromDb, ...fromRows]));
  }, [orgTypes, rows]);

  const labelByTypeKey = useMemo(
    () =>
      Object.fromEntries(orgTypes.map((item) => [item.type_key, item.label])),
    [orgTypes]
  );

  const filteredRows = useMemo(() => {
    if (!typeFilter) return rows;
    return rows.filter((row) => row.organization_type === typeFilter);
  }, [rows, typeFilter]);

  const updateOrganisation = async (id: number, updates: Record<string, unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateOrganisation", { organization_id: id, ...updates });
      setRows((prev) =>
        prev.map((row) => (row.organization_id === id ? { ...row, ...updates } : row))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update organisation.");
    } finally {
      setIsSaving(false);
    }
  };

  const refreshRows = async () => {
    const data = await adminInvoke<{ organisations: OrgRow[] }>("listOrganisations");
    setRows(data.organisations);
  };

  const refreshOrgTypes = async () => {
    const data = await adminInvoke<{ types: OrgTypeRow[] }>("listOrganizationTypes");
    setOrgTypes(data.types);
  };

  const approveOrganisation = async (id: number) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("approveOrganisation", { organization_id: id });
      await refreshRows();
      if (details?.organisation.organization_id === id) {
        const data = await adminInvoke<OrgDetails>("getOrganisationDetails", { organization_id: id });
        setDetails(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve organisation.");
    } finally {
      setIsSaving(false);
    }
  };

  const blockOrganisation = async (id: number) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("blockOrganisation", { organization_id: id });
      await refreshRows();
      if (details?.organisation.organization_id === id) {
        const data = await adminInvoke<OrgDetails>("getOrganisationDetails", { organization_id: id });
        setDetails(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to block organisation.");
    } finally {
      setIsSaving(false);
    }
  };

  const unblockOrganisation = async (id: number) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("unblockOrganisation", { organization_id: id });
      await refreshRows();
      if (details?.organisation.organization_id === id) {
        const data = await adminInvoke<OrgDetails>("getOrganisationDetails", { organization_id: id });
        setDetails(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unblock organisation.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeOrganisation = async (id: number) => {
    const reason = window.prompt("Optional removal reason:");
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("removeOrganisation", { organization_id: id, reason: reason || null });
      await refreshRows();
      if (details?.organisation.organization_id === id) {
        const data = await adminInvoke<OrgDetails>("getOrganisationDetails", { organization_id: id });
        setDetails(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove organisation.");
    } finally {
      setIsSaving(false);
    }
  };

  const openOrganisation = async (id: number) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const data = await adminInvoke<OrgDetails>("getOrganisationDetails", { organization_id: id });
      setDetails(data);
      setDetailsOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load organisation details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const createOrgType = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("createOrganizationType", {
        type_key: newTypeKey,
        label: newTypeLabel,
        description: newTypeDescription,
      });
      setNewTypeKey("");
      setNewTypeLabel("");
      setNewTypeDescription("");
      await refreshOrgTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create organization type.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateOrgType = async (
    typeKey: string,
    updates: Partial<Pick<OrgTypeRow, "label" | "description" | "sort_order" | "is_active">>
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateOrganizationType", { type_key: typeKey, ...updates });
      await refreshOrgTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update organization type.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeOrgType = async (typeKey: string) => {
    if (!window.confirm(`Remove organization type "${typeKey}"?`)) return;
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("removeOrganizationType", { type_key: typeKey });
      await refreshOrgTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove organization type.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard
      title="Organisations"
      description={`${filteredRows.length} results`}
      actions={
        <div className="flex items-center gap-2">
          <select className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">
            <option>Sort</option>
            <option>Name</option>
          </select>
          <select
            className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Filter</option>
            {selectTypeOptions.map((type) => (
              <option key={type} value={type}>
                {labelByTypeKey[type] ?? type}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
            onClick={() => setTypesModalOpen(true)}
          >
            Manage Types
          </button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Creation Date</th>
              <th className="px-4 py-3">Number of Reports</th>
              <th className="px-4 py-3">Website</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Options</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={row.organization_id} className="border-t border-slate-100">
                {(() => {
                  const currentApproval =
                    row.approval_status ?? (row.is_claimed ? "approved" : "pending");
                  const currentAccount =
                    row.account_status ?? (currentApproval === "approved" ? "active" : "inactive");
                  return (
                    <>
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{row.name}</td>
                <td className="px-4 py-3">{row.user_count}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                    value={row.organization_type || ""}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateOrganisation(row.organization_id, {
                        organization_type: event.target.value || null,
                      })
                    }
                  >
                    <option value="">-</option>
                    {selectTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {labelByTypeKey[type] ?? type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3">{row.report_count}</td>
                <td className="px-4 py-3 text-[var(--wb-cobalt)]">
                  {row.website || "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-[120px] flex-col gap-1">
                    <span
                      className={`inline-flex w-fit whitespace-nowrap rounded-full border px-2 py-1 text-[11px] leading-4 ${
                        currentApproval === "approved"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : currentApproval === "blocked"
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : currentApproval === "removed"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {currentApproval}
                    </span>
                    <span
                      className={`inline-flex w-fit whitespace-nowrap rounded-full border px-2 py-1 text-[11px] leading-4 ${
                        currentAccount === "active"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {currentAccount}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                      disabled={isSaving || loadingDetails}
                      onClick={() => openOrganisation(row.organization_id)}
                    >
                      View
                    </button>
                    {currentApproval === "pending" ? (
                      <button
                        type="button"
                        className="rounded-full bg-emerald-600 px-2 py-1 text-[11px] text-white"
                        disabled={isSaving}
                        onClick={() => approveOrganisation(row.organization_id)}
                      >
                        Approve
                      </button>
                    ) : currentApproval === "approved" ? (
                      <button
                        type="button"
                        className="rounded-full border border-indigo-200 px-2 py-1 text-[11px] text-indigo-700"
                        disabled={isSaving}
                        onClick={() => blockOrganisation(row.organization_id)}
                      >
                        Block
                      </button>
                    ) : currentApproval === "blocked" ? (
                      <button
                        type="button"
                        className="rounded-full bg-emerald-600 px-2 py-1 text-[11px] text-white"
                        disabled={isSaving}
                        onClick={() => unblockOrganisation(row.organization_id)}
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-full bg-emerald-600 px-2 py-1 text-[11px] text-white"
                        disabled={isSaving}
                        onClick={() => unblockOrganisation(row.organization_id)}
                      >
                        Unblock
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-full border border-rose-200 px-2 py-1 text-[11px] text-rose-700"
                      disabled={isSaving}
                      onClick={() => removeOrganisation(row.organization_id)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
                    </>
                  );
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={detailsOpen}
        title="Organisation Details"
        description="Review and manage organisation approval."
        onClose={() => setDetailsOpen(false)}
      >
        {details ? (
          <div className="space-y-4 text-sm text-slate-600">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Name</p>
                <p className="font-semibold text-slate-900">{details.organisation.name}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Approval Status</p>
                <p className="font-semibold text-slate-900">
                  {details.organisation.approval_status} / {details.organisation.account_status}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Country / City</p>
                <p className="font-semibold text-slate-900">
                  {[details.organisation.country, details.organisation.city].filter(Boolean).join(", ") ||
                    "-"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400">Reports</p>
                <p className="font-semibold text-slate-900">{details.report_count}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Users</p>
              <div className="mt-2 space-y-2">
                {details.users.length ? (
                  details.users.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{user.display_name}</p>
                        <p className="text-slate-500">{user.email}</p>
                      </div>
                      <p className="text-slate-500">{user.role}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No users linked.</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {details.organisation.approval_status === "pending" ? (
                <button
                  type="button"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                  disabled={isSaving}
                  onClick={() => approveOrganisation(details.organisation.organization_id)}
                >
                  Approve
                </button>
              ) : null}
              {details.organisation.approval_status === "approved" ? (
                <button
                  type="button"
                  className="rounded-full border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-700"
                  disabled={isSaving}
                  onClick={() => blockOrganisation(details.organisation.organization_id)}
                >
                  Block
                </button>
              ) : null}
              {details.organisation.approval_status === "blocked" ? (
                <button
                  type="button"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                  disabled={isSaving}
                  onClick={() => unblockOrganisation(details.organisation.organization_id)}
                >
                  Unblock
                </button>
              ) : null}
              {details.organisation.approval_status === "removed" ? (
                <button
                  type="button"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                  disabled={isSaving}
                  onClick={() => unblockOrganisation(details.organisation.organization_id)}
                >
                  Unblock
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700"
                disabled={isSaving}
                onClick={() => removeOrganisation(details.organisation.organization_id)}
              >
                Remove
              </button>
            </div>
          </div>
        ) : loadingDetails ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <p className="text-sm text-slate-500">Select an organisation to view details.</p>
        )}
      </Modal>
      <Modal
        open={typesModalOpen}
        title="Organisation Types"
        description="Manage selectable organization types used across forms."
        onClose={() => setTypesModalOpen(false)}
        size="3xl"
        bodyClassName="max-h-[72vh] overflow-y-auto pr-1"
      >
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Type key (e.g. service_provider)"
              value={newTypeKey}
              onChange={(event) => setNewTypeKey(event.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Label (e.g. Service Provider)"
              value={newTypeLabel}
              onChange={(event) => setNewTypeLabel(event.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Description (optional)"
              value={newTypeDescription}
              onChange={(event) => setNewTypeDescription(event.target.value)}
            />
            <button
              type="button"
              className="rounded-xl bg-[var(--wb-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={isSaving || !newTypeKey.trim() || !newTypeLabel.trim()}
              onClick={createOrgType}
            >
              Add
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.15em] text-slate-400">
                <tr>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgTypes.map((item) => (
                  <tr key={item.type_key} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-[11px]">{item.type_key}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        value={item.label}
                        onBlur={(event) => {
                          const next = event.target.value.trim();
                          if (next && next !== item.label) {
                            updateOrgType(item.type_key, { label: next });
                          }
                        }}
                        onChange={(event) =>
                          setOrgTypes((prev) =>
                            prev.map((row) =>
                              row.type_key === item.type_key
                                ? { ...row, label: event.target.value }
                                : row
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        value={item.description ?? ""}
                        onChange={(event) =>
                          setOrgTypes((prev) =>
                            prev.map((row) =>
                              row.type_key === item.type_key
                                ? { ...row, description: event.target.value }
                                : row
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        value={item.sort_order}
                        onBlur={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next) && next !== item.sort_order) {
                            updateOrgType(item.type_key, { sort_order: next });
                          }
                        }}
                        onChange={(event) =>
                          setOrgTypes((prev) =>
                            prev.map((row) =>
                              row.type_key === item.type_key
                                ? { ...row, sort_order: Number(event.target.value) || 0 }
                                : row
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.is_active}
                          onChange={(event) =>
                            updateOrgType(item.type_key, { is_active: event.target.checked })
                          }
                        />
                        <span>{item.is_active ? "Yes" : "No"}</span>
                      </label>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                          disabled={isSaving || !item.label.trim()}
                          onClick={() =>
                            updateOrgType(item.type_key, {
                              label: item.label.trim(),
                              description: item.description?.trim() || null,
                              sort_order: item.sort_order,
                              is_active: item.is_active,
                            })
                          }
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-60"
                          disabled={isSaving}
                          onClick={() => removeOrgType(item.type_key)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
