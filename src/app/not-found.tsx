import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.22),_transparent_45%)]" />
      <div className="absolute left-[12%] top-[18%] h-1 w-1 rounded-full bg-white shadow-[12rem_4rem_0_0_rgba(255,255,255,0.8),22rem_18rem_0_0_rgba(255,255,255,0.6),-7rem_28rem_0_0_rgba(255,255,255,0.75),31rem_-2rem_0_0_rgba(255,255,255,0.7)]" />

      <section className="relative w-full max-w-xl rounded-2xl border border-indigo-400/25 bg-slate-900/80 p-8 text-center shadow-2xl shadow-indigo-950/40 backdrop-blur sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-300">404 · Deep space</p>
        <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full border border-indigo-300/40 bg-indigo-400/10 text-5xl" aria-hidden="true">
          ✦
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">Lost in Space</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-300">
          The celestial destination you requested has drifted beyond our star charts. Let’s guide you back to familiar skies.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          Return to Dashboard
        </Link>
      </section>
    </main>
  );
}
