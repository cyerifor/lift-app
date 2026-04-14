"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
  personalName: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  bodyweight: string;
  competitionDate: string;
  squatMax: string;
  benchMax: string;
  deadliftMax: string;
  goals: "competition_prep" | "strength" | "hypertrophy" | "general";
  trainingAge: string;
  injuries: string;
  notes: string;
};

const initialForm: FormState = {
  email: "",
  password: "",
  confirmPassword: "",
  personalName: "",
  dob: "",
  gender: "Male",
  bodyweight: "",
  competitionDate: "",
  squatMax: "",
  benchMax: "",
  deadliftMax: "",
  goals: "strength",
  trainingAge: "",
  injuries: "",
  notes: "",
};

export default function AthleteInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [completed, setCompleted] = useState(false);

  const progress = useMemo(() => `${step === 3 ? 100 : (step / 2) * 100}%`, [step]);

  useEffect(() => {
    let mounted = true;
    async function loadInvite() {
      try {
        const response = await fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`);
        const data = (await response.json()) as { email?: string | null; error?: string };
        if (!mounted) return;
        if (!response.ok) {
          setSubmitError(data.error || "Invite token is invalid or expired.");
          return;
        }
        setForm((prev) => ({ ...prev, email: data.email || "" }));
      } catch {
        if (mounted) setSubmitError("Unable to load invite details.");
      } finally {
        if (mounted) setIsLoadingInvite(false);
      }
    }

    void loadInvite();
    return () => {
      mounted = false;
    };
  }, [token]);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setSubmitError("");
  }

  function validateStep(current: number) {
    const nextErrors: Record<string, string> = {};
    if (current === 1) {
      if (!form.email.trim()) nextErrors.email = "Email is required.";
      if (!form.password || form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
      if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (current === 2) {
      if (!form.personalName.trim()) nextErrors.personalName = "Personal name is required.";
      if (!form.dob) nextErrors.dob = "Date of birth is required.";
      if (!form.trainingAge.trim()) nextErrors.trainingAge = "Training age is required.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validateStep(2)) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/auth/athlete-accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteToken: token,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          personalName: form.personalName,
          dob: form.dob,
          gender: form.gender,
          bodyweight: Number(form.bodyweight || 0),
          competitionDate: form.competitionDate || "",
          squatMax: Number(form.squatMax || 0),
          benchMax: Number(form.benchMax || 0),
          deadliftMax: Number(form.deadliftMax || 0),
          goals: form.goals,
          trainingAge: form.trainingAge,
          injuries: form.injuries,
          notes: form.notes,
        }),
      });
      const data = (await response.json()) as { sessionToken?: string; error?: string; message?: string };
      if (!response.ok) {
        setSubmitError(data.error || data.message || "Unable to accept invite.");
        return;
      }
      if (!data.sessionToken) {
        setSubmitError("No session token returned.");
        return;
      }
      localStorage.setItem("session_token", data.sessionToken);
      setCompleted(true);
      setStep(3);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingInvite) {
    return <main className="min-h-screen bg-slate-950 p-8 text-white">Loading invite...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-2 text-sm text-slate-300">
          {step === 3 ? "Done" : `Step ${step} of 2`}
        </p>
        <div className="mb-6 h-2 w-full rounded-full bg-slate-800">
          <div className="h-2 rounded-full bg-blue-500 transition-all duration-300" style={{ width: progress }} />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold">Account</h1>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input
                  value={form.email}
                  readOnly={Boolean(form.email)}
                  onChange={(e) => setField("email", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                />
                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                />
                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Confirm password</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>}
              </div>
              <button type="button" onClick={() => validateStep(1) && setStep(2)} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500">
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold">Training info</h1>
              <input placeholder="Personal name" value={form.personalName} onChange={(e) => setField("personalName", e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              {errors.personalName && <p className="text-sm text-red-400">{errors.personalName}</p>}
              <input type="date" value={form.dob} onChange={(e) => setField("dob", e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              {errors.dob && <p className="text-sm text-red-400">{errors.dob}</p>}
              <select value={form.gender} onChange={(e) => setField("gender", e.target.value as FormState["gender"])} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <input type="number" placeholder="Bodyweight" value={form.bodyweight} onChange={(e) => setField("bodyweight", e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <input type="date" value={form.competitionDate} onChange={(e) => setField("competitionDate", e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <div className="grid gap-3 sm:grid-cols-3">
                <input type="number" placeholder="Squat max" value={form.squatMax} onChange={(e) => setField("squatMax", e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                <input type="number" placeholder="Bench max" value={form.benchMax} onChange={(e) => setField("benchMax", e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
                <input type="number" placeholder="Deadlift max" value={form.deadliftMax} onChange={(e) => setField("deadliftMax", e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              </div>
              <select value={form.goals} onChange={(e) => setField("goals", e.target.value as FormState["goals"])} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                <option value="competition_prep">competition_prep</option>
                <option value="strength">strength</option>
                <option value="hypertrophy">hypertrophy</option>
                <option value="general">general</option>
              </select>
              <input placeholder="Training age" value={form.trainingAge} onChange={(e) => setField("trainingAge", e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              {errors.trainingAge && <p className="text-sm text-red-400">{errors.trainingAge}</p>}
              <textarea placeholder="Injuries (optional)" value={form.injuries} onChange={(e) => setField("injuries", e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
              {submitError && <p className="text-sm text-red-400">{submitError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="w-full rounded-lg border border-slate-700 px-4 py-2">
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Finish"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <h1 className="text-2xl font-semibold">Invite accepted</h1>
              <p className="text-slate-300">Your athlete account is ready. Continue to your home dashboard.</p>
              <button
                type="button"
                onClick={() => completed && router.push("/athlete/home")}
                className="inline-flex rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
              >
                Go to athlete home
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-slate-400">
          Need a new invite? <Link className="text-blue-400 hover:text-blue-300" href="/">Contact your coach</Link>
        </p>
      </div>
    </main>
  );
}
