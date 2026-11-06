"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { INTERNAL_EMAIL_DOMAIN } from "@/lib/constants";
import AuthShell, { inputClass, primaryButtonClass } from "@/components/auth/AuthShell";

export default function LoginClient({ notice }: { notice: string | null }) {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      console.error(error);
      setError("Google sign-in didn't start. Please try again.");
      setGoogleLoading(false);
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSigningIn(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setSigningIn(false);
      setError(
        error.message === "Invalid login credentials"
          ? "Email or password is incorrect."
          : error.message === "Email not confirmed"
            ? "This email hasn't been confirmed yet. Ask a board lead to help."
            : error.message
      );
      return;
    }
    router.replace("/portal");
    router.refresh();
  }

  const busy = googleLoading || signingIn;

  return (
    <AuthShell
      title="Sign in"
      intro="Use your Google account or your email and password."
      footer={
        <>
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-700 font-medium mb-1">Internal board members</p>
            <p className="text-xs text-blue-600">
              Sign in with your <span className="font-semibold">@{INTERNAL_EMAIL_DOMAIN}</span> account
              to be recognized as a current board member.
            </p>
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">
            This portal is for MIST Dallas board members only.
            <br />
            Interested in competing?{" "}
            <a href="https://mymist.org" className="text-[#2E7BC4] hover:underline" target="_blank" rel="noopener noreferrer">
              Visit MyMIST
            </a>
          </p>
        </>
      }
    >
      {notice && (
        <p role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>
      )}

      <button
        onClick={signInWithGoogle}
        disabled={busy}
        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-[#2D2F3A] font-semibold py-3.5 px-6 rounded-xl hover:border-[#2E7BC4] hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {googleLoading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-[#2E7BC4] rounded-full animate-spin" />
        ) : (
          <Globe className="w-5 h-5 text-[#4285F4]" />
        )}
        {googleLoading ? "Signing in…" : "Continue with Google"}
      </button>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        or
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={signInWithPassword} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[#2D2F3A]">Email</span>
          <input type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="flex items-center justify-between text-sm font-medium text-[#2D2F3A]">
            Password
            <Link href="/login/forgot" className="text-xs font-normal text-[#2E7BC4] hover:underline">Forgot password?</Link>
          </span>
          <input type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {signingIn ? "Signing in…" : "Sign in with email"}
        </button>
      </form>
    </AuthShell>
  );
}
