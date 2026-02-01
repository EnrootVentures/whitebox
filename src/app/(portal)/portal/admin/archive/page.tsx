"use client";

import { useEffect, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import { adminInvoke } from "@/lib/adminApi";

type ArchivedRow = {
  report_id: number;
  report_code: string;
  title: string;
  description: string;
  created_at: string;
  status: string;
  status_code?: string | null;
  status_label?: string | null;
};

export default function AdminArchivePage() {
  const [rows, setRows] = useState<ArchivedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adminInvoke<{ reports: ArchivedRow[] }>("listArchivedReports")
      .then((data) => {
        if (!isMounted) return;
        setRows(data.reports);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load archived reports.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const restoreReport = async (reportId: number) => {
    setIsSaving(true);
    setError(null);
    try {
      await adminInvoke("updateReport", { report_id: reportId, status_code: "open_in_progress" });
      setRows((prev) => prev.filter((row) => row.report_id !== reportId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update report.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SectionCard title="Archive" description={`${rows.length} results`}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Report</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.report_id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.report_code}</td>
                <td className="px-4 py-3">{row.title}</td>
                <td className="px-4 py-3">
                  {row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-3">{row.status_label ?? row.status_code ?? row.status}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-1 text-[11px]"
                    onClick={() => restoreReport(row.report_id)}
                    disabled={isSaving}
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </SectionCard>
  );
}
