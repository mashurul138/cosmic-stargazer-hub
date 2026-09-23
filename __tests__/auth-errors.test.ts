import { describe, it, expect } from "vitest";
import { mapAuthError } from "@/lib/utils/authErrors";

describe("mapAuthError", () => {
  it("translates over_email_send_rate_limit code", () => {
    const error = {
      code: "over_email_send_rate_limit",
      message: "Email rate limit exceeded",
    };
    expect(mapAuthError(error)).toBe(
      "Too many signup attempts. Please wait a few minutes, or sign in directly if your account was already created.",
    );
  });

  it("translates email rate limit message without explicit code", () => {
    const error = new Error("email rate limit exceeded");
    expect(mapAuthError(error)).toBe(
      "Too many signup attempts. Please wait a few minutes, or sign in directly if your account was already created.",
    );
  });

  it("translates user_already_exists code", () => {
    const error = {
      code: "user_already_exists",
      message: "User already registered",
    };
    expect(mapAuthError(error)).toBe(
      "An account with this email already exists. Please sign in instead.",
    );
  });

  it("translates user already registered message", () => {
    const error = new Error("User already registered");
    expect(mapAuthError(error)).toBe(
      "An account with this email already exists. Please sign in instead.",
    );
  });

  it("translates invalid_credentials code", () => {
    const error = {
      code: "invalid_credentials",
      message: "Invalid login credentials",
    };
    expect(mapAuthError(error)).toBe(
      "Incorrect email or password. Please check your details and try again.",
    );
  });

  it("translates invalid login credentials message", () => {
    const error = new Error("Invalid login credentials");
    expect(mapAuthError(error)).toBe(
      "Incorrect email or password. Please check your details and try again.",
    );
  });

  it("translates weak_password code", () => {
    const error = { code: "weak_password", message: "Password is too weak" };
    expect(mapAuthError(error)).toBe(
      "Password should be at least 6 characters.",
    );
  });

  it("translates weak password message", () => {
    const error = new Error("Password should be at least 6 characters");
    expect(mapAuthError(error)).toBe(
      "Password should be at least 6 characters.",
    );
  });

  it("translates oauth_failed code", () => {
    const error = { code: "oauth_failed" };
    expect(mapAuthError(error)).toBe(
      "Authentication with Google failed or was cancelled. Please try again or sign in with your email.",
    );
  });

  it("formats unknown errors into clean sentences", () => {
    const error = new Error("AuthApiError: database connection timeout");
    expect(mapAuthError(error)).toBe("Database connection timeout.");
  });

  it("handles null and undefined gracefully", () => {
    expect(mapAuthError(null)).toBe(
      "An unexpected authentication error occurred. Please try again.",
    );
    expect(mapAuthError(undefined)).toBe(
      "An unexpected authentication error occurred. Please try again.",
    );
  });
});
