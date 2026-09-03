// Helper de presentación puro, no de datos: deriva la edad de una fecha de
// nacimiento para mostrarla. No toca la base ni el schema (birth_date sigue
// siendo la única fuente de verdad, ver requisito 1 de FUT-87: "no se
// muestra la fecha, se publica solo la edad").
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
