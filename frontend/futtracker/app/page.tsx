import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AudienceCards from "@/components/landing/AudienceCards";
import Benefits from "@/components/landing/Benefits";
import FinalCta from "@/components/landing/FinalCta";
import Hero from "@/components/landing/Hero";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingHeader from "@/components/landing/LandingHeader";
import { REDIRECT_BY_ROLE } from "@/lib/auth/constants";
import { roleSchema } from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "FutTracker — El fútbol amateur, con perfil propio",
  description:
    "Armá tu perfil, cargá tus partidos y dejá que los equipos de tu zona te encuentren.",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Mismo destino que el login (signIn en app/(auth)/actions.ts).
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = roleSchema.safeParse(profile?.role);

    redirect(REDIRECT_BY_ROLE[role.success ? role.data : "player"]);
  }

  return (
    <div className="flex flex-1 flex-col">
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <Benefits />
        <AudienceCards />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
