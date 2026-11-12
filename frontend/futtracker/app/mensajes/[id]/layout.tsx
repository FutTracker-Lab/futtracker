import { notFound } from "next/navigation";

import { getThread } from "@/app/mensajes/access";

// El 404 va acá y no en page.tsx (requisito 4): page.tsx está dentro del
// Suspense de loading.tsx, y un `notFound()` ahí adentro sale con status 200
// porque la respuesta ya empezó a mandarse. Mismo motivo que en /vacantes.
export default async function ThreadLayout({ children, params }: LayoutProps<"/mensajes/[id]">) {
  const { id } = await params;

  if (!(await getThread(id))) {
    notFound();
  }

  return children;
}
