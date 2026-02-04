"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { loadOrgContext } from "@/lib/orgContext";
import { supabase } from "@/lib/supabase/client";

type DepartmentRow = {
  department_id: number;
  organization_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  scope_risk_category_ids: number[];
  scope_risk_subcategory_ids: number[];
  scope_country_codes: string[];
  scope_supplier_org_ids: number[];
  scope_worksite_ids: number[];
  organization_department_members?: Array<{
    user_id: string;
    user_profiles?: {
      display_name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
  }>;
};

type OptionItem = {
  id: string;
  label: string;
};

type OrgUserItem = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type FormState = {
  department_id: number | null;
  name: string;
  description: string;
  priority: number;
  is_active: boolean;
  member_ids: string[];
  risk_category_ids: string[];
  risk_subcategory_ids: string[];
  country_codes: string[];
  supplier_org_ids: string[];
  worksite_ids: string[];
};

const initialForm: FormState = {
  department_id: null,
  name: "",
  description: "",
  priority: 100,
  is_active: true,
  member_ids: [],
  risk_category_ids: [],
  risk_subcategory_ids: [],
  country_codes: [],
  supplier_org_ids: [],
  worksite_ids: [],
};

function MultiSelectChips({
  label,
  options,
  selected,
  onToggle,
  emptyLabel,
}: {
  label: string;
  options: OptionItem[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyLabel?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      {options.length ? (
        <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
          {options.map((option) => {
            const active = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                className={`rounded-full border px-2 py-1 text-[11px] transition ${
                  active
                    ? "border-[var(--wb-cobalt)] bg-[var(--wb-cobalt)]/10 text-[var(--wb-cobalt)]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">{emptyLabel ?? "No options available."}</p>
      )}
    </div>
  );
}

function toIntArray(values: string[]) {
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

function normalizeDepartmentRows(rows: unknown[]): DepartmentRow[] {
  return rows.map((row) => {
    const record = row as DepartmentRow & {
      organization_department_members?: Array<{
        user_id: string;
        user_profiles?:
          | {
              display_name: string | null;
              first_name: string | null;
              last_name: string | null;
              email: string | null;
            }
          | {
              display_name: string | null;
              first_name: string | null;
              last_name: string | null;
              email: string | null;
            }[]
          | null;
      }>;
    };
    return {
      ...record,
      organization_department_members: (record.organization_department_members ?? []).map((member) => {
        const relation = Array.isArray(member.user_profiles)
          ? member.user_profiles[0] ?? null
          : member.user_profiles ?? null;
        return {
          ...member,
          user_profiles: relation,
        };
      }),
    };
  });
}

export default function OrganisationDepartmentsPage() {
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [users, setUsers] = useState<OrgUserItem[]>([]);
  const [countries, setCountries] = useState<OptionItem[]>([]);
  const [riskCategories, setRiskCategories] = useState<OptionItem[]>([]);
  const [riskSubCategories, setRiskSubCategories] = useState<OptionItem[]>([]);
  const [suppliers, setSuppliers] = useState<OptionItem[]>([]);
  const [worksites, setWorksites] = useState<OptionItem[]>([]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const usersOptions = useMemo<OptionItem[]>(() => {
    return users.map((user) => {
      const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || user.user_id;
      return { id: user.user_id, label: name };
    });
  }, [users]);

  const selectedScopeSummary = (department: DepartmentRow) => {
    const parts: string[] = [];
    if (department.scope_country_codes?.length) parts.push(`${department.scope_country_codes.length} countries`);
    if (department.scope_risk_category_ids?.length) parts.push(`${department.scope_risk_category_ids.length} categories`);
    if (department.scope_risk_subcategory_ids?.length) parts.push(`${department.scope_risk_subcategory_ids.length} sub-categories`);
    if (department.scope_worksite_ids?.length) parts.push(`${department.scope_worksite_ids.length} worksites`);
    if (department.scope_supplier_org_ids?.length) parts.push(`${department.scope_supplier_org_ids.length} suppliers`);
    return parts.length ? parts.join(" • ") : "Global scope";
  };

  const loadAll = async (orgId: number) => {
    const [
      { data: departmentRows, error: departmentError },
      { data: orgUsers, error: usersError },
      { data: countryRows },
      { data: categoryRows },
      { data: subCategoryRows },
      { data: worksiteRows },
      { data: relationshipRows },
    ] = await Promise.all([
      supabase
        .from("organization_departments")
        .select(
          "department_id,organization_id,name,description,is_active,priority,scope_risk_category_ids,scope_risk_subcategory_ids,scope_country_codes,scope_supplier_org_ids,scope_worksite_ids,organization_department_members(user_id,user_profiles(display_name,first_name,last_name,email))"
        )
        .eq("organization_id", orgId)
        .order("priority", { ascending: true }),
      supabase
        .from("organisation_users_with_roles")
        .select("user_id,first_name,last_name,email")
        .eq("organization_id", orgId),
      supabase.from("countries").select("country_name").order("country_name"),
      supabase.from("report_categories").select("category_id,name").order("name"),
      supabase.from("report_sub_categories").select("sub_category_id,name").order("name"),
      supabase.from("worksites").select("worksite_id,name").eq("organization_id", orgId).order("name"),
      supabase
        .from("organization_relationships")
        .select("parent_org_id,child_org_id")
        .or(`parent_org_id.eq.${orgId},child_org_id.eq.${orgId}`),
    ]);

    if (departmentError) throw departmentError;
    if (usersError) throw usersError;

    const relatedOrgIds = new Set<number>();
    (relationshipRows ?? []).forEach((row) => {
      const parent = Number(row.parent_org_id);
      const child = Number(row.child_org_id);
      if (Number.isFinite(parent) && parent !== orgId) relatedOrgIds.add(parent);
      if (Number.isFinite(child) && child !== orgId) relatedOrgIds.add(child);
    });

    let supplierOptions: OptionItem[] = [];
    if (relatedOrgIds.size) {
      const { data: supplierRows } = await supabase
        .from("organisations")
        .select("organization_id,name")
        .in("organization_id", Array.from(relatedOrgIds))
        .order("name");
      supplierOptions = (supplierRows ?? []).map((org) => ({
        id: String(org.organization_id),
        label: org.name,
      }));
    }

    setRows(normalizeDepartmentRows((departmentRows ?? []) as unknown[]));
    setUsers((orgUsers ?? []) as OrgUserItem[]);
    setCountries((countryRows ?? []).map((country) => ({ id: country.country_name, label: country.country_name })));
    setRiskCategories((categoryRows ?? []).map((item) => ({ id: String(item.category_id), label: item.name })));
    setRiskSubCategories(
      (subCategoryRows ?? []).map((item) => ({ id: String(item.sub_category_id), label: item.name }))
    );
    setWorksites((worksiteRows ?? []).map((item) => ({ id: String(item.worksite_id), label: item.name })));
    setSuppliers(supplierOptions);
  };

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const context = await loadOrgContext();
        if (!isMounted) return;
        setOrganizationId(context.organizationId);
        await loadAll(context.organizationId);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load departments.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleInForm = (key: keyof Pick<FormState, "member_ids" | "risk_category_ids" | "risk_subcategory_ids" | "country_codes" | "supplier_org_ids" | "worksite_ids">, id: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((value) => value !== id)
        : [...prev[key], id],
    }));
  };

  const openCreate = () => {
    setForm(initialForm);
    setOpen(true);
  };

  const openEdit = (department: DepartmentRow) => {
    const memberIds = (department.organization_department_members ?? []).map((member) => member.user_id);
    setForm({
      department_id: department.department_id,
      name: department.name,
      description: department.description ?? "",
      priority: department.priority ?? 100,
      is_active: Boolean(department.is_active),
      member_ids: memberIds,
      risk_category_ids: (department.scope_risk_category_ids ?? []).map(String),
      risk_subcategory_ids: (department.scope_risk_subcategory_ids ?? []).map(String),
      country_codes: (department.scope_country_codes ?? []).map(String),
      supplier_org_ids: (department.scope_supplier_org_ids ?? []).map(String),
      worksite_ids: (department.scope_worksite_ids ?? []).map(String),
    });
    setOpen(true);
  };

  const saveDepartment = async () => {
    if (!organizationId) return;
    if (!form.name.trim()) {
      setError("Department name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        organization_id: organizationId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        priority: form.priority,
        scope_risk_category_ids: toIntArray(form.risk_category_ids),
        scope_risk_subcategory_ids: toIntArray(form.risk_subcategory_ids),
        scope_country_codes: form.country_codes,
        scope_supplier_org_ids: toIntArray(form.supplier_org_ids),
        scope_worksite_ids: toIntArray(form.worksite_ids),
      };

      let departmentId = form.department_id;

      if (departmentId) {
        const { error: updateError } = await supabase
          .from("organization_departments")
          .update(payload)
          .eq("department_id", departmentId)
          .eq("organization_id", organizationId);
        if (updateError) throw updateError;

        const { error: deleteMembersError } = await supabase
          .from("organization_department_members")
          .delete()
          .eq("department_id", departmentId);
        if (deleteMembersError) throw deleteMembersError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("organization_departments")
          .insert(payload)
          .select("department_id")
          .single();
        if (insertError || !inserted) throw insertError ?? new Error("Unable to create department.");
        departmentId = inserted.department_id;
      }

      if (departmentId && form.member_ids.length) {
        const memberRows = form.member_ids.map((memberId) => ({
          department_id: departmentId,
          user_id: memberId,
        }));
        const { error: memberError } = await supabase
          .from("organization_department_members")
          .insert(memberRows);
        if (memberError) throw memberError;
      }

      await loadAll(organizationId);
      setOpen(false);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save department.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (departmentId: number) => {
    if (!organizationId) return;
    if (!window.confirm("Delete this department?")) return;

    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("organization_departments")
        .delete()
        .eq("department_id", departmentId)
        .eq("organization_id", organizationId);
      if (deleteError) throw deleteError;
      await loadAll(organizationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete department.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Departments"
        description="Manage report-routing teams, members, and department scope."
        actions={
          <button
            className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
            onClick={openCreate}
          >
            New department
          </button>
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Loading departments...</p>
        ) : rows.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((department) => (
                  <tr key={department.department_id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{department.name}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {department.description || "No description"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {(department.organization_department_members ?? []).length}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {selectedScopeSummary(department)}
                    </td>
                    <td className="px-4 py-3">{department.priority}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${
                          department.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {department.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                          onClick={() => openEdit(department)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-rose-200 px-2 py-1 text-[11px] text-rose-600"
                          onClick={() => deleteDepartment(department.department_id)}
                          disabled={saving}
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
        ) : (
          <EmptyState
            title="No departments configured"
            description="Create departments, assign admins, and set scope for automated routing."
            actionLabel="Add department"
          />
        )}
      </SectionCard>

      <Modal
        open={open}
        title={form.department_id ? "Edit department" : "Create department"}
        description="Configure member assignment and scope matching for triage."
        onClose={() => setOpen(false)}
        size="2xl"
        bodyClassName="max-h-[78vh] overflow-y-auto"
        actions={
          <>
            <button
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
              onClick={saveDepartment}
              disabled={saving}
            >
              {form.department_id ? "Save changes" : "Create department"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Name</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Priority (lower = first)</label>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: Number(event.target.value) || 100,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Description</label>
            <textarea
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, is_active: event.target.checked }))
              }
            />
            Active department
          </label>

          <MultiSelectChips
            label="Assigned admins"
            options={usersOptions}
            selected={form.member_ids}
            onToggle={(id) => toggleInForm("member_ids", id)}
            emptyLabel="No organisation users found."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <MultiSelectChips
              label="Risk categories"
              options={riskCategories}
              selected={form.risk_category_ids}
              onToggle={(id) => toggleInForm("risk_category_ids", id)}
            />
            <MultiSelectChips
              label="Risk sub-categories"
              options={riskSubCategories}
              selected={form.risk_subcategory_ids}
              onToggle={(id) => toggleInForm("risk_subcategory_ids", id)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MultiSelectChips
              label="Countries"
              options={countries}
              selected={form.country_codes}
              onToggle={(id) => toggleInForm("country_codes", id)}
            />
            <MultiSelectChips
              label="Suppliers / related orgs"
              options={suppliers}
              selected={form.supplier_org_ids}
              onToggle={(id) => toggleInForm("supplier_org_ids", id)}
              emptyLabel="No related organisations found."
            />
          </div>

          <MultiSelectChips
            label="Worksites"
            options={worksites}
            selected={form.worksite_ids}
            onToggle={(id) => toggleInForm("worksite_ids", id)}
            emptyLabel="No worksites found."
          />
        </div>
      </Modal>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </>
  );
}
