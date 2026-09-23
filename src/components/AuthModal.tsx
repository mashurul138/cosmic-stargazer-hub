"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Sparkles,
  Lock,
  Mail,
  Key,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { loginSchema, signUpSchema } from "@/lib/validations/auth";
import { mapAuthError } from "@/lib/utils/authErrors";
import { OAuthButtons } from "@/src/components/auth/OAuthButtons";

export function AuthModal() {
  const router = useRouter();
  const { isModalOpen, promptMessage, closeAuthModal, onAuthSuccess } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Form Fields (retained across tab switching)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"stargazer" | "astronomer">("stargazer");

  // Status
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  }

  function handleClose() {
    resetForm();
    closeAuthModal();
  }

  function handleSwitchTab(newTab: "signin" | "signup") {
    setTab(newTab);
    setError(null);
    setSuccess(null);
    // Note: email and password are intentionally preserved across tab switches
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Client-side pre-validation
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    const validation = loginSchema.safeParse({ email: trimmedEmail, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Please verify your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (signInErr) {
        setError(mapAuthError(signInErr));
        return;
      }

      if (data?.session) {
        resetForm();
        const handledCallback = onAuthSuccess();
        if (!handledCallback) {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Client-side pre-validation
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    const validation = signUpSchema.safeParse({ email: trimmedEmail, password, role });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Please check your registration input.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          data: { role: validation.data.role },
        },
      });

      if (signUpErr) {
        setError(mapAuthError(signUpErr));
        return;
      }

      if (data?.session) {
        resetForm();
        const handledCallback = onAuthSuccess();
        if (!handledCallback) {
          router.push("/dashboard");
          router.refresh();
        }
        return;
      }

      if (data?.user) {
        setPassword("");
        setSuccess(`Check your inbox! We sent a confirmation link to ${validation.data.email}.`);
      }
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  }



  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        {/* Backdrop click handler */}
        <div className="fixed inset-0" onClick={handleClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-sky-950/50"
        >
          {/* Background subtle radial gradient */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 rounded-xl p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header with Dynamic Action Prompt Callout */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Guest Exploration Mode
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {tab === "signin" ? "Sign in to Cosmic Hub" : "Create Stargazer Account"}
            </h2>

            {/* Contextual Action Callout Banner */}
            <div className="flex items-start gap-2.5 rounded-2xl border border-indigo-500/30 bg-indigo-950/40 p-3 text-xs text-indigo-200">
              <Lock className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
              <span>{promptMessage}</span>
            </div>
          </div>

          {/* Social OAuth Buttons */}
          <div className="mt-5">
            <OAuthButtons onError={(err) => setError(err)} disabled={isSubmitting} />

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-slate-900 px-2 text-slate-400">
                  Or continue with email
                </span>
              </div>
            </div>
          </div>

          {/* Tabs: Sign In vs Create Account */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => handleSwitchTab("signin")}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                tab === "signin"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab("signup")}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                tab === "signup"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error / Success Feedback */}
          {error ? (
            <div className="mt-4 flex items-start justify-between gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="rounded-lg p-0.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition-colors"
                aria-label="Dismiss error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {success ? (
            <div className="mt-4 flex items-start justify-between gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span className="leading-relaxed">{success}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="rounded-lg p-0.5 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors"
                aria-label="Dismiss success message"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          {/* Form */}
          <form
            onSubmit={tab === "signin" ? handleSignIn : handleSignUp}
            className="mt-5 space-y-4"
            noValidate
          >
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="stargazer@example.com"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Key className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {tab === "signup" ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Observer Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "stargazer" | "astronomer")}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="stargazer">Stargazer (Community Observer)</option>
                  <option value="astronomer">Astronomer (Researcher / Verified)</option>
                </select>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{tab === "signin" ? "Sign In & Continue Action" : "Create Account & Continue"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-slate-500">
            Guest mode keeps all your current page edits, coordinates, and filters active.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
