"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import StatCard from "@/components/portal/StatCard";
import { supabase } from "@/lib/supabase/client";
import { loadOrgContext } from "@/lib/orgContext";

type ReportRow = {
  report_id: number;
  report_code: string;
  title: string;
  status: string | null;
  status_id?: number | null;
  status_code?: string | null;
  status_label?: string | null;
  report_statuses?: { code: string; label: string } | null;
  is_spam: boolean | null;
  created_at: string | null;
};

type ActionRow = {
  action_id: number;
  report_id: number;
  action_description: string;
  status: string | null;
  due_date: string | null;
  created_at: string | null;
};

type CommentRow = {
  comment_id: number;
  report_id: number;
  comment_text: string;
  created_at: string | null;
};

const ActivityItem = ({ title, meta }: { title: string; meta: string }) => (
  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">{meta}</p>
    </div>
    <span className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500">
      View
    </span>
  </div>
);

export default function PortalDashboardPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const context = await loadOrgContext();
        const { data: reportRows, error: reportError } = await supabase
          .from("reports")
          .select("report_id,report_code,title,status,status_id,is_spam,created_at,report_statuses(code,label)")
          .eq("reported_org_id", context.organizationId)
          .order("created_at", { ascending: false });

        if (reportError) throw new Error(reportError.message);
        const reportIds = (reportRows ?? []).map((row) => row.report_id);

        const [{ data: actionRows }, { data: commentRows }] = await Promise.all([
          supabase
            .from("report_actions")
            .select("action_id,report_id,action_description,status,due_date,created_at")
            .eq("responsible_org_id", context.organizationId)
            .order("created_at", { ascending: false })
            .limit(3),
          reportIds.length
            ? supabase
                .from("report_comments")
                .select("comment_id,report_id,comment_text,created_at")
                .in("report_id", reportIds)
                .order("created_at", { ascending: false })
                .limit(3)
            : Promise.resolve({ data: [] }),
        ]);

        if (!isMounted) return;
        const mapped =
          reportRows?.map((row) => ({
            ...row,
            status_code: row.report_statuses?.code ?? row.status ?? null,
            status_label: row.report_statuses?.label ?? row.status ?? null,
          })) ?? [];
        setReports(mapped);
        setActions(actionRows ?? []);
        setComments(commentRows ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load organisation data.");
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const inFilter = reports.filter(
      (row) => (row.status_code ?? row.status) === "pre_evaluation"
    ).length;
    const active = reports.filter(
      (row) =>
        row.status_code &&
        ["waiting_admitted", "open_in_progress", "investigation", "remediation"].includes(
          row.status_code
        )
    ).length;
    const archived = reports.filter((row) => (row.status_code ?? row.status) === "archived").length;
    const spam = reports.filter((row) => row.is_spam).length;
    const waiting = reports.filter((row) => (row.status_code ?? row.status) === "waiting_admitted")
      .length;
    const open = reports.filter((row) => (row.status_code ?? row.status) === "open_in_progress").length;
    const remediation = reports.filter((row) => (row.status_code ?? row.status) === "remediation")
      .length;
    return { inFilter, active, archived, spam, waiting, open, remediation };
  }, [reports]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Overview</p>
        <h2 className="mt-2 font-display text-3xl text-slate-900">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">
          Monitor the grievance pipeline across intake, action, and resolution. Adjust priorities
          based on risk and engagement trends.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="In Filter" value={stats.inFilter.toString()} trend="Review queue" />
        <StatCard title="Active Reports" value={stats.active.toString()} trend="Open cases" />
        <StatCard title="Archived" value={stats.archived.toString()} trend="Resolved cases" />
        <StatCard title="Spam" value={stats.spam.toString()} trend="Flagged" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <SectionCard
          title="Pipeline Momentum"
          description="Snapshot of report flow health and open stage allocations."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Open", value: stats.open.toString(), tone: "bg-emerald-50 text-emerald-700" },
              { label: "Waiting", value: stats.waiting.toString(), tone: "bg-amber-50 text-amber-700" },
              { label: "Remediation", value: stats.remediation.toString(), tone: "bg-rose-50 text-rose-700" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 p-4">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] ${item.tone}`}>
                  Updated 2h ago
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">Analytics integrations coming soon</p>
            <p className="mt-2 text-xs text-slate-500">
              Connect ESG analytics or upload CSV exports to visualize risk patterns by region.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Urgent Activity" description="Latest changes across your organisation.">
          <div className="space-y-4">
            {actions.length || comments.length ? (
              <>
                {actions.map((action) => (
                  <ActivityItem
                    key={`action-${action.action_id}`}
                    title={action.action_description}
                    meta={`Action • ${action.due_date ?? "No due date"}`}
                  />
                ))}
                {comments.map((comment) => (
                  <ActivityItem
                    key={`comment-${comment.comment_id}`}
                    title={comment.comment_text}
                    meta={`Comment • ${
                      comment.created_at ? new Date(comment.created_at).toLocaleDateString() : "-"
                    }`}
                  />
                ))}
              </>
            ) : (
              <p className="text-sm text-slate-500">No recent activity yet.</p>
            )}
          </div>
          <button className="mt-6 w-full rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
            View activity log
          </button>
        </SectionCard>
      </div>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
