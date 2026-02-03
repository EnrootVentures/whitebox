import Link from "next/link";

const highlights = [
  {
    title: "Anonymous-first intake",
    description:
      "Secure reporting without exposing identities. Optional account login keeps reporters informed.",
  },
  {
    title: "Supply-chain visibility",
    description:
      "Escalation across tiers with consent-aware anonymized views for indirect relationships.",
  },
  {
    title: "Deadline-driven procedures",
    description:
      "Structured stages, reminders, and immutable audit trails support compliance and trust.",
  },
];

const steps = [
  {
    step: "01",
    title: "Submit your report",
    description:
      "Choose your language, share details, and decide how to notify involved organisations.",
  },
  {
    step: "02",
    title: "Visibility is controlled",
    description:
      "WhiteBox applies consent and supply-chain rules to control who sees what.",
  },
  {
    step: "03",
    title: "Resolution and actions",
    description:
      "Organisations implement actions, gather evidence, and share progress updates.",
  },
];

export default function Home() {
  return (
    <main className="bg-[radial-gradient(circle_at_top,_#eef2ff,_#f6f7fb_45%,_#f6f7fb_100%)]">
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-14">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--wb-navy)]">
              Secure grievance mechanism
            </p>
            <h1 className="font-display mt-4 text-4xl leading-tight text-slate-900 sm:text-5xl">
              Transform grievances into accountable action across supply chains.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              WhiteBox enables stakeholders to report incidents safely and anonymously, while guiding
              organisations through structured, audit-ready resolution.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/report/new"
                className="rounded-full bg-[var(--wb-navy)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--wb-cobalt)]"
              >
                File a report
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Log in
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-xs text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/80 bg-white/70 p-6 shadow-xl">
            <div className="rounded-2xl bg-[var(--wb-navy)] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                Trusted by compliance teams
              </p>
              <p className="mt-3 text-lg">
                &quot; We needed a platform that respected anonymity while still enabling real action.&quot;
              </p>
              <p className="mt-4 text-sm text-white/70">Compliance lead, EU manufacturer</p>
            </div>
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--wb-cobalt)]" />
                <p>GDPR-ready consent tracking and anonymization controls.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--wb-cobalt)]" />
                <p>Automatic credentials for anonymous reporters.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[var(--wb-cobalt)]" />
                <p>Immutable audit trail for every procedural step.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-8 md:grid-cols-[0.5fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--wb-navy)]">
              How it works
            </p>
            <h2 className="font-display mt-3 text-3xl">A guided path from report to resolution.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#eef1ff_55%,_#d9daf4_100%)] px-8 py-16 text-center shadow-sm">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -left-20 -top-16 h-40 w-40 rounded-full bg-[var(--wb-mist)] blur-3xl" />
            <div className="absolute right-10 top-10 h-24 w-24 rounded-full bg-white/80 blur-2xl" />
          </div>
          <p className="relative text-xs font-semibold uppercase tracking-[0.5em] text-slate-500">
            Start a positive change
          </p>
          <h2 className="font-display relative mt-4 text-4xl text-slate-900 sm:text-5xl">
            Affected by European supply chains?
          </h2>
          <p className="relative mt-4 text-sm text-slate-600">
            File a secure report and help move your case toward accountability.
          </p>
          <div className="relative mt-10 flex justify-center">
            <Link
              href="/report/new"
              className="rounded-full bg-[var(--wb-navy)] px-10 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-lg shadow-indigo-200/60 hover:bg-[var(--wb-cobalt)]"
            >
              File a report »
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
