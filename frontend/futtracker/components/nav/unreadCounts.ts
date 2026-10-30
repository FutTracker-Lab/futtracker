import { cache } from "react";

import type { UnreadCounts } from "@/components/nav/navItems";
import { listConversations } from "@/lib/data/messages";
import { countUnreadNotifications } from "@/lib/data/notifications";
import { createClient } from "@/lib/supabase/server";

// `cache`: AppShell y /notificaciones piden lo mismo en el mismo render. Si un
// conteo falla, ese badge no se muestra y la página sigue.
export const getUnreadCounts = cache(async (): Promise<UnreadCounts> => {
  const supabase = await createClient();
  const [notifications, messages] = await Promise.all([
    countUnreadNotifications(supabase).catch(() => 0),
    // No hay conteo global en la base: se suma el de cada conversación.
    listConversations(supabase)
      .then((conversations) => conversations.reduce((sum, c) => sum + c.unread_count, 0))
      .catch(() => 0),
  ]);

  return { notifications, messages };
});
