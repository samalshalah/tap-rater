import type { FooterContent, HeaderNavigationContent } from "@/lib/website-content";

type NavigationContent = { header: HeaderNavigationContent; footer: FooterContent };
let pending: Promise<NavigationContent | null> | undefined;

// Share only concurrent reads. Later mounts can see newly saved navigation.
export function loadWebsiteNavigation(): Promise<NavigationContent | null> {
  if (!pending) {
    pending = fetch("/api/site/website-content")
      .then((response) => response.ok ? response.json() as Promise<NavigationContent> : null)
      .finally(() => { pending = undefined; });
  }
  return pending;
}
