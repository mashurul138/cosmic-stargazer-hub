"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface AiChatContextValue {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, contextPayload?: Record<string, unknown>) => Promise<void>;
  clearMessages: () => void;
}

const STORAGE_KEY = "cosmic_stargazer_ai_chat_history";

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "I’m Cosmic Guide. Ask me about stargazing, equipment, astrophotography, or planning your next observing session.",
  timestamp: new Date().toISOString(),
};

const AiChatContext = createContext<AiChatContextValue | undefined>(undefined);

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isHydratedRef = useRef<boolean>(false);

  // Restore chat history from localStorage on initial mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore local storage read errors
    } finally {
      isHydratedRef.current = true;
    }
  }, []);

  // Sync messages into localStorage whenever messages update after initial load
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore local storage write errors
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string, contextPayload?: Record<string, unknown>) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/ai-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed,
            context: contextPayload,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Please sign in to ask Cosmic AI questions.");
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to reach Cosmic Guide.");
        }

        const data = await response.json();
        const assistantText =
          data.response || "Clear skies! How else can I guide your observation?";

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role: "assistant",
          content: assistantText,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Cosmic Guide could not answer that right now.";
        setError(message);
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${message}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const clearMessages = useCallback(() => {
    const initial = [DEFAULT_WELCOME_MESSAGE];
    setMessages(initial);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch {
      // Ignore local storage write errors
    }
  }, []);

  return (
    <AiChatContext.Provider
      value={{
        messages,
        isLoading,
        error,
        sendMessage,
        clearMessages,
      }}
    >
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat(): AiChatContextValue {
  const context = useContext(AiChatContext);
  if (!context) {
    throw new Error("useAiChat must be used within an AiChatProvider");
  }
  return context;
}
