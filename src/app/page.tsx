import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";

interface Props {
  searchParams: Promise<{ code?: string; next?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const { code, next } = await searchParams;

  // Supabase sometimes sends the OAuth code to the Site URL instead of /auth/callback.
  // Forward it to the real handler so the session gets created properly.
  if (code) {
    const target = next ? `/auth/callback?code=${code}&next=${next}` : `/auth/callback?code=${code}`;
    redirect(target);
  }

  return <LandingPage />;
}
