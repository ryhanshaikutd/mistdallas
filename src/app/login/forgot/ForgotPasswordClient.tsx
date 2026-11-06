"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import AuthShell, { inputClass, primaryButtonClass } from "@/components/auth/AuthShell";
import { requestPasswordReset, type ForgotState } from "../actions";

export default function ForgotPasswordClient() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, { status: "idle" });

  const back = (
    <p className="mt-8 text-center text-sm">
      <Link href="/login" className="inline-flex items-center gap-1 text-[#2E7BC4] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </Link>
    </p>
  );

  if (state.status === "sent") {
    return (
      <AuthShell title="Check your email" intro="If that address has an account, a reset link is on its way. It expires in about an hour." footer={back}>
        <p className="text-sm text-gray-500">Nothing arrived? Check spam, or make sure you used the email your account was created with.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot your password?" intro="Enter the email on your account and we'll send you a link to choose a new one." footer={back}>
      <form action={formAction} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[#2D2F3A]">Email</span>
          <input name="email" type="email" autoComplete="email" required autoFocus className={inputClass}
            defaultValue={state.status === "error" ? state.email : ""} />
        </label>
        {state.status === "error" && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}
