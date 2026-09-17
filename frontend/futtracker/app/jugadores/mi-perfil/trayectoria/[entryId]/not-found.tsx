export default function CareerEntryNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">
        No encontramos esa etapa
      </h1>
      <p className="text-sm text-zinc-500">
        La etapa que buscás no existe o no te pertenece.
      </p>
    </div>
  );
}
