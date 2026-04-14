import Link from "next/link";

const tierCapacity: Record<string, number> = {
  STARTER: 5,
  PRO: 25,
  SCALE: 9999,
};

export default function DashboardPage() {
  // For MVP we default to Starter capacity in the empty state.
  const currentTier = "STARTER";
  const maxAthletes = tierCapacity[currentTier];
  const athletesCount = 0;
  const capacityLabel = currentTier === "SCALE" ? "Unlimited athletes" : `${athletesCount} of ${maxAthletes} athletes`;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-slate-800 bg-slate-900/80 p-6 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
          <div className="mb-8 text-2xl font-bold tracking-tight">Lift.</div>
          <nav className="space-y-1">
            {["Athletes", "Analytics", "Library", "Settings"].map((item) => (
              <a
                key={item}
                href="#"
                className="block rounded-md px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="flex-1 p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold">Your athletes</h1>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500">
              Add athlete
            </button>
          </div>

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-300">Quick stats</p>
            <p className="mt-1 text-lg font-semibold">{capacityLabel}</p>
          </div>

          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-10 text-center">
            <h2 className="text-xl font-semibold">No athletes yet</h2>
            <p className="mt-2 text-slate-300">Start building your coaching roster by inviting your first athlete.</p>
            <Link
              href="#"
              className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
            >
              Invite first athlete
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
