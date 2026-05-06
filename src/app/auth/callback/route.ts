import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { INTERNAL_EMAIL_DOMAIN } from "@/lib/constants";
import type { UserRole } from "@/lib/types/index";

// Pre-assigned roles for board leaders — matched on first sign-in
const ROLE_MAP: Record<string, UserRole> = {
  "rshaik@getmistified.com":    "external_ad",
  "fhafeez@getmistified.com":   "internal_ad",
  "sdin@getmistified.com":      "regional_director",
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Detect internal vs external from email domain
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const isInternal = user.email.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
        if (isInternal) {
          const meta = user.user_metadata ?? {};
          const fullName = meta.full_name || meta.name || null;
          const avatarUrl = meta.avatar_url || meta.picture || null;
          const preAssignedRole = ROLE_MAP[user.email.toLowerCase()] ?? null;

          // Use admin client so RLS never blocks the upsert
          const admin = createAdminClient();

          // Upsert the profile — set role only on first insert (ignoreDuplicates: false
          // means we always sync name/avatar, but we don't overwrite a role someone
          // already has unless they're in the ROLE_MAP)
          const { data: existingProfile } = await admin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          const upsertData: Record<string, unknown> = {
            id: user.id,
            email: user.email,
            full_name: fullName,
            avatar_url: avatarUrl,
          };

          // Only set role if pre-assigned and profile has no role yet
          if (preAssignedRole && !existingProfile?.role) {
            upsertData.role = preAssignedRole;
          }

          await admin
            .from("profiles")
            .upsert(upsertData, { onConflict: "id", ignoreDuplicates: false });
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
