"use client";

import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/portal/SectionCard";
import StatCard from "@/components/portal/StatCard";
import { adminInvoke } from "@/lib/adminApi";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalReports: 0,
    waitingFilter: 0,
    investigating: 0,
    remediation: 0,
    archivedReports: 0,
    spamReports: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    adminInvoke<{
      totalReports: number;
      waitingFilter: number;
      investigating: number;
      remediation: number;
      archivedReports: number;
      spamReports: number;
    }>("dashboard")
      .then((data) => {
        if (!isMounted) return;
        setStats({
          totalReports: data.totalReports ?? 0,
          waitingFilter: data.waitingFilter ?? 0,
          investigating: data.investigating ?? 0,
          remediation: data.remediation ?? 0,
          archivedReports: data.archivedReports ?? 0,
          spamReports: data.spamReports ?? 0,
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const alerts = useMemo(
    () => [
      { title: "Total reports", value: stats.totalReports.toString(), note: "All statuses" },
      { title: "Waiting filter", value: stats.waitingFilter.toString(), note: "Pending review" },
      { title: "Archived", value: stats.archivedReports.toString(), note: "Archived reports" },
      { title: "Spam", value: stats.spamReports.toString(), note: "Flagged spam" },
    ],
    [stats]
  );

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">System Overview</p>
        <h2 className="mt-2 font-display text-3xl text-slate-900">Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">View WhiteBox operational metrics across tenants.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {alerts.map((item) => (
          <StatCard key={item.title} title={item.title} value={item.value} trend={item.note} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <SectionCard title="Queue health" description="Monitor status distribution and SLA risk."
          actions={<button className="rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600">Export</button>}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Waiting filter", value: stats.waitingFilter.toString() },
              { label: "In investigation", value: stats.investigating.toString() },
              { label: "Remediation", value: stats.remediation.toString() },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Admin alerts" description="System-level tasks needing review.">
          <div className="space-y-3 text-xs text-slate-600">
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
              4 reports flagged as spam require review.
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
              2 organisations awaiting approval.
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              3 consent policies pending renewal.
            </div>
          </div>
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
