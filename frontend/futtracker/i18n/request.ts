import { getRequestConfig } from "next-intl/server";

// Un solo catálogo, sin prefijo de locale en la URL (decisión 1.8 del doc de
// decisiones técnicas). `getRequestConfig` sigue siendo la forma que pide
// next-intl de exponer los mensajes tanto a Server como a Client Components,
// aunque el locale no varíe por request.
export default getRequestConfig(async () => {
  const locale = "es-AR";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
