"use client";

import { useState, useTransition, type ReactNode } from "react";

import type { NotificationActionResult } from "@/app/notificaciones/actions";
import Toast from "@/components/ui/Toast";
import { NOTIFICATION_ERROR_TEXT } from "@/lib/format/notificationLabels";

type Props = {
  action: () => Promise<NotificationActionResult>;
  className: string;
  children: ReactNode;
};

export default function NotificationActionButton({ action, className, children }: Props) {
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      let result: NotificationActionResult | undefined;

      try {
        result = await action();
      } catch {
        // La red o el servidor: sin esto, el error iría al error.tsx de toda la página.
        result = { ok: false, error: "generic" };
      }

      // Si redirige, no vuelve: Next navega al destino.
      if (result && !result.ok) {
        setFailedAt(Date.now());
      }
    });
  }

  return (
    <>
      <button type="button" onClick={run} disabled={isPending} className={className}>
        {children}
      </button>
      {failedAt ? <Toast key={failedAt} message={NOTIFICATION_ERROR_TEXT} tone="error" /> : null}
    </>
  );
}
