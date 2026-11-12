// Caracteres de control bidireccional: U+202A a U+202E (embedding y override)
// y U+2066 a U+2069 (isolates). Cambian cómo se ve el texto que los sigue: con
// un U+202E, "gpj.exe" se lee "exe.jpg". El HTML ya sale escapado; esto cubre
// lo que el escape no toca (FUT-158).
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/g;

export function stripBidiControls(text: string): string {
  return text.replace(BIDI_CONTROLS, "");
}
