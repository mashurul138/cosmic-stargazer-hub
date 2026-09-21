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
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isModalOpen: boolean;
  promptMessage: string;
  requireAuth: (actionCallback: () => void, promptMessage?: string) => void;
  openAuthModal: (promptMessage?: string, actionCallback?: () => void) => void;
  closeAuthModal: () => void;
  onAuthSuccess: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [promptMessage, setPromptMessage] = useState<string>("Sign in to continue");
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Fetch initial active session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setIsLoading(false);
      }
    });

    // Listen for auth state transitions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = useCallback((message?: string, actionCallback?: () => void) => {
    if (actionCallback) {
      pendingActionRef.current = actionCallback;
    }
    if (message) {
      setPromptMessage(message);
    } else {
      setPromptMessage("Sign in to continue");
    }
    setIsModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsModalOpen(false);
    pendingActionRef.current = null;
  }, []);

  const onAuthSuccess = useCallback(() => {
    setIsModalOpen(false);
    const callback = pendingActionRef.current;
    pendingActionRef.current = null;
    if (callback) {
      // Execute the queued protected action automatically
      try {
        callback();
      } catch (err) {
        console.error("Error executing queued action after auth:", err);
      }
    }
  }, []);

  const requireAuth = useCallback(
    (actionCallback: () => void, promptMsg?: string) => {
      if (user) {
        actionCallback();
      } else {
        openAuthModal(promptMsg, actionCallback);
      }
    },
    [user, openAuthModal]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isModalOpen,
        promptMessage,
        requireAuth,
        openAuthModal,
        closeAuthModal,
        onAuthSuccess,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
