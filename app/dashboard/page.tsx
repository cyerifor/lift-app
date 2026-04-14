"use client";

import { useEffect, useMemo, useState } from "react";

type AthleteRow = {
  athleteId: string;
  email: string;
  personalName: string | null;
  createdAt: string;
};

type PendingInvite = {
  inviteId: string;
  email: string | null;
  token: string;
  inviteUrl: string;
  expiresAt: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  createdAt: string;
};

type AthletesResponse = {
  athletes: AthleteRow[];
  pendingInvites: PendingInvite[];
};

const tierCapacity: Record<string, number> = {
  STARTER: 5,
  PRO: 25,
  SCALE: Number.POSITIVE_INFINITY,
};

export default function DashboardPage() {
  const [coachId, setCoachId] = useState("");
  const [coachTier, setCoachTier] = useState<"STARTER" | "PRO" | "SCALE">("STARTER");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedCoachId = localStorage.getItem("coach_id") || "";
    setCoachId(storedCoachId);
  }, []);

  const capacityLimit = tierCapacity[coachTier];
  const rosterCount = athletes.length;
  const capacityLabel =
    capacityLimit === Number.POSITIVE_INFINITY ? `${rosterCount} athletes (unlimited)` : `${rosterCount} of ${capacityLimit} athletes`;

  const canInvite = useMemo(() => {
    if (capacityLimit === Number.POSITIVE_INFINITY) return true;
    return rosterCount + pendingInvites.length < capacityLimit;
  }, [capacityLimit, rosterCount, pendingInvites.length]);

  async function loadCoachData() {
    if (!coachId) return;

    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/coach/athletes", {
        headers: {
          "x-coach-id": coachId,
        },
      });
      const data = (await response.json()) as AthletesResponse & { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to load dashboard data.");
        return;
      }

      setAthletes(data.athletes || []);
      setPendingInvites(data.pendingInvites || []);
    } catch {
      setError("Network error while loading dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateInvite() {
    if (!coachId) {
      setError("Coach ID is required.");
      return;
    }

    setIsInviting(true);
    setError("");
    setInviteUrl("");

    try {
      const response = await fetch("/api/coach/athletes/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-coach-id": coachId,
        },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase() || undefined,
          sendInviteEmail: false,
        }),
      });

      const data = (await response.json()) as { inviteUrl?: string; error?: string; message?: string };
      if (!response.ok) {
        setError(data.error || data.message || "Unable to generate invite.");
        return;
      }

      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl);
      }

      await loadCoachData();
    } catch {
      setError("Network error while creating invite.");
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col md:flex-row">
        <aside className="border-b border-slate-800 bg-slate-900/80 p-6 md:min-h-screen md:w-72 md:border-b-0 md:border-r">
          <div className="mb-8 text-2xl font-bold tracking-tight">Lift.</div>

          <label className="mb-2 block text-sm text-slate-300">Coach ID (dev)</label>
          <input
            value={coachId}
            onChange={(event) => setCoachId(event.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="Paste coach ID"
          />

          <label className="mb-2 block text-sm text-slate-300">Tier</label>
          <select
            value={coachTier}
            onChange={(event) => setCoachTier(event.target.value as "STARTER" | "PRO" | "SCALE")}
            className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          >
            <option value="STARTER">STARTER</option>
            <option value="PRO">PRO</option>
            <option value="SCALE">SCALE</option>
          </select>

          <button
            onClick={loadCoachData}
            className="mb-6 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm transition hover:bg-slate-700"
          >
            {isLoading ? "Loading..." : "Load roster"}
          </button>

          <label className="mb-2 block text-sm text-slate-300">Invite email (optional)</label>
          <input
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="athlete@example.com"
          />

          <button
            disabled={!canInvite || isInviting}
            onClick={generateInvite}
            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isInviting ? "Generating..." : "+ Invite athlete"}
          </button>

          {inviteUrl && (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
              <p className="mb-1 text-slate-400">Invite URL</p>
              <p className="break-all">{inviteUrl}</p>
            </div>
          )}
        </aside>

        <section className="flex-1 p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Your athletes</h1>
            <p className="mt-1 text-slate-300">Invite and manage your roster from one place.</p>
          </div>

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-300">Quick stats</p>
            <p className="mt-1 text-lg font-semibold">{capacityLabel}</p>
            {!canInvite && <p className="mt-2 text-sm text-amber-300">Tier limit reached for invites/athletes.</p>}
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>
          )}

          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-3 text-lg font-semibold">Pending invites</h2>
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-slate-400">No pending invites.</p>
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.inviteId} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                    <p className="text-sm text-slate-200">{invite.email || "Email unlocked invite"}</p>
                    <p className="mt-1 break-all text-xs text-slate-400">{invite.inviteUrl}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-3 text-lg font-semibold">Athlete roster</h2>
            {athletes.length === 0 ? (
              <p className="text-sm text-slate-400">No athletes yet. Invite your first athlete.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {athletes.map((athlete) => (
                      <tr key={athlete.athleteId} className="border-t border-slate-800">
                        <td className="py-2 pr-4">{athlete.personalName || "Unnamed athlete"}</td>
                        <td className="py-2 pr-4 text-slate-300">{athlete.email}</td>
                        <td className="py-2 pr-4 text-slate-400">{new Date(athlete.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
