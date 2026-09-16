import {
  createBrowserClient,
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL.",
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabasePublishableKey,
);

type ServerCookie = {
  name: string;
  value: string;
};

type ServerCookieToSet = ServerCookie & {
  options: CookieOptions;
};

type ServerCookieStore = {
  getAll: () => ServerCookie[];
  set: (name: string, value: string, options: CookieOptions) => void;
};

export function createServerSupabaseClient(cookieStore: ServerCookieStore) {
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: ServerCookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Route handlers can persist refreshed session cookies; other server contexts cannot.
        }
      },
    },
  });
}
