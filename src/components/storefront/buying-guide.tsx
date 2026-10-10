import Link from "next/link";

import { SectionShell } from "@/components/storefront/section";

const categories: Record<string, [string, string, string]> = {
  reviews: [
    "Choose a review stand for the right destination",
    "Use a review stand at a checkout counter or reception desk to make your existing business profile easier to find. Choose the platform your customers use and supply the destination for the correct business location. A stand opens that link; it does not create a review or guarantee a rating.",
    "Standard uses NFC only. Choose Branded when you want your logo, business name and a printed QR code for customers who prefer scanning. Test the destination before ordering, especially if your business has more than one location. Follow the destination platform’s rules for requesting reviews.",
  ],

  "social-media": [
    "Turn an in-person visit into a social connection",
    "Place a social stand where customers already pause: a checkout counter, reception desk or event table. Select the profile you maintain most actively, whether it is Instagram, Facebook, TikTok or another supported destination. The stand opens your profile; visitors choose whether to follow.",
    "Use a public profile URL and check it on a phone before ordering. Standard gives you an NFC tap. Branded adds your logo, business name and a printed QR. If you need several destinations, compare the optional hosted Multi-Link service instead of choosing one profile.",
  ],

  appointments: [
    "Make the next appointment easier to find",
    "An appointment stand opens your existing booking or reservation page. Place it beside a reception desk or checkout point so a customer can check availability while the visit is fresh. Use the booking link for the correct location or service provider.",
    "Your booking provider still handles availability, payments, confirmations and changes. Tap Rater supplies the physical stand and its destination link. Standard is NFC-only; Branded adds your business identity and a printed QR code. Test the mobile booking flow before submitting your link.",
  ],

  menu: [
    "Bring your menu or ordering page to the counter",
    "Give guests a direct route to a mobile-friendly menu, service list or ordering page. A stand works well near the host desk, ordering counter or pickup area. Choose a stable destination URL so updates to content at that address do not require a different printed design.",
    "Standard lets customers tap NFC; Branded also provides a QR code. Orders and payments stay with your existing website or ordering provider. For a menu, reservations and social profiles on one editable page, compare the optional hosted Multi-Link service.",
  ],

  feedback: [
    "Give customers a clear route to feedback",
    "Connect a feedback stand to an existing survey or feedback form. Place it where customers can respond comfortably after their visit. Keep the destination easy to use on a phone and explain what feedback you are asking for.",
    "The form provider manages responses and any information customers submit. Tap Rater opens the link you supply. Standard is NFC-only; Branded adds your logo, business name and QR code. Use a general feedback form rather than a link tied to one customer or session.",
  ],

  "website-links": [
    "Choose one destination or an editable link page",
    "A direct stand sends visitors to one URL, such as your website, service list or contact page. It is a one-time physical product purchase. Choose a stable, public address and test how it appears on a phone before ordering.",
    "When customers need several choices, optional hosted Multi-Link provides an editable Tap Rater page with up to 10 links and a separate monthly charge. Standard direct stands are NFC-only. Branded adds your logo, business name and a destination QR code.",
  ],
};

const uses: Record<string, [string, string, string]> = {
  automotive: [
    "Useful links at the service counter",
    "Help drivers reach your business profile, service information or booking page while they are at the reception or pickup desk. Choose a destination for the specific branch so visitors do not land on another location’s page.",
    "A review stand suits a completed visit; an appointment stand can point to your service booking system. Use separate stands when those actions need different destinations, or compare Multi-Link for one page containing several choices.",
  ],

  "restaurant-food": [
    "Menus, reservations and reviews at the right moment",
    "Place a menu or ordering stand near the counter or pickup area. A reservation link belongs near the host desk, while a review destination can be available as guests finish their visit. Keep the chosen page readable on a phone.",
    "Your existing restaurant tools continue to manage orders, reservations and payments. A direct stand opens one destination. For a menu, booking link and social profile together, an optional Multi-Link page provides a choice of destinations.",
  ],

  "hotel-travel": [
    "Help guests find useful information",
    "Use the front desk or concierge area to connect guests to property information, local guidance, a booking page or a public review profile. For more than one property, confirm that the destination matches the location printed or represented on the stand.",
    "Choose a guest-information link for arrival and a review profile for guests who want to share their experience. Branded stands add a logo, business name and QR code. Standard provides NFC without a printed QR.",
  ],

  "healthcare-dental": [
    "Make public practice information easier to reach",
    "Connect a reception stand to your public practice website, patient resources or appointment page. Select the right practice location and check that visitors can understand the destination without staff explaining the link.",
    "The stand opens a website; it does not provide a patient portal or store appointment information. Keep clinical or personal information within your existing secure systems. A branded design adds your practice identity and a QR code alongside NFC.",
  ],

  "home-services": [
    "Connect customers with your service business",
    "At a showroom, service desk or trade event, a stand can open your service area information, portfolio or enquiry form. Use a stable business URL rather than a temporary quote or a link containing a customer’s details.",
    "Choose a review profile when that is the action you want to make available, or a website stand for broader service information. A direct stand opens one destination without a hosted subscription. Multi-Link is optional for several links.",
  ],

  legal: [
    "Public firm information at reception",
    "Use a reception stand to open a firm website, public attorney profile or consultation booking page. Check the destination for the correct office and make sure the page explains what visitors can do next.",
    "The stand does not provide legal advice or a confidential intake system; those remain with your existing website and tools. Branded adds your firm’s name, logo and a QR code. Standard uses NFC only.",
  ],

  "real-estate": [
    "Connect visitors to your public property resources",
    "At an office desk or open house, make it easy to reach an agent profile, website or public property information page. For changing inventory, a stable page on your own website can remain useful as the content changes.",
    "A direct stand opens one URL. If visitors need listings, contact details and social profiles together, compare the optional editable Multi-Link page. Test the link on a phone and avoid destinations that only work in your own signed-in account.",
  ],

  "beauty-salon-wellness": [
    "Help clients find their next booking",
    "Place a booking stand at reception or checkout to open your existing appointment page. A social stand can point clients to a portfolio of your work, while a review stand makes a public business profile easier to reach.",
    "Choose the right salon location and provider link before ordering. Your booking platform continues to manage appointment times and payments. Use Branded for your logo, business name and QR code, or Standard for NFC only.",
  ],

  "ecommerce-online-brand": [
    "Bring your online brand to an in-person event",
    "At markets, pop-ups and showroom counters, a stand can take visitors to your store, product collection or social profile. Choose a destination that is useful beyond a single temporary promotion whenever possible.",
    "Tap Rater opens your link; checkout, fulfilment and customer data remain with your existing store. A Multi-Link page can offer several destinations for a separate monthly charge. Branded adds a logo and QR; Standard uses NFC only.",
  ],

  "retail-local-business": [
    "Choose a clear action for each counter",
    "Use a stand to connect shoppers with a review profile, store website, social account or service information. Place it where a customer can see and reach it without interrupting checkout.",
    "For multiple counters, compare stand bundles and mix products to match each location’s purpose. Confirm each business destination before ordering. Direct stands need no hosted subscription; optional Multi-Link is useful when one stand should offer several choices.",
  ],
};

export function BuyingGuide({
  slug,
  kind,
}: {
  slug: string;
  kind: "category" | "solution";
}) {
  const copy = (kind === "category" ? categories : uses)[
    slug === "website-link-stands" ? "website-links" : slug
  ];

  if (!copy) return null;

  return (
    <SectionShell spacing="compact">
      <div className="tr-container-narrow">
        <h2 className="tr-section-title">{copy[0]}</h2>

        <p className="tr-body mt-4">{copy[1]}</p>
        <p className="tr-body mt-4">{copy[2]}</p>

        <nav
          aria-label="Buying guidance"
          className="mt-6 flex flex-wrap gap-5 text-brand underline"
        >
          <Link href="/how-it-works">How NFC stands work</Link>
          <Link href="/pricing">Compare designs and pricing</Link>
          <Link href="/stand-bundles">Stands for multiple counters</Link>
          <Link href="/multi-link">Explore Multi-Link</Link>
          {kind === "category" && slug === "reviews" ? <>
            <Link href="/product/google-review-stand">Google Review Stand</Link>
            <Link href="/product/yelp-review-stand">Yelp Review Stand</Link>
            <Link href="/product/facebook-review-stand">Facebook Review Stand</Link>
          </> : null}
          {kind === "category" && slug === "social-media" ? <>
            <Link href="/product/instagram-follow-stand">Instagram Follow Stand</Link>
            <Link href="/product/follow-us-social-media-stand">One stand for your social profiles</Link>
          </> : null}
        </nav>
      </div>
    </SectionShell>
  );
}
