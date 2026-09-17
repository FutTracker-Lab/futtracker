// Formato es-AR (coma decimal) para "goles por partido" (requisito 12 de
// FUT-92, criterio de aceptación: 20 goles en 40 partidos → "0,50").
//
// A diferencia de `formatMonthYear` (lib/format/dates.ts), acá no hay
// nombres de mes de por medio ni la trampa de la librería agregando "de", así
// que `Intl.NumberFormat` es seguro y no hace falta una tabla a mano.
const GOALS_PER_MATCH_FORMATTER = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGoalsPerMatch(value: number | null | undefined): string {
  return GOALS_PER_MATCH_FORMATTER.format(value ?? 0);
}

const INTEGER_FORMATTER = new Intl.NumberFormat("es-AR");

// Partidos, goles, asistencias: enteros, pero igual con el locale activo para
// que un total de 4 dígitos lleve el separador de miles correcto si alguna
// vez pasa de 999.
export function formatInteger(value: number | null | undefined): string {
  return INTEGER_FORMATTER.format(value ?? 0);
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function formatCount(
  count: number | null | undefined,
  singular: string,
  plural: string,
): string {
  const value = count ?? 0;
  return `${formatInteger(value)} ${pluralize(value, singular, plural)}`;
}
