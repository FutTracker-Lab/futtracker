// Meses en español, abreviados y en minúscula, tal como los pide el diseño
// de T04d ("feb 2025 – dic 2025"). No se usa `Intl.DateTimeFormat("es-AR",
// ...)` porque algunas implementaciones intercalan "de" ("feb. de 2025"),
// lo que no matchea el formato exacto pedido — una tabla fija es más
// predecible y no depende del runtime de ICU disponible.
const MONTH_ABBREVIATIONS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

// Misma trampa de timezone que `calculateAge` (ver lib/format/age.ts):
// `new Date("2025-02-01")` sobre un string date-only se interpreta en UTC, y
// en timezones con offset negativo (ART, UTC-3) muestra el mes anterior. Se
// parsea el string a mano, nunca se construye un Date desde él.
export function formatMonthYear(dateOnly: string): string {
  const [yearStr, monthStr] = dateOnly.split("-");
  const monthIndex = Number(monthStr) - 1;

  return `${MONTH_ABBREVIATIONS[monthIndex]} ${yearStr}`;
}

// Fecha completa de un partido para la tabla de "Partidos cargados"
// (FUT-92): "12 abr 2025", igual criterio de abreviaturas fijas que
// `formatMonthYear` y por el mismo motivo (Intl a veces intercala "de").
export function formatDayMonthYear(dateOnly: string): string {
  const [yearStr, monthStr, dayStr] = dateOnly.split("-");
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);

  return `${day} ${MONTH_ABBREVIATIONS[monthIndex]} ${yearStr}`;
}

// Requisito 3 de FUT-91: "feb 2025 – dic 2025", o "feb 2025 – Actualidad"
// cuando `is_current`. Si una entrada pasada quedara sin `end_date` (dato
// inconsistente, no debería pasar por la UI de carga de T06b), se muestra
// "—" en vez de "Actualidad" para no mentir sobre un paso que ya cerró.
export function formatCareerPeriod(
  startDate: string,
  endDate: string | null,
  isCurrent: boolean,
): string {
  const start = formatMonthYear(startDate);

  if (isCurrent) {
    return `${start} – Actualidad`;
  }

  const end = endDate ? formatMonthYear(endDate) : "—";

  return `${start} – ${end}`;
}
