"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import StatCard from "@/components/portal/StatCard";
import { supabase } from "@/lib/supabase/client";

type ReportRow = {
  report_id: number;
  title: string;
  status: string | null;
  status_id?: number | null;
  status_code?: string | null;
  status_label?: string | null;
  is_spam: boolean | null;
  created_at: string | null;
};

type CommentRow = {
  comment_id: number;
  report_id: number;
  comment_text: string;
  created_at: string | null;
};

export default function ReporterDashboardPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData.user?.id;
      if (!authUserId) {
        setError("Please log in to view your dashboard.");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (!profile?.user_id) {
        setError("Reporter profile not found.");
        return;
      }

      const { data: reportRows, error: reportError } = await supabase
        .from("reports")
        .select("report_id,title,status,status_id,is_spam,created_at,report_statuses(code,label)")
        .eq("reporter_user_id", profile.user_id)
        .order("created_at", { ascending: false });

      if (reportError) {
        setError(reportError.message);
        return;
      }

      const reportIds = (reportRows ?? []).map((row) => row.report_id);
      const { data: commentRows } = reportIds.length
        ? await supabase
            .from("report_comments")
            .select("comment_id,report_id,comment_text,created_at")
            .in("report_id", reportIds)
            .order("created_at", { ascending: false })
            .limit(5)
        : { data: [] };

      if (!isMounted) return;
      const mapped =
        reportRows?.map((row) => ({
          ...row,
          status_code: row.report_statuses?.code ?? row.status ?? null,
          status_label: row.report_statuses?.label ?? row.status ?? null,
        })) ?? [];
      setReports(mapped);
      setComments(commentRows ?? []);
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
    return { inFilter, active, archived, spam };
  }, [reports]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Reporter Overview</p>
        <h2 className="mt-2 font-display text-3xl text-slate-900">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">
          Track your open grievances, see responses, and share feedback on actions.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="In Filter" value={stats.inFilter.toString()} />
        <StatCard title="Active Reports" value={stats.active.toString()} />
        <StatCard title="Archived" value={stats.archived.toString()} />
        <StatCard title="Spam" value={stats.spam.toString()} />
      </div>

      <SectionCard
        title="Recent updates"
        description="You will see organisation responses and action updates here."
      >
        {comments.length ? (
          <div className="space-y-3 text-sm text-slate-600">
            {comments.map((comment) => (
              <div key={comment.comment_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-400">
                  {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : "-"}
                </p>
                <p className="mt-2 text-sm text-slate-600">{comment.comment_text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No updates yet. Submit a report to begin.
          </div>
        )}
      </SectionCard>
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
