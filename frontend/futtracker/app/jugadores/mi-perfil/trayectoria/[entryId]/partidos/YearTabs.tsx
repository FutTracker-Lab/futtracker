// Movido a `trayectoria/YearTabs.tsx`: un import con un segmento `[entryId]`
// en el path funciona, pero el resto del repo no tiene ningún precedente de
// importar módulos desde una carpeta de ruta dinámica, y no vale la pena ser
// el primero. Este archivo queda como reexport para no dejar un import roto
// si algo lo referenciaba desde afuera del árbol de esta feature.
export { default } from "@/app/jugadores/mi-perfil/trayectoria/YearTabs";
