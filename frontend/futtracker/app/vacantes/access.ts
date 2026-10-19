import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type VacanciesAccess = "player" | "signedOut" | "notPlayer" | "unavailable";

// Sin getProfileById: devuelve null también si la consulta falla, y una caída no es un 404.
export const getVacanciesAccess = cache(async (): Promise<VacanciesAccess> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "signedOut";
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return "unavailable";
  }

  return data?.role === "player" ? "player" : "notPlayer";
});
