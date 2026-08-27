"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { signOut } from "@/app/(auth)/actions";

export default function SignOutButton() {
  const t = useTranslations();
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
      className="text-sm font-medium text-zinc-600 hover:underline disabled:opacity-60 dark:text-zinc-400"
    >
      {t("auth.actions.signOut")}
    </button>
  );
}
