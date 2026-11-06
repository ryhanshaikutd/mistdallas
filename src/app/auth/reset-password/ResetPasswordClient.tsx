"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell, { inputClass, primaryButtonClass } from "@/components/auth/AuthShell";
import { MIN_PASSWORD_LENGTH } from "@/lib/login/password-rules";

export default function ResetPasswordClient({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }
    router.replace("/portal");
    router.refresh();
  }

  return (
    <AuthShell title="Choose a new password" intro={`Signed in as ${email}. Pick a new password to finish.`}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[#2D2F3A]">New password</span>
          <input type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH}
            value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[#2D2F3A]">Confirm new password</span>
          <input type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH}
            value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "Saving…" : "Save password and continue"}
        </button>
      </form>
    </AuthShell>
  );
}

