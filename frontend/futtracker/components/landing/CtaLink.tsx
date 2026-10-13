import Link from "next/link";
import type { ReactNode } from "react";

const VARIANTS = {
  primary: "bg-brand text-brand-foreground hover:bg-brand/90",
  secondary: "bg-white/10 text-panel-foreground hover:bg-white/15",
  navy: "bg-navy text-white hover:bg-navy/90",
};

type Props = {
  href: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
  children: ReactNode;
};

export default function CtaLink({
  href,
  variant = "primary",
  className = "",
  children,
}: Props) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
