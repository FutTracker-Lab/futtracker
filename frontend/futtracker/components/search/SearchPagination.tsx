import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
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

export default function SearchPagination({ page, totalPages, hrefFor }: Props) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3">
      <PageControl
        label="Anterior"
        href={page > 1 ? hrefFor(page - 1) : null}
      />
      <PageControl
        label="Siguiente"
        href={page < totalPages ? hrefFor(page + 1) : null}
      />
    </nav>
  );
}
