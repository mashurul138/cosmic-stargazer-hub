/**
 * Centralized Authentication Error Mapper for Cosmic Event & Stargazer Hub.
 * Translates Supabase Auth errors and raw API codes into clear, actionable,
 * production-grade user messages.
 */

export interface AuthErrorLike {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
}

/**
 * Maps Supabase Auth errors or generic exceptions to user-friendly messages.
 *
 * @param error - The raw error caught from Supabase or network calls.
 * @returns A polished, actionable message ready for UI presentation.
 */
export function mapAuthError(error: unknown): string {
  if (!error) {
    return "An unexpected authentication error occurred. Please try again.";
  }

  let code = "";
  let rawMessage = "";

  if (typeof error === "string") {
    rawMessage = error;
  } else if (typeof error === "object") {
    const err = error as AuthErrorLike;
    code = (err.code || "").toLowerCase().trim();
    rawMessage = (err.message || "").trim();
  }

  const normalized = (code + " " + rawMessage).toLowerCase();

  // 1. Rate limiting
  if (
    code === "over_email_send_rate_limit" ||
    code === "rate_limit_exceeded" ||
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("rate limit")
  ) {
    return "Too many signup attempts. Please wait a few minutes, or sign in directly if your account was already created.";
  }

  // 2. Existing user collision
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    normalized.includes("user_already_exists") ||
    normalized.includes("user already registered") ||
    normalized.includes("already registered") ||
    normalized.includes("already exists")
  ) {
    return "An account with this email already exists. Please sign in instead.";
  }

  // 3. Invalid credentials
  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("invalid grant")
  ) {
    return "Incorrect email or password. Please check your details and try again.";
  }

  // 4. Weak password
  if (
    code === "weak_password" ||
    normalized.includes("weak_password") ||
    normalized.includes("password should be at least 6 characters") ||
    normalized.includes("password is too short")
  ) {
    return "Password should be at least 6 characters.";
  }

  // 5. Unconfirmed email
  if (
    code === "email_not_confirmed" ||
    normalized.includes("email not confirmed")
  ) {
    return "Please confirm your email address before signing in. Check your inbox for the activation link.";
  }

  // 6. Invalid email syntax
  if (
    code === "validation_failed" ||
    normalized.includes("invalid email") ||
    normalized.includes("unable to validate email")
  ) {
    return "Please provide a valid email address.";
  }

  // 7. Network / connection issues
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network error") ||
    normalized.includes("load failed")
  ) {
    return "Unable to connect to the authentication service. Please check your internet connection and try again.";
  }

  // 8. Signups disabled
  if (code === "signup_disabled" || normalized.includes("signup is disabled")) {
    return "Account registration is temporarily disabled. Please contact support or try again later.";
  }

  // 9. OAuth error
  if (
    code === "oauth_failed" ||
    normalized.includes("oauth_failed") ||
    normalized.includes("oauth connection failed")
  ) {
    return "Authentication with Google failed or was cancelled. Please try again or sign in with your email.";
  }

  // Fallback: Gracefully format unknown error into a clean sentence
  if (rawMessage) {
    // Strip common technical prefixes like "AuthApiError: ", "[400] ", etc.
    let cleaned = rawMessage
      .replace(/^[A-Za-z]+Error:\s*/i, "")
      .replace(/^\[\d+\]\s*/, "")
      .replace(/^\d+:\s*/, "")
      .trim();

    if (cleaned.length > 0) {
      // Ensure the first character is capitalized and ends with a period
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      if (
        !cleaned.endsWith(".") &&
        !cleaned.endsWith("!") &&
        !cleaned.endsWith("?")
      ) {
        cleaned += ".";
      }
      return cleaned;
    }
  }

  return "An unexpected authentication error occurred. Please try again.";
}
