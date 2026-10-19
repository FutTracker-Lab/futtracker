"use client";

import { useRef, useState, type ReactNode } from "react";

import VacancyForm from "@/components/team/VacancyForm";
import Toast from "@/components/ui/Toast";

export default function VacanciesCard({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  function closeForm() {
    setIsFormOpen(false);
    openButtonRef.current?.focus();
  }

  return (
    <section
      aria-labelledby="vacancies-title"
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="vacancies-title" className="text-base font-semibold text-zinc-900">
            Vacantes
          </h2>
          <p className="text-sm text-zinc-600">Una vacante por posición buscada.</p>
        </div>
        <button
          ref={openButtonRef}
          type="button"
          aria-expanded={isFormOpen}
          onClick={() => setIsFormOpen(true)}
          className="shrink-0 self-start rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Publicar vacante
        </button>
      </div>

      {children}

      {isFormOpen ? (
        <VacancyForm
          onCancel={closeForm}
          onPublished={() => {
            setPublishedAt(Date.now());
            closeForm();
          }}
        />
      ) : null}

      {publishedAt ? <Toast key={publishedAt} message="Vacante publicada." /> : null}
    </section>
  );
}
