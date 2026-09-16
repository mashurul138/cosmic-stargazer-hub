'use client';

import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Bot,
  User,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ROUTE_SUGGESTIONS: Record<string, string[]> = {
  '/map': [
    'What does Bortle Class 3 mean?',
    'Find dark sky parks near me',
    'Best targets for Bortle 4',
  ],
  '/satellites': [
    'When is the next bright ISS pass?',
    'How high is Tiangong above horizon?',
    'What is elevation angle?',
  ],
  '/fov-simulator': [
    'What sensor size fits Andromeda (M31)?',
    'Explain focal length vs field of view',
    'Best framing for Orion Nebula',
  ],
  '/star-parties': [
    'How do I host a star party?',
    'What equipment should I bring?',
    'Etiquette for dark sky events',
  ],
  '/astrophotography-assessor': [
    'Why are my stars trailing?',
    'How to fix out-of-focus stars?',
    'Explain ISO vs sensor noise',
  ],
};

const DEFAULT_SUGGESTIONS = [
  'What planets are visible tonight?',
  'How do I dark-adapt my eyes?',
  'Recommended beginner telescopes',
];

function generateFollowUps(lastResponse: string): string[] {
  const text = lastResponse.toLowerCase();

  if (/trail|guiding|polar align|mount|drift|tracking/.test(text)) {
    return [
      'What exposure time rule (500 or NPF) applies?',
      'How do I achieve precise polar alignment?',
      'Would an auto-guider eliminate star trails?',
    ];
  }
  if (/noise|iso|sensor|gain|dark frame|stack|exposure/.test(text)) {
    return [
      'What are calibration dark and flat frames?',
      'What is the sweet spot ISO for my camera?',
      'Which free stacking software do you recommend?',
    ];
  }
  if (/bortle|light pollution|filter|glow|magnitude|nelm/.test(text)) {
    return [
      'What filter helps best with light pollution?',
      'Can I image emission nebulae in Bortle 6?',
      'How does lunar phase impact Bortle visibility?',
    ];
  }
  if (/satellite|iss|orbit|tiangong|pass|azimuth|elevation/.test(text)) {
    return [
      'How do I photograph an ISS transit?',
      'What does minimum elevation angle mean?',
      'Why do satellites flash or vary in brightness?',
    ];
  }
  if (/fov|focal length|eyepiece|magnification|barlow|sensor/.test(text)) {
    return [
      'Should I buy a 2x Barlow lens?',
      'How do I calculate optimal exit pupil?',
      'What framing works best for the Pleiades (M45)?',
    ];
  }
  if (/party|attend|etiquette|red light|lantern|courtesy/.test(text)) {
    return [
      'Why is red light required at dark sky gatherings?',
      'What warm weather gear should I pack?',
      'How do I set up without disturbing observers?',
    ];
  }
  if (/telescope|refractor|reflector|dobsonian|aperture/.test(text)) {
    return [
      'Dobsonian vs Refractor for beginners?',
      'How much aperture is needed for deep space?',
      'How often do telescopes need collimation?',
    ];
  }

  return [
    'Can you explain that more step-by-step?',
    'What equipment is recommended for this?',
    'What celestial targets should I try next?',
  ];
}

export function FloatingAiAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine route-specific suggestions
  const activeSuggestions = ROUTE_SUGGESTIONS[pathname] || DEFAULT_SUGGESTIONS;

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on drawer open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  async function handleSend(queryText?: string) {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setFollowUps([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          context: {
            location: `Route: ${pathname}`,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to ask Cosmic AI questions.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reach Cosmic Guide.');
      }

      const data = await response.json();
      const assistantText = data.response || 'Clear skies! How else can I guide your observation?';

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantText,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setFollowUps(generateFollowUps(assistantText));
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: err.message || 'Apologies, an atmospheric disturbance occurred. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setMessages([]);
    setFollowUps([]);
  }

  return (
    <aside aria-label="Cosmic AI Assistant" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Slide-up Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-96 max-w-[calc(100vw-2rem)] h-[520px] glass-panel rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 border border-slate-700/80"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md shadow-sky-500/30">
                  <Bot className="h-4 w-4 text-white" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Cosmic AI Guide
                    <span className="rounded-full bg-sky-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-sky-300 border border-sky-500/30">
                      Live
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Contextual Astronomical Assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Reset chat"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label="Minimize AI Assistant"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-400/20 text-sky-400 mb-3">
                    <Sparkles className="h-6 w-6 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200">How can I assist your stargazing?</h4>
                  <p className="text-[11px] text-slate-400 mt-1 mb-4 max-w-[240px]">
                    Ask any question about telescope optics, sky pollution, passes, or astrophotography.
                  </p>

                  {/* Route-Aware Dynamic Starter Chips */}
                  <div className="w-full space-y-1.5 text-left">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-1">
                      Suggested for this page
                    </p>
                    {activeSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSend(suggestion)}
                        className="w-full text-left rounded-xl bg-slate-900/90 hover:bg-sky-500/15 border border-slate-800 hover:border-sky-500/40 px-3 py-2 text-[11px] text-slate-300 hover:text-white transition-all duration-150 flex items-center justify-between group"
                      >
                        <span className="truncate pr-2">{suggestion}</span>
                        <Sparkles className="h-3 w-3 text-sky-400/60 group-hover:text-sky-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white mt-0.5">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-md ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-tr-xs'
                            : 'glass-panel text-slate-200 rounded-tl-xs border border-slate-800/90 whitespace-pre-wrap'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-white mt-0.5">
                          <User className="h-3.5 w-3.5 text-slate-300" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-2.5 justify-start">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                      <div className="glass-panel text-slate-300 rounded-2xl rounded-tl-xs px-3.5 py-2 text-xs flex items-center gap-2 border border-slate-800">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                        <span>Scanning celestial knowledge...</span>
                      </div>
                    </div>
                  )}

                  {/* Follow-up Suggestions Engine Chips */}
                  {followUps.length > 0 && !isLoading && (
                    <div className="mt-3 pt-2 border-t border-slate-800/60 space-y-1.5">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-sky-400/90 px-1">
                        Follow-up Questions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {followUps.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleSend(chip)}
                            className="rounded-full bg-slate-900/90 hover:bg-sky-500/20 border border-slate-700/80 hover:border-sky-400/50 px-2.5 py-1 text-[10px] text-sky-300 hover:text-white transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="border-t border-slate-800/80 bg-slate-950/80 p-3 backdrop-blur-md flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about telescopes, ISS, stars..."
                disabled={isLoading}
                className="flex-1 rounded-xl bg-slate-900/90 border border-slate-700/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-400/40 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-950/50 hover:from-sky-400 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <button
        type="button"
        id="floating-ai-assistant-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 text-white shadow-xl shadow-sky-950/60 transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-sky-400/30"
        aria-label={isOpen ? 'Close AI Guide' : 'Open Cosmic AI Guide'}
      >
        {/* Floating Pulse Glow Ring */}
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 opacity-60 blur-sm group-hover:opacity-100 transition-opacity animate-pulse -z-10" />

        {isOpen ? (
          <X className="h-6 w-6 text-white transition-transform group-hover:rotate-90" />
        ) : (
          <Sparkles className="h-6 w-6 text-white animate-pulse" />
        )}
      </button>
    </aside>
  );
}
