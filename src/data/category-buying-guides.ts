import type { CatalogCategorySlug } from "@/data/migrated-products";

type Faq = { question: string; answer: string };
export type CategoryBuyingGuide = {
  heading: string;
  introduction: string;
  decision: string;
  options: { slug: string; purpose: string; consideration: string }[];
  setupHeading: string;
  setup: string;
  placement: string;
  related: { href: string; label: string }[];
  faqs: Faq[];
};

export const categoryBuyingGuides: Record<CatalogCategorySlug, CategoryBuyingGuide> = {
  reviews: {
    heading: "Choose a review stand for the platform your customers use",
    introduction: "A review stand connects a physical visit to an existing online business destination. Start with the profile you want customers to find, then select the design that matches that platform. The most useful choice is the one associated with the correct business and location, rather than simply the platform with the most recognizable logo.",
    decision: "For a business with several branches, check each location's destination separately. For a specialist business, such as a dealership or hotel, inspect the exact public page before buying. Some platforms connect review eligibility to an account or completed transaction. A stand opens a link; it does not create that eligibility, submit feedback, or guarantee a rating.",
    options: [
      { slug: "google-review-stand", purpose: "Make a location's Google review form easy to reach.", consideration: "Confirm the business name and address for each branch." },
      { slug: "yelp-review-stand", purpose: "Help visitors discover your Yelp business page.", consideration: "Use a profile-discovery prompt; Yelp says businesses should not ask for reviews." },
      { slug: "tripadvisor-review-stand", purpose: "Connect guests to a travel or hospitality listing.", consideration: "Check whether the hotel, restaurant, and attraction have separate pages." }
    ],
    setupHeading: "Prepare the right review destination",
    setup: "Open your chosen URL on a phone outside your business administrator account. Verify the public business identity and follow the link far enough to understand what the customer sees. If your platform provides a review link, use the appropriate location-specific destination. Keep private account pages and individual invitation links off a stand shared by all visitors.",
    placement: "Place the stand where a visit naturally ends: a checkout counter, reception desk, or collection point. Leave room to approach the NFC area with a phone. Where review requests are permitted, invite honest feedback consistently without rewards or selecting only happy customers. For Yelp, present the stand as a way to find the business page instead.",
    related: [{ href: "/review-links-generator", label: "Find your Google review link" }, { href: "/solutions/restaurant-food", label: "Review stands for restaurants" }, { href: "/solutions/automotive", label: "Stands for dealerships and repair shops" }],
    faqs: [
      { question: "Does a review stand automatically post a review?", answer: "No. It opens the destination on the customer's phone. The customer decides whether to sign in, write feedback, choose a rating, and submit it through the platform's own process." },
      { question: "Which review stand should I choose for several locations?", answer: "Choose the platform your business uses, then supply the correct URL for each location. Identical designs can use different destinations. Test each branch's link rather than assuming a company-wide page will direct customers to the right office." },
      { question: "Do all review stands include a printed QR code?", answer: "Every custom stand includes NFC, your logo, business name, and a QR code generated from the destination. Review the artwork preview before payment." },
      { question: "Can the stand guarantee five-star reviews?", answer: "No. It makes a destination easier to access. Customers control their feedback, and the platform controls publication. Choose this product for convenient access, not a promised rating or search position." },
      { question: "Should I use a public review page or a private survey?", answer: "Choose a review stand when your purpose is access to a public platform. For comments sent through your own survey, compare Feedback Stands. The destination and printed invitation should clearly explain what customers are opening." }
    ]
  },
  "social-media": {
    heading: "Choose a social stand around the connection you want",
    introduction: "Social media stands bring your online presence into a shop, studio, reception area, or event. Choose the account you actively maintain and the action visitors expect: exploring photos, watching videos, following business updates, or finding a professional contact. A recognizable profile and useful content give people a reason to stay connected after the tap.",
    decision: "One direct profile keeps the next step simple. A link hub suits a business that wants visitors to choose between several active channels. Avoid presenting a long list of rarely updated accounts. If the display represents a company, use a company destination; an individual's networking table may be better served by a personal professional profile.",
    options: [
      { slug: "instagram-follow-stand", purpose: "Share visual work, products, or finished results.", consideration: "Use a stable public profile rather than a temporary post." },
      { slug: "youtube-follow-stand", purpose: "Help customers find demonstrations and tutorials.", consideration: "Choose a channel for discovery or a public playlist for one topic." },
      { slug: "follow-us-social-media-stand", purpose: "Offer a broader invitation to your social presence.", consideration: "Supply one profile or a suitable link hub with clear choices." }
    ],
    setupHeading: "Make your account easy to recognize",
    setup: "Check your public username, profile image, and business name before submitting the destination. Open it on another phone or while signed out to see any browser, app, or sign-in steps. Use a link that remains relevant after a campaign ends. For an event, verify the account represents the team or professional actually attending.",
    placement: "Set the stand where the reason to follow is visible: beside a product display, near a salon's finished-look area, or on an event table. Keep the invitation focused and leave room for a phone. Branded designs can connect the physical display to your logo and business name, while a printed QR gives visitors a camera-scanning option.",
    related: [{ href: "/multi-link", label: "Compare a hosted social link page" }, { href: "/solutions/beauty-salon-wellness", label: "Social stands for salons" }, { href: "/solutions/retail-local-business", label: "Stands for retail counters" }],
    faqs: [
      { question: "Does tapping automatically follow my account?", answer: "No. A tap opens your destination. Visitors decide whether to sign in, follow, subscribe, or send a connection request using the options provided by that platform." },
      { question: "Can one stand show several social profiles?", answer: "A direct stand opens one URL, which can be a public link hub you already maintain. Eligible products also offer optional hosted Multi-Link. The visitor selects a destination from the page rather than opening every profile at once." },
      { question: "Should I link to a profile or a specific post?", answer: "A profile is usually more useful for an ongoing follow invitation. A post can suit a temporary promotion, but plan what happens when the campaign finishes. The stand keeps opening its configured destination." },
      { question: "Do visitors need to install a Tap Rater app?", answer: "They do not need a Tap Rater app to open the link. NFC requires a compatible phone; a printed QR is available with Branded designs where offered. The destination platform may require its own sign-in or app for particular actions." },
      { question: "Can our team share one social stand at events?", answer: "Yes, when the destination represents the whole team. Use a company account for a shared display and an individual profile for personal networking. Check the printed identity and destination before reusing the stand at another event." }
    ]
  },
  appointments: {
    heading: "Choose a booking stand that fits your appointment journey",
    introduction: "An appointment stand makes your existing scheduling destination easier to reach at reception or checkout. Start with the service your customer needs next, then choose whether the destination should show a provider, a branch, or a general booking menu. A useful booking page explains the available services before asking someone to select a time.",
    decision: "For a practice with several clinicians or a salon with independent professionals, avoid sending everyone to the wrong calendar. A direct booking URL works well for one clear next step. If visitors need to compare services first, a service-information destination may be a better starting point than an immediate time-slot picker.",
    options: [
      { slug: "connect-with-us-stand", purpose: "Open an existing appointment or scheduling page.", consideration: "Match the destination to the correct provider and location." },
      { slug: "explore-our-services-stand", purpose: "Explain options before customers choose a service.", consideration: "Useful when price, duration, or preparation needs explaining first." }
    ],
    setupHeading: "Test the customer booking journey",
    setup: "Use a public booking URL rather than a staff calendar or a link to an existing customer's appointment. Test the page on mobile through choosing a service and viewing availability. Confirm that the correct branch, provider, time zone, and contact details appear. Review any deposit or cancellation information within the booking provider's own flow.",
    placement: "Place the stand where staff discuss the next visit, such as reception checkout or a consultation desk. Customers should have space to check dates without blocking the queue. Keep a provider-specific stand close to that provider's service area. At a restaurant, a reservation destination belongs where guests discuss returning, rather than beside a prompt to order today's meal.",
    related: [{ href: "/solutions/beauty-salon-wellness", label: "Rebooking at salons and spas" }, { href: "/solutions/healthcare-dental", label: "Stands for practice reception" }, { href: "/category/website-link-stands", label: "Compare service-information stands" }],
    faqs: [
      { question: "Is appointment software included with the stand?", answer: "No. The stand opens your existing booking destination. Your provider manages availability, confirmations, reminders, payments, and cancellations. Choose a page that already supports the scheduling workflow you need." },
      { question: "Can I use my current booking provider?", answer: "Use a working customer-facing booking URL and test it on a phone before ordering. Check that visitors can select the intended service without using your administrator account. The stand does not require you to move your calendar into Tap Rater." },
      { question: "Can a stand book an appointment automatically?", answer: "No. Customers choose a service and time and complete any required steps on the booking page. Opening the link does not reserve a slot or submit their details." },
      { question: "Do different practitioners need different stands?", answer: "Separate stands are useful when each practitioner has a different booking URL. A shared destination can work when it clearly lets customers select the right provider. Choose based on how your reception desk actually serves visitors." },
      { question: "Will the stand show newly available appointments?", answer: "It opens the configured booking page, so availability comes from your scheduling provider. Updates made at the same URL can appear without changing the physical stand; changing the destination address is a separate setup matter." }
    ]
  },
  menu: {
    heading: "Choose between browsing a menu and placing an order",
    introduction: "Menu stands connect tables, counters, and waiting areas to a menu guests can read on their phones. Decide whether you want people to browse food and drinks or complete an order. A readable menu page suits table service, while a customer-facing ordering page needs the right branch, collection method, and payment flow.",
    decision: "Use a stable URL when dishes, prices, or opening hours change frequently. Updating content at that address can keep the stand useful across seasonal menus. For several restaurants or table-specific ordering, check how your existing system identifies the location. A general NFC link does not automatically know which table a guest is sitting at.",
    options: [
      { slug: "menu-and-order-stand", purpose: "Connect guests to a menu or online ordering journey.", consideration: "Check branch selection, pickup choices, and checkout before launch." }
    ],
    setupHeading: "Prepare a menu guests can use on a phone",
    setup: "Open the supplied menu URL on a small screen and check headings, prices, and navigation. A website menu should be easy to browse without zooming; a document should remain readable and publicly accessible. For ordering, test the customer journey through selecting items and confirming the restaurant, without using a private basket or staff dashboard link.",
    placement: "Put the stand where guests decide what to order: a table, bar seating area, takeaway counter, or pickup waiting zone. Keep the face reachable and away from spills. If the system requires a table number or location selection, provide clear instructions beside the stand. Use separate displays when a host desk needs a reservation link rather than today's menu.",
    related: [{ href: "/solutions/restaurant-food", label: "Plan stands for your restaurant" }, { href: "/stand-bundles", label: "Stands for multiple tables and counters" }, { href: "/multi-link", label: "Combine menu and other useful links" }],
    faqs: [
      { question: "Does a menu stand include online ordering software?", answer: "No. It opens your existing menu or ordering destination. Your website or provider handles items, payments, order routing, and kitchen notifications. Check that those features work before connecting the stand." },
      { question: "Can I update prices without replacing the stand?", answer: "Yes, if you update the menu content at the same URL. Keep the public address stable when replacing documents or publishing seasonal menus. If the address changes, check the stand's destination setup before relying on the new page." },
      { question: "Can the stand tell our system which table ordered?", answer: "A direct stand opens its configured URL. Table identification must come from your ordering system, such as a table-specific URL or a customer selection. Test that workflow rather than assuming a tap supplies the table number." },
      { question: "Can customers tap or scan?", answer: "Every custom stand includes NFC and a printed QR alongside your logo and business name, giving guests a camera-scanning option. Both open your approved destination." },
      { question: "Can I show breakfast and dinner menus on one stand?", answer: "Yes. Link to one page that clearly presents both menus and their service times. The stand opens that page; your website determines which menu information is shown and how guests move between sections." }
    ]
  },
  feedback: {
    heading: "Choose a feedback destination that produces useful responses",
    introduction: "Feedback stands give customers a clear way to open your survey or feedback form after a visit. Begin with the question your business needs answered: service experience, a recent event, or a specific part of the customer journey. A short, understandable form is easier to complete than a long questionnaire unrelated to the visit.",
    decision: "Decide whether responses should go privately to your team or be submitted to a public review platform. Those are different destinations and should have different invitations. For private feedback, check who receives submissions and how your team follows up. A physical stand makes the form accessible; it does not replace your response process.",
    options: [
      { slug: "rate-your-experience-stand", purpose: "Invite customers to an existing feedback form or survey.", consideration: "Choose a general form that works for every visitor." },
      { slug: "connect-with-us-stand", purpose: "Match a particular feedback campaign with custom wording.", consideration: "Keep the invitation consistent with the questions on your form." }
    ],
    setupHeading: "Check the form before displaying the invitation",
    setup: "Test the form on a phone, including required fields and the confirmation shown after submission. Use your form provider's test process to check where responses arrive. Avoid a URL tied to one respondent or a signed-in administrator session. Ask only for information your team needs, and make any follow-up contact choice clear within the form.",
    placement: "Choose a place where customers can respond comfortably, such as an exit area or a quiet part of reception. Give them enough room to use a phone without staff watching over their shoulder. Make the same feedback opportunity available to everyone. For an event, keep the stand near the departure point while the experience is still fresh.",
    related: [{ href: "/category/reviews", label: "Compare public review stands" }, { href: "/custom-stands", label: "Create a branded feedback display" }, { href: "/solutions/retail-local-business", label: "Feedback at retail counters" }],
    faqs: [
      { question: "Is a survey builder included?", answer: "A direct feedback stand opens the URL you provide. Create and maintain the form with your chosen provider, then connect the customer-facing link. Check the selected product and service options for any separate hosted features." },
      { question: "Are responses private or public?", answer: "That depends on the destination you choose. A survey can send responses to your team, while a public review platform publishes feedback under its own rules. Explain the destination clearly so customers understand where their response goes." },
      { question: "Can I change the survey questions later?", answer: "If your form provider keeps the same public URL, you can update the questions while the stand continues opening that address. Test the updated form and confirmation message before using it with customers." },
      { question: "Can I route only happy customers to public reviews?", answer: "Use a consistent feedback opportunity instead of selecting who can reach a public review destination based on their rating. Keep public review access clear and follow the destination platform's rules." },
      { question: "Does tapping send customer details to us?", answer: "The tap opens the configured link. Any information customers submit is collected by the destination form and its settings. Review those settings and tell visitors what they are being asked to provide." }
    ]
  },
  "website-links": {
    heading: "Choose a website stand around one useful next step",
    introduction: "Website and information stands connect a physical location to the page visitors need next. That might be a service list, public practice resources, business instructions, or a contact page. Begin with the question people ask at that counter and choose a destination that answers it clearly on a phone.",
    decision: "A homepage works for general discovery, but a focused page is often easier to use when visitors already know what they need. Match the printed prompt to the destination: Patient Resources should open useful practice information, while Explore Our Services should help customers compare services. If several choices are essential, compare a link hub with a single direct destination.",
    options: [
      { slug: "visit-our-website-stand", purpose: "Open a business website or focused landing page.", consideration: "Use a stable public address that you can maintain." },
      { slug: "patient-resources-stand", purpose: "Share general practice forms, instructions, or resources.", consideration: "Keep personal records in your existing secure systems." },
      { slug: "explore-our-services-stand", purpose: "Help visitors understand packages and service options.", consideration: "Make the next enquiry or booking step easy to find." }
    ],
    setupHeading: "Build a destination that stays useful",
    setup: "Choose a complete public URL and test it on a small screen. Put the most useful information near the top, check document access, and confirm any contact or booking links. Use a stable page you control when content changes regularly. Avoid expiring download links, private account sessions, and documents that only staff can open.",
    placement: "Place the stand beside the conversation or task it supports. Resources belong near reception information, services near consultations, and contact links near an event or enquiry desk. Keep each invitation specific so visitors do not have to guess what opens. For shared spaces, identify the business responsible for the destination.",
    related: [{ href: "/multi-link", label: "Compare one URL with hosted Multi-Link" }, { href: "/solutions/healthcare-dental", label: "Public resources at practice reception" }, { href: "/solutions/home-services", label: "Service information for homeowners" }],
    faqs: [
      { question: "Does a website stand include a website?", answer: "A direct stand opens a destination you already have. It does not build or host that website. Optional hosted Multi-Link is a separate service for eligible products and provides a Tap Rater page with several links." },
      { question: "Can I update the information after ordering?", answer: "When you control the content at the same destination URL, you can update that page without changing where the stand points. Changing the URL itself is a different setup question, so choose a durable address when possible." },
      { question: "When should I choose Multi-Link?", answer: "Choose it when visitors genuinely need a choice of destinations, such as services, contact details, and social profiles. A direct link is simpler when there is one obvious next step. Review current hosting pricing and product eligibility before adding the service." },
      { question: "Can I connect to a document or PDF?", answer: "Use a publicly accessible document link and test it on a phone outside your own account. Check readability and ensure the URL stays stable when the document changes. A mobile-friendly information page may be easier to navigate than a large file." },
      { question: "Can a shared stand open a customer account?", answer: "Use a general login page if account access is the intended purpose. Each visitor must authenticate through your existing system. Never configure a shared display with a link containing one customer's private information or signed-in session." }
    ]
  },
  "custom-stands": {
    heading: "Choose custom branding that makes the next action clear",
    introduction: "A custom stand connects your business identity with a useful digital destination. Start with what visitors should do: explore a service, open a menu, find a profile, or contact your team. Then choose the available design and destination options that support that action. A clear invitation is more useful than filling the display with competing messages.",
    decision: "Branded options add your logo, business name, and a destination-generated QR code alongside NFC. The exact editable fields depend on the product and template shown in the configurator. For a platform-specific purpose, a branded platform stand may be the clearest choice. A Custom Stand suits a broader business message or destination that needs its own visual identity.",
    options: [
      { slug: "connect-with-us-stand", purpose: "Build a display around your own business and message.", consideration: "Review the available editable fields in the configurator." },
      { slug: "google-review-stand", purpose: "Combine business branding with a recognizable review platform.", consideration: "Your logo, business name and QR code are included." },
      { slug: "menu-and-order-stand", purpose: "Match a menu or ordering display to your restaurant.", consideration: "Prepare a public menu link for the correct branch." }
    ],
    setupHeading: "Prepare your logo, business name, and destination",
    setup: "Have a clear logo file and the exact business name ready before opening the builder. Test the destination on a phone and confirm it matches the printed invitation. Inspect the actual artwork preview, including spelling, logo appearance, and the selected design. Approve the Branded preview before payment; final print artwork is generated after payment.",
    placement: "Design for the counter where the stand will sit. A reception display needs a name visitors recognize, while an event table may need a stronger explanation of what the link offers. Keep the NFC area and printed QR easy to approach with a phone. For multiple branches, check each stand's business details and destination separately before ordering.",
    related: [{ href: "/shop?design=branded", label: "Browse Branded + QR options" }, { href: "/stand-bundles", label: "Plan stands for multiple locations" }, { href: "/how-it-works", label: "See the setup process" }],
    faqs: [
      { question: "What can I customize on a Branded stand?", answer: "Branded options include your logo, business name, and a QR generated from the destination. Additional content depends on the selected template. Use the fields and preview in the product configurator to confirm exactly what will appear." },
      { question: "Can I review the artwork before paying?", answer: "Yes. Branded orders use an artwork preview for approval before payment. Check the name, logo, and layout carefully. Final print artwork is generated after payment based on the approved configuration." },
      { question: "Do custom stands require a subscription?", answer: "Direct stands are a one-time purchase. Optional hosted Multi-Link, when offered, adds a separate monthly charge for the hosted page. Check the chosen product's current purchase options and service pricing before checkout." },
      { question: "Can each branch have a different destination?", answer: "Yes. Prepare the correct link and business details for each stand. Similar-looking branches may need different review, menu, or booking URLs, so verify each configuration rather than assuming one destination fits every location." },
      { question: "Should I choose a Custom Stand or a branded platform stand?", answer: "Choose a branded platform stand when a recognizable platform is central to the invitation. Choose a Custom Stand when your own message and destination need to lead. Compare the available previews and editable fields before deciding." }
    ]
  }
};
