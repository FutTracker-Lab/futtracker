import { describe, expect, it } from "vitest";

import { NAV_ITEMS_BY_ROLE, isNavItemActive } from "@/components/nav/navItems";

const items = NAV_ITEMS_BY_ROLE.player;
const byLabel = (label: string) => {
  const item = items.find((candidate) => candidate.label === label);
  if (!item) throw new Error(`No existe la entrada de nav "${label}"`);
  return item;
};

// Qué entrada queda encendida para una ruta dada. Se prueba sobre el array
// real y no sobre fixtures: si alguien agrega una entrada que pisa a otra,
// estos casos lo levantan.
function activos(pathname: string): string[] {
  return items
    .filter((item) => isNavItemActive(item, pathname))
    .map((item) => item.label);
}

describe("isNavItemActive", () => {
  it("enciende la entrada cuyo href es exactamente el pathname", () => {
    expect(activos("/jugadores/mi-perfil")).toEqual(["Mi perfil"]);
    expect(activos("/jugadores/mi-perfil/editar")).toEqual(["Editar perfil"]);
    expect(activos("/jugadores/mi-perfil/trayectoria")).toEqual(["Trayectoria"]);
  });

  // El caso que motivó todo esto: el href del nav es un índice que redirige a
  // la etapa vigente, así que el pathname final nunca coincide con él y la
  // entrada quedaba apagada justo después de navegar.
  it("mantiene 'Partidos cargados' encendida después del redirect a la etapa", () => {
    expect(activos("/jugadores/mi-perfil/trayectoria/abc-123/partidos")).toEqual([
      "Partidos cargados",
    ]);
  });

  it("sigue encendida en el alta y la edición de un partido", () => {
    expect(
      activos("/jugadores/mi-perfil/trayectoria/abc-123/partidos/nuevo"),
    ).toEqual(["Partidos cargados"]);
    expect(
      activos("/jugadores/mi-perfil/trayectoria/abc-123/partidos/m-9/editar"),
    ).toEqual(["Partidos cargados"]);
  });

  it("deja 'Trayectoria' encendida en el alta y la edición de etapas", () => {
    expect(activos("/jugadores/mi-perfil/trayectoria/nueva")).toEqual([
      "Trayectoria",
    ]);
    expect(activos("/jugadores/mi-perfil/trayectoria/abc-123/editar")).toEqual([
      "Trayectoria",
    ]);
  });

  // Las rutas de partidos cuelgan de la trayectoria: sin el orden correcto,
  // las dos entradas se encenderían a la vez.
  it("nunca enciende dos entradas para el mismo pathname", () => {
    const rutas = [
      "/jugadores/mi-perfil",
      "/jugadores/mi-perfil/editar",
      "/jugadores/mi-perfil/trayectoria",
      "/jugadores/mi-perfil/trayectoria/nueva",
      "/jugadores/mi-perfil/trayectoria/abc-123/editar",
      "/jugadores/mi-perfil/trayectoria/partidos",
      "/jugadores/mi-perfil/trayectoria/abc-123/partidos",
      "/jugadores/mi-perfil/trayectoria/abc-123/partidos/nuevo",
    ];

    for (const ruta of rutas) {
      expect(activos(ruta), ruta).toHaveLength(1);
    }
  });

  it("no enciende nada en una ruta ajena al nav", () => {
    expect(activos("/equipos/mi-equipo")).toEqual([]);
    expect(byLabel("Mi perfil").activeOn).toBeUndefined();
  });
});
