type Props = {
  isOwner: boolean;
};

// Requisito 6 de FUT-91: mensaje sin CTA para cualquier visitante que no sea
// el dueño; el dueño ve además el botón de alta.
//
// El botón va `disabled` y con el aviso al lado: la ruta de alta
// (`/jugadores/mi-perfil/trayectoria/nueva`) es de T06b y todavía no existe.
// Un <Link> mandaría al dueño a un 404 y un botón vivo que no hace nada se
// lee como un bug — deshabilitado se lee como "todavía no". T06b lo cablea
// cuando la ruta exista.
export default function CareerTimelineEmptyState({ isOwner }: Props) {
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
      {isOwner ? (
        <>
          <button
            type="button"
            disabled
            className="mt-2 cursor-not-allowed rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground opacity-50"
          >
            Agregar mi primer club
          </button>
          <p className="text-xs text-zinc-400">
            La carga de etapas llega en la próxima entrega.
          </p>
        </>
      ) : null}
    </div>
  );
}
