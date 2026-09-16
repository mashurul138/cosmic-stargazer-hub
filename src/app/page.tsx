"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { supabase } from "@/lib/supabase";

const features = [
  { title: "Real-time Weather & Visibility Scoring", description: "Read the sky before you set up, with conditions and a practical stargazing score built for observing decisions.", symbol: "◌" },
  { title: "Astronomical Event Exporting", description: "Save upcoming celestial events and export them as calendar-ready observing plans.", symbol: "✦" },
  { title: "Optical Equipment Management", description: "Track your telescopes, eyepieces, and binoculars while calculating the metrics that define their reach.", symbol: "⌁" },
  { title: "Cosmic AI Assistant", description: "Ask focused astronomy questions and get useful guidance for your next session under the stars.", symbol: "◈" },
];

export default function HomePage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;
    const timeoutId = window.setTimeout(() => {
      if (mounted) {
        setIsCheckingSession(false);
      }
    }, 2_000);

    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && mounted) {
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Auth session check failed:", error);
      } finally {
        if (mounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void checkAuth();

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [router]);

  if (isCheckingSession) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-300">
        <span className="text-sm font-medium tracking-wide">Mapping the night sky…</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden w-full"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(79,70,229,0.24),transparent_28%),radial-gradient(circle_at_82%_34%,rgba(14,165,233,0.16),transparent_24%),linear-gradient(to_bottom,#020617,#0f172a_52%,#020617)]" />
      <div className="pointer-events-none absolute left-[9%] top-24 h-1 w-1 rounded-full bg-white shadow-[9rem_4rem_0_rgba(255,255,255,0.75),20rem_14rem_0_rgba(255,255,255,0.6),35rem_-2rem_0_rgba(255,255,255,0.8),49rem_18rem_0_rgba(255,255,255,0.5),62rem_7rem_0_rgba(255,255,255,0.75),-4rem_26rem_0_rgba(255,255,255,0.55)]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <section className="flex flex-1 flex-col justify-center py-10 sm:py-16">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Plan · Observe · Discover</p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">Cosmic Event &amp; Stargazer Hub</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">Your complete platform for celestial observation tracking, live weather conditions, optics calculation, and AI astronomy guidance.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex items-center justify-center rounded-lg border border-slate-500 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-300 hover:bg-slate-800">Sign In</Link>
              <Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-400">Create Account</Link>
            </div>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/20 backdrop-blur-sm transition hover:-translate-y-1 hover:border-indigo-400/40">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-400/10 text-xl text-indigo-200">{feature.symbol}</span>
                <h2 className="mt-5 text-base font-bold text-white">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="py-6 text-center text-xs text-slate-500">Built for clear skies and curious minds.</footer>
      </div>
    </motion.div>
  );
}
