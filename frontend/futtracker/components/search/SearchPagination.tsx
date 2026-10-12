import Link from "next/link";

import { searchHref, type SearchCriteria } from "@/lib/search/params";

type Props = {
  filters: SearchCriteria;
  totalPages: number;
};

const LINK_CLASS =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

const DISABLED_CLASS =
  "cursor-not-allowed rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-400";

function PageControl({ label, href }: { label: string; href: string | null }) {
  if (!href) {
    return (
      <span aria-disabled="true" className={DISABLED_CLASS}>
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={LINK_CLASS}>
      {label}
    </Link>
  );
}

export default function SearchPagination({ filters, totalPages }: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const { page } = filters;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
      <PageControl
        label="Anterior"
        href={page > 1 ? searchHref(filters, page - 1) : null}
      />
      <PageControl
        label="Siguiente"
        href={page < totalPages ? searchHref(filters, page + 1) : null}
      />
    </nav>
  );
}
