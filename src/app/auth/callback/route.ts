import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INTERNAL_EMAIL_DOMAIN } from "@/lib/constants";

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
          // Sync Google profile data (name + avatar) on every login
          const meta = user.user_metadata ?? {};
          const fullName = meta.full_name || meta.name || null;
          const avatarUrl = meta.avatar_url || meta.picture || null;
          await supabase
            .from("profiles")
            .upsert(
              { id: user.id, email: user.email, full_name: fullName, avatar_url: avatarUrl },
              { onConflict: "id", ignoreDuplicates: false }
            );
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
