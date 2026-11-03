import type { ReactNode } from "react";

export default function FollowingFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Siguiendo</h1>
        {children}
      </div>
    </div>
  );
}
