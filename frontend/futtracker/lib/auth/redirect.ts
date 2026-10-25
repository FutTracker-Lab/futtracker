import { REDIRECT_BY_ROLE } from "@/lib/auth/constants";
import { roleSchema } from "@/lib/auth/schemas";

/**
 * Destinos después del login (FUT-136). La única regla que decide si se puede
 * mandar al usuario a un destino que vino de afuera: el `next` de
 * `/auth/callback` y el `redirectTo` del login. Los dos llegan en la URL, así
 * que cualquiera puede armar un link que los traiga.
 */

// Origen de mentira, solo para que `URL` resuelva el destino como lo haría el
// navegador. `.invalid` está reservado y no resuelve a nada.
const BASE = "http://futtracker.invalid";

// Barras invertidas, espacios y caracteres de control. El navegador trata `\`
// como `/` y descarta tabs y saltos de línea al armar una URL: `/\evil.com` y
// `/\t/evil.com` terminan siendo `//evil.com`.
const UNSAFE_CHARACTERS = /[\\\s\u0000-\u001f\u007f]/;

function isRelativePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\");
}

/**
 * El destino tal cual vino si es una ruta de la app, o `null` si no.
 *
 * Válido: empieza con una sola `/`, como `/jugadores?radio=50`. Se devuelve sin
 * tocar, con la ruta y la query (requisito 3).
 *
 * Inválido, todo lo demás: una URL con esquema (`https://…`, `javascript:…`),
 * una ruta de protocolo relativo (`//evil.com`), una barra invertida, espacios
 * o caracteres de control, y lo mismo escondido con codificación (`/%2F%2F…`):
 * se decodifica una vez más y se vuelve a chequear, porque quien arma el link
 * puede codificar dos veces.
 */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string" || !isRelativePath(value) || UNSAFE_CHARACTERS.test(value)) {
    return null;
  }

  let decoded: string;

  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Codificación rota (`%E0%A4%A`): no hay forma de saber adónde apunta.
    return null;
  }

  // Ya decodificado, un espacio puede ser legítimo (`?q=hola%20mundo`); lo que no
  // puede aparecer es el arranque de otro origen ni un caracter de control.
  if (!isRelativePath(decoded) || /[\u0000-\u001f\u007f]/.test(decoded)) {
    return null;
  }

  // Última red: resuelto como lo resolvería el navegador, tiene que quedar en
  // el mismo origen.
  if (new URL(value, BASE).origin !== BASE) {
    return null;
  }

  return value;
}

/**
 * El inicio según el rol: `/jugadores/mi-perfil` o `/equipos/mi-equipo`. Sin un
 * rol conocido, la portada.
 */
export function homeForRole(role: unknown): string {
  const parsed = roleSchema.safeParse(role);

  return parsed.success ? REDIRECT_BY_ROLE[parsed.data] : "/";
}
