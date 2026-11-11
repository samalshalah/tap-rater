import Link from "next/link";
import { catalogCategories } from "@/data/migrated-products";
import { getCategoryHref } from "@/lib/category-routes";

export const shopByTypeHref = "/shop#stand-types";

const standTypeLinks = catalogCategories
  .filter(({ slug }) => slug !== "custom-stands")
  .map(({ slug, title }) => ({
    href: getCategoryHref(slug),
    label: slug === "reviews" ? "NFC Review Stands" : title
  }));

export function isStandTypePath(pathname: string) {
  return standTypeLinks.some(({ href }) => href === pathname);
}

export function StandTypeLinks({ pathname, className, onNavigate }: {
  pathname: string;
  className?: string;
  onNavigate: () => void;
}) {
  return (
    <ul className={className}>
      {standTypeLinks.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            prefetch={false}
            onClick={onNavigate}
            aria-current={href === pathname ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-semibold text-ink hover:bg-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${href === pathname ? "bg-panel text-brand" : ""}`}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
