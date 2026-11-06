import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/login/next-path";
import { RESET_PASSWORD_PATH } from "@/lib/login/password-reset";

/**
 * Lands email links the app sends itself (today: password reset). Exchanges
 * the hashed token for a session, then forwards to `next`. A used or expired
 * link goes back to the sign-in page with an explanation.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"), type === "recovery" ? RESET_PASSWORD_PATH : "/portal");

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link_invalid`);
}
