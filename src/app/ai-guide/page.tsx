"use client";

import { FormEvent, useState } from "react";

import { Navbar } from "@/components/Navbar";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const suggestions = [
  "Best telescope for beginners?",
  "How to view Saturn's rings?",
  "Optimal camera settings for night sky",
];

function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AiGuidePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I’m Cosmic Guide. Ask me about stargazing, equipment, astrophotography, or planning your next observing session.",
      timestamp: new Date(),
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPrompt(rawPrompt: string) {
    const trimmedPrompt = rawPrompt.trim();

    if (!trimmedPrompt || isSubmitting) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: "user",
      content: trimmedPrompt,
      timestamp: new Date(),
    };

    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });
      const responseBody = (await response.json().catch(() => null)) as {
        response?: string;
        error?: string;
      } | null;

      if (!response.ok || !responseBody?.response) {
        throw new Error(responseBody?.error ?? "Cosmic Guide could not answer that right now.");
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${crypto.randomUUID()}`,
          role: "assistant",
          content: responseBody.response!,
          timestamp: new Date(),
        },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Cosmic Guide could not answer that right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPrompt(prompt);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex min-h-[42rem] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-indigo-950/30">
          <header className="border-b border-slate-700 bg-gradient-to-r from-indigo-950 to-slate-900 px-6 py-5 sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">AI-powered observing help</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Cosmic AI Guide</h1>
            <p className="mt-2 text-sm text-slate-300">Clear advice for the sky above and the equipment in your hands.</p>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8" aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                    message.role === "user"
                      ? "rounded-br-sm bg-indigo-500 text-white"
                      : "rounded-bl-sm border border-slate-700 bg-slate-950 text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                  <p className={`mt-2 text-xs ${message.role === "user" ? "text-indigo-100" : "text-slate-500"}`}>
                    {message.role === "user" ? "You" : "Cosmic Guide"} · {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </article>
            ))}
            {isSubmitting ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                  Cosmic Guide is studying the stars…
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-700 bg-slate-950/40 px-4 py-4 sm:px-8">
            {error ? (
              <div role="alert" className="mb-4 rounded-lg border border-red-400/35 bg-red-950/35 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mb-4 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void submitPrompt(suggestion)}
                  disabled={isSubmitting}
                  className="rounded-full border border-indigo-400/35 bg-indigo-400/10 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-3">
              <label htmlFor="cosmic-guide-prompt" className="sr-only">Ask Cosmic Guide</label>
              <textarea
                id="cosmic-guide-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={isSubmitting}
                rows={2}
                maxLength={2000}
                placeholder="Ask about stargazing, equipment, or astrophotography…"
                className="min-h-12 flex-1 resize-none rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isSubmitting || !prompt.trim()}
                className="self-end rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Thinking…" : "Send"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
