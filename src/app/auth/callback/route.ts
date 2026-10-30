import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Only allow a same-origin relative path; anything else (e.g. "//evil.com", "@evil.com") falls back to /portal. */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/portal";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        // Roles and seats come from the database: the signup trigger applies
        // legacy_seat_assignments and leadership assigns seats in the portal.
        // The callback only keeps the Google name (when we have none) and
        // avatar fresh, for every account, not just internal ones.
        const meta = user.user_metadata ?? {};
        const fullName: string | null = meta.full_name || meta.name || null;
        const avatarUrl: string | null = meta.avatar_url || meta.picture || null;
        const admin = createAdminClient();

        const { data: existing } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (existing) {
          const patch: Record<string, unknown> = { avatar_url: avatarUrl };
          if (fullName && !existing.full_name) patch.full_name = fullName;
          await admin.from("profiles").update(patch).eq("id", user.id);
        } else {
          await admin
            .from("profiles")
            .upsert({ id: user.id, email: user.email, full_name: fullName ?? "", avatar_url: avatarUrl }, { onConflict: "id" });
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
