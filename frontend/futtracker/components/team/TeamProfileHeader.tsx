import Image from "next/image";
import type { Team } from "@/lib/data/teams";

type Props = {
  team: Team;
  // El `full_name` del dueño: el requisito 1 pide mostrar la atribución
  // "Delegado" junto al nombre.
  ownerName: string | null;
  // URL firmada de 24 h generada en el servidor, nunca la URL directa del
  // bucket, que es privado.
  crestUrl: string | null;
};

export default function TeamProfileHeader({ team, ownerName, crestUrl }: Props) {
  return (
    <div className="flex items-center gap-4">
      {crestUrl ? (
        <Image
          src={crestUrl}
          alt={`Escudo de ${team.name}`}
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-md object-cover"
          // Bucket privado y URL firmada por 24 h: no tiene sentido que el
          // optimizador de Next la cachee más que eso.
          unoptimized
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-semibold text-brand-foreground"
        >
          Escudo
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-zinc-900">{team.name}</h1>
        {ownerName ? (
          <p className="text-sm text-zinc-500">Delegado: {ownerName}</p>
        ) : null}
      </div>
    </div>
  );
}
