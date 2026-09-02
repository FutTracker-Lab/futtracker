"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";

export default function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-sm font-medium text-zinc-600 hover:underline disabled:opacity-60"
    >
      Cerrar sesión
    </button>
  );
}
