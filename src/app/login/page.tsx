import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  auth_failed: "Google sign-in didn't complete. Please try again.",
  link_invalid: "That reset link is invalid or has already been used. Request a new one below.",
  link_expired: "That reset link has expired. Request a new one below.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginClient notice={error ? NOTICES[error] ?? null : null} />;
}
