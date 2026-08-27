import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import SignOutButton from "@/components/auth/SignOutButton";
import { createClient } from "@/lib/supabase/server";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Sin prefijo de locale en la URL (decisión 1.8): un solo catálogo, así
  // que `getMessages` no necesita un locale explícito por request.
  const messages = await getMessages();

  // Chequeo optimista de UX, igual que el de proxy.ts: solo decide si se
  // muestra el botón de cerrar sesión. La autorización real la hacen RLS y
  // los chequeos dentro de cada Server Action.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {user ? (
            <header className="flex justify-end border-b border-zinc-200 p-4 dark:border-zinc-800">
              <SignOutButton />
            </header>
          ) : null}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
