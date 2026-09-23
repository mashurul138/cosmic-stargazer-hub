import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Determine base origin considering production load balancers and reverse proxies
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const targetBase =
    !isLocalEnv && forwardedHost ? `https://${forwardedHost}` : origin;

  // Prevent open redirect vulnerabilities by ensuring next is a relative path
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (code) {
    try {
      const cookieStore = await cookies();
      const supabase = createServerSupabaseClient(cookieStore);
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(new URL(safeNext, targetBase));
      }

      // If an error occurs during exchange, redirect to /login?error=oauth_failed
      return NextResponse.redirect(
        new URL("/login?error=oauth_failed", targetBase),
      );
    } catch {
      // If an exception occurs, redirect to /login?error=oauth_failed
      return NextResponse.redirect(
        new URL("/login?error=oauth_failed", targetBase),
      );
    }
  }

  // If no code is provided, redirect to login with error parameter
  return NextResponse.redirect(
    new URL("/login?error=oauth_failed", targetBase),
  );
}
