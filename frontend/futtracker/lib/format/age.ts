// Helper de presentación puro, no de datos: deriva la edad de una fecha de
// nacimiento para mostrarla. No toca la base ni el schema (birth_date sigue
// siendo la única fuente de verdad, ver requisito 1 de FUT-87: "no se
// muestra la fecha, se publica solo la edad").
//
// Bug de review en PR #9: `new Date(birthDate)` sobre un string date-only
// ("2001-03-01") lo parsea como UTC medianoche, pero comparar mes/día contra
// `today` con getters locales (getMonth/getDate) desalinea las dos fechas en
// timezones con offset negativo (ej. ART, UTC-3) el día antes del cumpleaños.
// Se evita construyendo un Date solo para "hoy" y comparando contra los
// componentes de la fecha de nacimiento parseados a mano, nunca contra un
// Date derivado del string.
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;

  const [yearStr, monthStr, dayStr] = birthDate.split("-");
  const birthYear = Number(yearStr);
  const birthMonth = Number(monthStr); // 1-12
  const birthDay = Number(dayStr);

  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const monthDiff = today.getMonth() + 1 - birthMonth;

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
    age--;
  }

  return age;
}
