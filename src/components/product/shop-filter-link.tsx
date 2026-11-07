"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

type ShopFilterLinkProps = {
  active: boolean;
  count: number;
  href: string;
  label: string;
  className: string;
  countClassName: string;
};

/**
 * Filter results are rendered on the server so their URLs remain shareable and
 * indexable. Prefetch on intent prevents that server request from becoming a
 * visible pause when a shopper selects a filter.
 */
export function ShopFilterLink({
  active,
  count,
  href,
  label,
  className,
  countClassName,
}: ShopFilterLinkProps) {
  const router = useRouter();
  const prefetch = useCallback(() => {
    router.prefetch(href);
  }, [href, router]);

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "true" : undefined}
      className={className}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
    >
      <span className="min-w-0">{label}</span>
      <span className={countClassName}>{count}</span>
    </Link>
  );
}
