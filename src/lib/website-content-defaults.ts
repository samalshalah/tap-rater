import type { HeaderNavigationContent, FooterContent, FaqContent, HomepageThemeContent } from "./website-content";
import { multiLinkDemoImage } from "@/lib/marketing-images";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import { formatPrice } from "@/lib/products";
import { cafeHeroImage, defaultHomepageShowcase, googleStandardImage } from "@/lib/homepage-showcase";

export const defaultHeaderNavigation: HeaderNavigationContent = {
  items: [
    { label: "Home", href: "/", order: 5, enabled: true },
    { label: "Shop", href: "/shop", order: 10, enabled: true },
    { label: "Shop by Type", href: "/shop#stand-categories", order: 15, enabled: true },
    { label: "By Use", href: "/solutions", order: 20, enabled: true },
    { label: "How It Works", href: "/how-it-works", order: 30, enabled: true },
    { label: "Multi-Link", href: "/multi-link", order: 40, enabled: true },
    { label: "Resources", href: "/support", order: 60, enabled: true }
  ]
};

export const defaultFooterContent: FooterContent = {
  intro: "NFC tabletop stands for reviews, menus, booking, social media, feedback, and custom business links. Standard is NFC-only; Branded adds printed QR, your logo, and business name.",
  columns: [
    {
      label: "Shop",
      order: 10,
      links: [
        { label: "All Stands", href: "/shop", order: 10, enabled: true },
        { label: "Review Stands", href: "/category/reviews", order: 20, enabled: true },
        { label: "Menu Stands", href: "/category/menu", order: 30, enabled: true },
        { label: "Multi-Link Stand", href: "/category/website-link-stands", order: 40, enabled: true },
        { label: "Multi-Link", href: "/multi-link", order: 50, enabled: true }
      ]
    },
    {
      label: "Solutions",
      order: 20,
      links: [
        { label: "Automotive", href: "/solutions/automotive", order: 10, enabled: true },
        { label: "Restaurants", href: "/solutions/restaurant-food", order: 20, enabled: true },
        { label: "Healthcare", href: "/solutions/healthcare-dental", order: 30, enabled: true },
        { label: "Beauty & Wellness", href: "/solutions/beauty-salon-wellness", order: 40, enabled: true }
      ]
    },
    {
      label: "Resources",
      order: 30,
      links: [
        { label: "How It Works", href: "/how-it-works", order: 10, enabled: true },
        { label: "FAQ", href: "/faqs", order: 20, enabled: true },
        { label: "Support", href: "/support", order: 30, enabled: true },
        { label: "Contact", href: "/contact-us", order: 40, enabled: true }
      ]
    },
    {
      label: "Company",
      order: 40,
      links: [
        { label: "Terms", href: "/terms", order: 10, enabled: true },
        { label: "Privacy", href: "/privacy-policy", order: 20, enabled: true },
        { label: "Refund Policy", href: "/refund-policy", order: 30, enabled: true },
        { label: "Shipping", href: "/shipping", order: 40, enabled: true }
      ]
    }
  ]
};

export const defaultFaqContent: FaqContent = {
  items: [
    {
      question: "What can a Tap Rater stand open?",
      answer: "A Standard Direct stand opens one customer-provided destination URL by NFC tap, with no printed QR. That can be a review page, menu, booking page, survey, social profile, website, or custom URL. Branded adds a QR code generated from your destination, your logo, and business name.",
      area: "global",
      order: 10,
      enabled: true
    },
    {
      question: "Do Standard Direct stands require an account or subscription?",
      answer: "No. Standard Direct sends NFC taps directly to your provided URL and does not require a Tap Rater account, hosted redirect, activation, or subscription.",
      area: "global",
      order: 20,
      enabled: true
    },
    {
      question: "Can I add my logo or business name?",
      answer: "Branded stands include your logo, business name, and a QR code generated from your destination. Approve the artwork preview before payment. Final print artwork is generated after payment.",
      area: "global",
      order: 30,
      enabled: true
    },
    {
      question: "Where should I place the stand?",
      answer: "Place it where customers finish a useful interaction: checkout, front desk, pickup counter, table service, reception, or service desk.",
      area: "global",
      order: 40,
      enabled: true
    },
    {
      question: "Will it work with my customer's phone?",
      answer: "NFC tapping requires a compatible phone with NFC available. Hold the phone's NFC area near the stand and open the link notification. Antenna position and settings vary by phone. Branded stands also include a printed QR code. The destination may require its own app or sign-in.",
      area: "global", order: 50, enabled: true
    },
    {
      question: "How much is shipping?",
      answer: "Free shipping on US orders. No minimum. Any available international shipping rates and applicable tax are shown at checkout before payment. See our shipping page for current preparation and delivery estimates; contact us before ordering for a deadline.",
      area: "global", order: 60, enabled: true
    },
    {
      question: "How is my stand set up?",
      answer: "Add the destination URL when you order. Tap Rater prepares the stand for that link. Direct stands do not need a Tap Rater account or activation. Optional Multi-Link includes account setup so you can manage your hosted page after payment.",
      area: "global", order: 70, enabled: true
    }
  ]
};

export const defaultHomepageContent: HomepageThemeContent = {
  showcase: defaultHomepageShowcase,
  hero: {
    enabled: true,
    eyebrow: "NFC Business Stands",
    headline: "Tap Rater NFC Business Stands.",
    body: "Put reviews, menus, bookings, and social follows one tap away. A small stand for the moments your customers are ready to connect.",
    primaryCta: { label: "Shop Stands", href: "/shop" },
    secondaryCta: { label: "Customize Yours", href: "/custom-stands" },
    proofPoints: ["Direct stands: no subscription", "Branded: preview before payment"],
    image: { src: cafeHeroImage, alt: "Illustrative cafe scene with a Tap Rater Google Review stand and a phone showing a review form" }
  },
  actions: {
    enabled: true,
    eyebrow: "Shop by action",
    headline: "What would you like customers to do?",
    items: [
      {
        title: "Leave a review",
        description: "Open your review page.",
        href: "/category/reviews",
        image: { src: googleStandardImage, alt: "Google Review stand" },
        order: 10,
        enabled: true
      },
      {
        title: "View a menu",
        description: "Share your menu or ordering link.",
        href: "/category/menu",
        image: { src: "/uploads/products/taprater-text-stands/menu-and-order/menu-and-order-standard-angled.png", alt: "Menu and Order stand" },
        order: 20,
        enabled: true
      },
      {
        title: "Book an appointment",
        description: "Connect to your booking page.",
        href: "/product/connect-with-us-stand",
        image: { src: "/uploads/products/taprater-text-stands/connect-with-us/connect-with-us-standard-angled.png", alt: "Connect With Us stand for a booking link" },
        order: 30,
        enabled: true
      },
      {
        title: "Follow on social",
        description: "Make your social profile easy to find.",
        href: "/category/social-media",
        image: { src: "/uploads/products/taprater-text-stands/follow-us-on-social-media/follow-us-on-social-media-standard-angled.png", alt: "Follow Us on Social Media stand" },
        order: 40,
        enabled: true
      },
      {
        title: "Share feedback",
        description: "Hear about the customer experience.",
        href: "/product/rate-your-experience-stand",
        image: { src: "/uploads/products/taprater-text-stands/rate-your-experience/rate-your-experience-standard-angled.png", alt: "Rate Your Experience stand" },
        order: 50,
        enabled: true
      }
    ]
  },
  featuredUses: {
    enabled: true,
    eyebrow: "In your business",
    headline: "At the moments that matter.",
    businessUseSlugs: defaultHomepageShowcase.scenes.map((scene) => scene.slug)
  },
  multilink: {
    enabled: true,
    eyebrow: "Optional Multi-Link",
    headline: `One stand. Up to ${hostedMultiLinkServiceAddon.maxLinks} links.`,
    body: `Add an editable hosted page to a compatible stand for ${formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month per page, plus the physical stand price. Standard is NFC-only; Branded adds printed QR.`,
    cta: { label: "Explore Multi-Link", href: "/multi-link" },
    image: multiLinkDemoImage,
    bullets: ["Reviews", "Appointments", "Menu", "Social Media", "Website", "Contact"]
  },
  howItWorks: {
    enabled: true,
    eyebrow: "The customer experience",
    headline: "One tap opens your link.",
    steps: [
      { title: "Hold your phone near the stand", description: "Bring an NFC-compatible phone close to the contactless area.", icon: "shop", order: 10 },
      { title: "Open the notification", description: "Tap the link notification on your phone to open the destination.", icon: "link", order: 20 },
      { title: "Choose your next action", description: "Read the menu, book, follow, or write a review. Nothing is submitted automatically.", icon: "truck", order: 30 }
    ]
  },
  customBranding: {
    enabled: true,
    eyebrow: "Custom Branding",
    headline: "Standard or Branded?",
    body: "Add your business name, logo, and destination-generated QR with Branded. Approve the artwork preview before payment. Final print artwork is generated after payment.",
    cta: { label: "Shop Branded Stands", href: "/custom-stands" },
    image: { src: "/uploads/products/branded-demo-river-cafe-stand.png", alt: "Finished River Cafe branded Tap Rater stand demo with logo and QR code" },
    bullets: ["Your logo", "Your business", "Your destination", "Approve preview before payment"]
  },
  finalCta: {
    enabled: true,
    eyebrow: "Ready when you are",
    headline: "Find the stand for your business.",
    primaryCta: { label: "Shop Stands", href: "/shop" },
    secondaryCta: { label: "Custom or bulk orders? Let's talk", href: "/contact-us" }
  },
  faqs: defaultFaqContent
};
