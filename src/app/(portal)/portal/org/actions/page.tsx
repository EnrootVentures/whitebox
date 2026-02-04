"use client";

import { useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/portal/EmptyState";
import Modal from "@/components/portal/Modal";
import SectionCard from "@/components/portal/SectionCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

type ActionRow = {
  action_id: number;
  report_id: number;
  action_description: string;
  status: string | null;
  status_id?: number | null;
  status_code?: string | null;
  status_label?: string | null;
  report_action_statuses?: { code: string; label: string } | null;
  due_date: string | null;
  created_at: string | null;
};

type ReportOption = {
  report_id: number;
  report_code: string;
  title: string;
};

function normalizeActionStatusRelation(
  relation: { code: string; label: string } | { code: string; label: string }[] | null | undefined
) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

const statusOptions = [
  "suggested",
  "action_formulation",
  "action_implemented",
  "failed",
  "extended_due",
  "successful",
  "feedback_requested",
  "resolved",
];

export default function ActionsPage() {
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusLookup, setStatusLookup] = useState<
    Record<string, { id: number; label: string }>
  >({});
  const [form, setForm] = useState({
    reportId: "",
    description: "",
    dueDate: "",
    status: "action_formulation",
  });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const context = await loadOrgContext();
        const [{ data: actionRows }, { data: reportRows }, { data: statusRows }] = await Promise.all([
          supabase
            .from("report_actions")
            .select(
              "action_id,report_id,action_description,status,status_id,due_date,created_at,report_action_statuses(code,label)"
            )
            .eq("responsible_org_id", context.organizationId)
            .order("created_at", { ascending: false }),
          supabase
            .from("reports")
            .select("report_id,report_code,title")
            .eq("reported_org_id", context.organizationId)
            .order("created_at", { ascending: false }),
          supabase.from("report_action_statuses").select("status_id,code,label").order("display_order"),
        ]);

        if (!isMounted) return;
        const map: Record<string, { id: number; label: string }> = {};
        (statusRows ?? []).forEach((row) => {
          map[row.code] = { id: row.status_id, label: row.label };
        });
        setStatusLookup(map);
        const normalizedRows =
          actionRows?.map((row) => {
            const statusRelation = normalizeActionStatusRelation(row.report_action_statuses);
            return {
              ...row,
              report_action_statuses: statusRelation,
              status_code: statusRelation?.code ?? row.status ?? null,
              status_label: statusRelation?.label ?? row.status ?? null,
            };
          }) ?? [];
        setRows(normalizedRows);
        setReports(reportRows ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load actions.");
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    if (!filter) return rows;
    return rows.filter((row) => (row.status_code ?? row.status) === filter);
  }, [rows, filter]);

  const updateAction = async (actionId: number, updates: Partial<ActionRow>) => {
    setSaving(true);
    setError(null);
    try {
      let payload = { ...updates } as Record<string, unknown>;
      if (updates.status_code) {
        const statusEntry = statusLookup[updates.status_code];
        payload = {
          ...payload,
          status_id: statusEntry?.id ?? null,
          status: updates.status_code,
        };
      }
      const { error: updateError } = await supabase
        .from("report_actions")
        .update(payload)
        .eq("action_id", actionId);
      if (updateError) throw new Error(updateError.message);
      setRows((prev) =>
        prev.map((row) =>
          row.action_id === actionId
            ? {
                ...row,
                ...updates,
                status_id: (payload.status_id as number) ?? row.status_id ?? null,
                status_code:
                  (updates.status_code as string) ?? row.status_code ?? row.status ?? null,
                status_label:
                  updates.status_code && statusLookup[updates.status_code]
                    ? statusLookup[updates.status_code].label
                    : row.status_label ?? row.status ?? null,
              }
            : row
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update action.");
    } finally {
      setSaving(false);
    }
  };

  const createAction = async () => {
    if (!form.reportId || !form.description.trim()) {
      setError("Select a report and add an action description.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const context = await loadOrgContext();
      const statusEntry = statusLookup[form.status];
      const { data: insertRow, error: insertError } = await supabase
        .from("report_actions")
        .insert({
          report_id: Number(form.reportId),
          responsible_org_id: context.organizationId,
          owner_org_id: context.organizationId,
          action_description: form.description.trim(),
          due_date: form.dueDate || null,
          status: form.status,
          status_id: statusEntry?.id ?? null,
          is_public: true,
        })
        .select(
          "action_id,report_id,action_description,status,status_id,due_date,created_at,report_action_statuses(code,label)"
        )
        .single();

      if (insertError || !insertRow) {
        throw new Error(insertError?.message ?? "Unable to create action.");
      }

      const mapped = insertRow
        ? (() => {
            const statusRelation = normalizeActionStatusRelation(insertRow.report_action_statuses);
            return {
              ...insertRow,
              report_action_statuses: statusRelation,
              status_code: statusRelation?.code ?? insertRow.status ?? null,
              status_label: statusRelation?.label ?? insertRow.status ?? null,
            };
          })()
        : null;
      setRows((prev) => (mapped ? [mapped, ...prev] : prev));
      setForm({ reportId: "", description: "", dueDate: "", status: "action_formulation" });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create action.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Actions"
        description="Track remediation actions across organisations and due dates."
        actions={
          <div className="flex items-center gap-2">
            <select
              className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">All actions</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              className="rounded-full bg-[var(--wb-cobalt)] px-4 py-2 text-xs font-semibold text-white"
              onClick={() => setOpen(true)}
            >
              Create action
            </button>
          </div>
        }
      >
        {filteredRows.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.action_id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{row.report_id}</td>
                    <td className="px-4 py-3">{row.action_description}</td>
                    <td className="px-4 py-3">{row.due_date || "-"}</td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded-full border border-slate-200 px-2 py-1 text-[11px]"
                        value={row.status_code ?? row.status ?? ""}
                        onChange={(event) =>
                          updateAction(row.action_id, { status_code: event.target.value || null })
                        }
                        disabled={saving}
                      >
                        <option value="">-</option>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No actions created"
            description="Create structured action plans to respond to grievances and monitor stakeholder feedback."
            actionLabel="Create action"
          />
        )}
      </SectionCard>

      <Modal
        open={open}
        title="Create action"
        description="Assign a remediation task linked to a report."
        onClose={() => setOpen(false)}
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
              onClick={createAction}
              disabled={saving}
            >
              Save action
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Report</label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.reportId}
              onChange={(event) => setForm((prev) => ({ ...prev, reportId: event.target.value }))}
            >
              <option value="">Select report</option>
              {reports.map((report) => (
                <option key={report.report_id} value={report.report_id}>
                  {report.report_code} - {report.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Action description</label>
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Due date</label>
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Status</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
