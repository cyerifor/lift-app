"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type FormData = {
  personalName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  timezone: "GMT" | "EST" | "PST" | "AEST";
  defaultUnits: "kg" | "lb";
  tier: "STARTER" | "PRO" | "SCALE" | "";
};

type ValidationErrors = Partial<Record<keyof FormData, string>>;
const acceptedImageTypes = new Set(["image/png", "image/jpeg", "image/svg+xml"]);

const initialFormData: FormData = {
  personalName: "",
  email: "",
  password: "",
  confirmPassword: "",
  businessName: "",
  timezone: "GMT",
  defaultUnits: "kg",
  tier: "",
};

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [logoError, setLogoError] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stepProgress = useMemo(() => (currentStep / 3) * 100, [currentStep]);

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError("");
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function clearLogo() {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
    setLogoFile(null);
    setLogoError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleLogoSelect(file: File | null) {
    setLogoError("");
    if (!file) {
      clearLogo();
      return;
    }

    if (!acceptedImageTypes.has(file.type)) {
      clearLogo();
      setLogoError("Logo must be PNG, JPG, or SVG.");
      return;
    }

    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }

  function validateStep1(data: FormData): ValidationErrors {
    const nextErrors: ValidationErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!data.personalName.trim()) nextErrors.personalName = "Personal name is required.";
    if (!data.email.trim()) nextErrors.email = "Email is required.";
    else if (!emailRegex.test(data.email)) nextErrors.email = "Enter a valid email address.";
    if (!data.password) nextErrors.password = "Password is required.";
    else if (data.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    if (!data.confirmPassword) nextErrors.confirmPassword = "Please confirm your password.";
    else if (data.password !== data.confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";

    return nextErrors;
  }

  function validateStep2(data: FormData): ValidationErrors {
    const nextErrors: ValidationErrors = {};

    if (!data.businessName.trim()) nextErrors.businessName = "Business name is required.";
    if (!data.timezone) nextErrors.timezone = "Timezone is required.";
    if (!data.defaultUnits) nextErrors.defaultUnits = "Default units are required.";

    return nextErrors;
  }

  function validateStep3(data: FormData): ValidationErrors {
    const nextErrors: ValidationErrors = {};
    if (!data.tier) nextErrors.tier = "Please select a tier.";
    return nextErrors;
  }

  const step1Errors = validateStep1(formData);
  const isStep1Valid = Object.keys(step1Errors).length === 0;

  function handleNext() {
    if (currentStep === 1) {
      const nextErrors = validateStep1(formData);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;
    }

    if (currentStep === 2) {
      const nextErrors = validateStep2(formData);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }

  function handleBack() {
    setSubmitError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSubmit() {
    const validation = {
      ...validateStep1(formData),
      ...validateStep2(formData),
      ...validateStep3(formData),
    };

    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    if (logoFile && !acceptedImageTypes.has(logoFile.type)) {
      setLogoError("Logo must be PNG, JPG, or SVG.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    const payload = new FormData();
    payload.append("email", formData.email.trim().toLowerCase());
    payload.append("password", formData.password);
    payload.append("personalName", formData.personalName.trim());
    payload.append("businessName", formData.businessName.trim());
    payload.append("timezone", formData.timezone);
    payload.append("defaultUnits", formData.defaultUnits);
    payload.append("tier", formData.tier);
    if (logoFile) payload.append("logo", logoFile);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as { sessionToken?: string; error?: string; message?: string };

      if (!response.ok) {
        const message = data.error || data.message || "Unable to create account. Please try again.";
        setSubmitError(message);
        return;
      }

      if (!data.sessionToken) {
        setSubmitError("Signup succeeded but no session token was returned.");
        return;
      }

      localStorage.setItem("session_token", data.sessionToken);
      router.push("/dashboard");
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="mb-2 text-sm text-slate-300">Step {currentStep} of 3</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-8">
          <div className="transition-all duration-300 ease-out">
            {currentStep === 1 && (
              <div className="space-y-5">
                <h1 className="text-2xl font-semibold">Create your account</h1>
                <div>
                  <label className="mb-2 block text-sm text-slate-200">Personal name</label>
                  <input
                    value={formData.personalName}
                    onChange={(e) => updateField("personalName", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-blue-500"
                    placeholder="Jordan Smith"
                  />
                  {errors.personalName && <p className="mt-1 text-sm text-red-400">{errors.personalName}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-200">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-blue-500"
                    placeholder="you@company.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-200">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-blue-500"
                    placeholder="At least 8 characters"
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-200">Confirm password</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-blue-500"
                    placeholder="Re-enter password"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!isStep1Valid}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <h1 className="text-2xl font-semibold">Business branding</h1>
                <div>
                  <label className="mb-2 block text-sm text-slate-200">Business name</label>
                  <input
                    value={formData.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-blue-500"
                    placeholder="Apex Barbell"
                  />
                  {errors.businessName && <p className="mt-1 text-sm text-red-400">{errors.businessName}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-200">Logo (optional)</label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleLogoSelect(e.dataTransfer.files?.[0] ?? null);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-lg border border-dashed border-slate-600 bg-slate-950/80 p-4 transition hover:border-blue-500"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleLogoSelect(e.target.files?.[0] ?? null)}
                    />
                    <p className="text-sm text-slate-300">Click to browse or drag and drop an image upload.</p>
                    <p className="mt-1 text-xs text-slate-400">Accepted: PNG, JPG, SVG</p>
                  </div>

                  {!logoFile && !logoError && <p className="mt-2 text-sm text-slate-400">No file selected.</p>}

                  {logoError && <p className="mt-2 text-sm text-red-400">{logoError}</p>}

                  {logoFile && (
                    <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3">
                      <div className="flex items-start gap-3">
                        {logoPreviewUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoPreviewUrl} alt="Logo preview" className="h-14 w-14 rounded object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-100">{logoFile.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(logoFile.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearLogo();
                          }}
                          className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-200">Timezone</label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => updateField("timezone", e.target.value as FormData["timezone"])}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-blue-500"
                    >
                      <option value="GMT">GMT</option>
                      <option value="EST">EST</option>
                      <option value="PST">PST</option>
                      <option value="AEST">AEST</option>
                    </select>
                    {errors.timezone && <p className="mt-1 text-sm text-red-400">{errors.timezone}</p>}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-200">Default units</label>
                    <select
                      value={formData.defaultUnits}
                      onChange={(e) => updateField("defaultUnits", e.target.value as FormData["defaultUnits"])}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none transition focus:border-blue-500"
                    >
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                    {errors.defaultUnits && <p className="mt-1 text-sm text-red-400">{errors.defaultUnits}</p>}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full rounded-lg border border-slate-700 px-4 py-2 font-medium transition hover:bg-slate-800"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-5">
                <h1 className="text-2xl font-semibold">Choose your tier</h1>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { key: "STARTER", title: "Starter", price: "Free", blurb: "5 athletes, basic features" },
                    {
                      key: "PRO",
                      title: "Pro",
                      price: "£15/mo",
                      blurb: "25 athletes, video upload, advanced analytics",
                      popular: true,
                    },
                    { key: "SCALE", title: "Scale", price: "Custom", blurb: "Unlimited athletes, API access" },
                  ].map((tier) => {
                    const selected = formData.tier === tier.key;
                    const popular = Boolean(tier.popular);

                    return (
                      <div
                        key={tier.key}
                        className={`rounded-xl border p-4 transition ${
                          popular ? "border-blue-500 bg-slate-900" : "border-slate-700 bg-slate-950/70"
                        } ${selected ? "ring-2 ring-blue-500" : ""}`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h2 className="text-lg font-semibold">{tier.title}</h2>
                          {popular && (
                            <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                              Most popular
                            </span>
                          )}
                        </div>
                        <p className="text-xl font-bold">{tier.price}</p>
                        <p className="mt-1 text-sm text-slate-300">{tier.blurb}</p>
                        <button
                          type="button"
                          onClick={() => updateField("tier", tier.key as FormData["tier"])}
                          className="mt-4 w-full rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium transition hover:bg-slate-800"
                        >
                          Select
                        </button>
                      </div>
                    );
                  })}
                </div>

                {errors.tier && <p className="text-sm text-red-400">{errors.tier}</p>}
                {submitError && <p className="text-sm text-red-400">{submitError}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-700 px-4 py-2 font-medium transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Creating account...
                      </span>
                    ) : (
                      "Create account"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
