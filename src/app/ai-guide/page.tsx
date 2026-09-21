"use client";

import { FormEvent, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAiChat } from "@/src/context/AiChatContext";
import { generateFollowUpSuggestions } from "@/lib/utils/aiFollowups";

const suggestions = [
  "Best telescope for beginners?",
  "How to view Saturn's rings?",
  "Optimal camera settings for night sky",
];

function formatTimestamp(timestamp?: string | Date): string {
  if (!timestamp) return "";
  const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AiGuidePage() {
  const { messages, isLoading, error, sendMessage } = useAiChat();
  const [prompt, setPrompt] = useState("");

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  // Derive contextual follow-up chips from the latest assistant reply
  const followUps = useMemo(() => {
    if (!lastMessage || lastMessage.role !== "assistant" || lastMessage.content.startsWith("⚠️")) {
      return [];
    }
    return generateFollowUpSuggestions(lastMessage.content, "/ai-guide");
  }, [lastMessage]);

  async function submitPrompt(rawPrompt: string) {
    const trimmedPrompt = rawPrompt.trim();
    if (!trimmedPrompt || isLoading) {
      return;
    }

    setPrompt("");
    await sendMessage(trimmedPrompt);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPrompt(prompt);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col"
    >
      <section className="flex min-h-[42rem] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-indigo-950/30">
        <header className="border-b border-slate-700 bg-gradient-to-r from-indigo-950 to-slate-900 px-6 py-5 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
            AI-powered observing help
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Cosmic AI Guide</h1>
          <p className="mt-2 text-sm text-slate-300">
            Clear advice for the sky above and the equipment in your hands.
          </p>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8" aria-live="polite">
          {messages.map((message, idx) => (
            <article
              key={message.id || `msg-${idx}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                  message.role === "user"
                    ? "rounded-br-sm bg-indigo-500 text-white"
                    : "rounded-bl-sm border border-slate-700 bg-slate-950 text-slate-100"
                }`}
              >
                {message.role === "assistant" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h3: ({ node, ...props }) => (
                        <h3 className="text-lg font-bold text-sky-400 mt-4 mb-2" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-3 text-slate-200 leading-relaxed" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-1 mb-3 text-slate-200" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-200" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-white" {...props} />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="w-full text-left border-collapse border border-slate-700 text-sm" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border border-slate-700 bg-slate-800/80 p-2 font-semibold text-sky-300" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-slate-800 p-2 text-slate-300" {...props} />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                )}
                {message.timestamp ? (
                  <p
                    suppressHydrationWarning
                    className={`mt-2 text-xs ${
                      message.role === "user" ? "text-indigo-100" : "text-slate-500"
                    }`}
                  >
                    {message.role === "user" ? "You" : "Cosmic Guide"} · {formatTimestamp(message.timestamp)}
                  </p>
                ) : null}
              </div>
            </article>
          ))}

          {isLoading ? (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 animate-pulse">
                Cosmic Guide is studying the stars…
              </div>
            </div>
          ) : null}

          {/* Dynamic Follow-Up Prompt Chips at Bottom of Message Stream */}
          {!isLoading && followUps.length > 0 ? (
            <div className="pt-2 flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                <Sparkles className="h-3 w-3 animate-pulse" />
                Follow-up suggestions
              </span>
              <div className="flex flex-wrap gap-2">
                {followUps.map((chip, index) => (
                  <button
                    key={`followup-${index}`}
                    type="button"
                    onClick={() => void submitPrompt(chip)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 px-3.5 py-2 text-xs font-medium text-sky-200 transition-all shadow-sm group cursor-pointer"
                  >
                    <span>{chip}</span>
                    <Sparkles className="h-3 w-3 text-sky-400/60 group-hover:text-sky-300 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-700 bg-slate-950/40 px-4 py-4 sm:px-8">
          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-400/35 bg-red-950/35 px-4 py-3 text-sm text-red-100"
            >
              {error}
            </div>
          ) : null}

          <div className="mb-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void submitPrompt(suggestion)}
                disabled={isLoading}
                className="rounded-full border border-indigo-400/35 bg-indigo-400/10 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition hover:bg-indigo-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <label htmlFor="cosmic-guide-prompt" className="sr-only">
              Ask Cosmic Guide
            </label>
            <textarea
              id="cosmic-guide-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={isLoading}
              rows={2}
              maxLength={2000}
              placeholder="Ask about stargazing, equipment, or astrophotography…"
              className="min-h-12 flex-1 resize-none rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="self-end rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Thinking…" : "Send"}
            </button>
          </form>
        </div>
      </section>
    </motion.div>
  );
}
