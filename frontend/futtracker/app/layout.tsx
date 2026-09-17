import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FutTracker",
  description: "Seguimiento de jugadores y equipos de fútbol amateur.",
};

// El sidebar de navegación no vive acá: por ahora solo existe para las
// pantallas de /jugadores (ver app/jugadores/layout.tsx). No hay nada que
// mostrar todavía en "/" ni en /login, así que el layout raíz se mantiene
// sin chrome propio — cada sección de la app decide el suyo.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">{children}</body>
    </html>
  );
}
