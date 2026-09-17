import Link from "next/link";

type Props = {
  isOwner: boolean;
  // FUT-92: antes deshabilitado con "La carga de etapas llega en la próxima
  // entrega." Ahora que la ruta existe, se cablea de verdad.
  addHref?: string;
};

// Requisito 6 de FUT-91: mensaje sin CTA para cualquier visitante que no sea
// el dueño; el dueño ve además el botón de alta.
export default function CareerTimelineEmptyState({ isOwner, addHref }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="text-sm font-medium text-zinc-900">
        {isOwner
          ? "Todavía no cargaste tu trayectoria"
          : "Este jugador todavía no cargó su trayectoria"}
      </p>
      <p className="max-w-sm text-sm text-zinc-500">
        {isOwner
          ? "Empezá por el club donde jugás ahora. Después podés sumar los anteriores."
          : "Cuando cargue sus clubes, van a aparecer acá."}
      </p>
      {isOwner && addHref ? (
        <Link
          href={addHref}
          className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          Agregar mi primer club
        </Link>
      ) : null}
    </div>
  );
}
