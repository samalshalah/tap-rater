export type ProductBuyingGuide = {
  introduction: string;
  placement: string;
  destination: string;
  question: string;
  answer: string;
};

// Each entry describes the actual destination and buying decision, rather than
// substituting a platform name into one shared review-collection promise.
const entries: Record<string, [string, string, string, string, string]> = {
  "linkedin-connect-stand": [
    "Turn an introduction into a professional connection with the LinkedIn Connect NFC Stand. It gives visitors at your office or event table a direct route to the LinkedIn destination behind your business.",
    "Place it beside an event badge display, meeting reception desk, or networking table. Make clear whether visitors are finding the person they just met or the wider company. An individual professional can use a personal profile, while a shared team display may be better matched to a company Page.",
    "Provide the public LinkedIn profile or company URL you want visitors to open. Verify the name, role, and organization on mobile before ordering. Avoid an invitation inbox or private message URL, since a shared stand should lead to a destination everyone can recognize.",
    "Can I keep using this stand after changing jobs?",
    "Check both the printed identity and the destination before reusing it. A personal profile may remain useful after a job change, but a former employer's logo or company link should be updated before you display the stand in a new role."
  ],
  "google-review-stand": [
    "Make your Google review form easy to reach from the checkout counter with an NFC Google Review Stand. Customers can open the correct business location on their own phone while their visit is still fresh.",
    "Place the stand where a visit naturally finishes: beside the receipt printer, at reception, or near the pickup point. Leave room for a phone to approach the NFC area. Invite honest feedback consistently, without rewards or choosing only customers who seem happy.",
    "Supply the Google review link for this specific location. Open it on a phone and check the business name and address before ordering. A branch across town needs its own destination; the stand does not decide which location a customer visited.",
    "Does tapping the Google stand automatically leave a review?",
    "No. The tap opens your destination. The customer decides whether to sign in, choose a rating, and submit a review. Purchasing a stand does not purchase reviews or a particular rating."
  ],
  "yelp-review-stand": [
    "Give visitors a convenient way to find your Yelp business page with an NFC Yelp Review Stand. Use it as a doorway to your public listing so customers can explore your business on their phone.",
    "A reception desk or business information area makes this stand easy to discover without a staff review request. Position it alongside your hours or contact information. Keep the surrounding message about finding your business on Yelp rather than asking customers to write a review.",
    "Use the public Yelp listing for the correct address, not your owner dashboard. Test it while signed out of your business account and confirm that customers can recognize the listing. Check the destination again if your business relocates or changes its public name.",
    "Should staff ask customers to leave a Yelp review?",
    "Yelp's policy says businesses should not ask for reviews. Present the stand as a way to find your Yelp page, without review requests, incentives, or a staff script asking for a rating."
  ],
  "facebook-review-stand": [
    "Connect an in-person visit to your business's Facebook presence with the Facebook Review Stand. The NFC destination gives customers a recognizable place to explore your page and the feedback options available there.",
    "Use the stand at a shop checkout or community-facing reception desk where customers already recognize your business name. Keep it separate from a Facebook follow prompt if your main purpose is customer feedback, so visitors understand which action you are inviting them to consider.",
    "Provide your public business Page link or an accessible feedback destination for that Page. Check it on a customer's phone rather than inside your administrator account. Confirm that the intended action is available on the page before placing an order.",
    "Is this the same as the Facebook Follow Stand?",
    "The physical NFC interaction is similar, but the printed prompt serves a different purpose. Choose the Review Stand for a feedback-focused display and the Follow Stand when keeping customers connected to your posts is the priority."
  ],
  "tripadvisor-review-stand": [
    "Help guests find your restaurant, attraction, or accommodation listing with a TripAdvisor Review Stand. A visible NFC prompt connects the experience at your venue with the destination you provide for travelers.",
    "A host desk, tour meeting point, or guest departure counter gives visitors time to use their phone without holding up an entrance. For an attraction with several ticketed experiences, place the stand where guests can recognize which venue or activity the listing represents.",
    "Choose the exact public Tripadvisor listing for your venue. Check the name, city, and listing category, especially when a hotel and its restaurant have separate pages. Test the link on mobile so a guest lands on the intended business rather than a general search.",
    "Can one stand represent both our hotel and restaurant?",
    "A direct stand opens one supplied URL. If the hotel and restaurant have separate listings, use separate destinations or choose an available Multi-Link option to let visitors select the appropriate page."
  ],
  "ubereats-review-stand": [
    "Bring your Uber Eats storefront within reach at the pickup counter with an NFC Uber Eats Review Stand. It connects visitors to your chosen restaurant destination while keeping the ordering platform recognizable.",
    "Place it beside the pickup instructions rather than in the food handoff area. Customers collecting orders should be able to identify the restaurant and open its destination without blocking drivers or staff. For a shared kitchen, label each brand's stand clearly.",
    "Supply the customer-facing Uber Eats restaurant link for the correct branch. Avoid temporary checkout URLs or a merchant login. Test the page on a phone and confirm the delivery or pickup location shown matches the business represented on the stand.",
    "Will this let every visitor submit an Uber Eats rating?",
    "The stand opens a link; it does not create an order or grant review eligibility. Any rating options depend on the customer's account, order, and the platform's available features."
  ],
  "angi-review-stand": [
    "Connect a home-service conversation to your Angi profile with an NFC Angi Review Stand. It gives homeowners a direct destination to revisit after discussing a repair, installation, or improvement project.",
    "Use it at your showroom consultation desk or customer service counter, where a homeowner can pause before leaving. Keep the stand near project information rather than on a work surface covered by tools. The business name should match the company completing the work.",
    "Provide your public Angi business destination and verify the service area and company identity. A contractor management page is not a customer destination. Open the link without your business login to see what a homeowner will actually find.",
    "Can I use it for several service teams?",
    "Yes, if the teams share the same public business destination. When different branches or trading names use different profiles, order with the matching link for each stand so customers reach the right company."
  ],
  "dealerrater-review-stand": [
    "Make your dealership's DealerRater destination easy to find at vehicle handover with an NFC DealerRater Review Stand. It suits a desk where customers finish a sales or service interaction and have their phone ready.",
    "Set the stand on the delivery specialist's desk or service collection counter. Sales and service visitors may have different experiences to describe, so place it alongside the team or department it represents. Avoid crowding the paperwork area during signatures.",
    "Check that the supplied DealerRater page belongs to the correct dealership and city. If your destination identifies a particular employee, verify that it remains appropriate for everyone using that stand. A general dealership URL is usually easier to reuse across staff changes.",
    "Should sales and service use different stands?",
    "Separate stands can make placement clearer even when both open the same dealership page. Use distinct links only if your intended public destinations differ, and verify each one before ordering."
  ],
  "autotrader-review-stand": [
    "Give showroom visitors a direct route to your Autotrader dealer presence with an NFC Autotrader Review Stand. Customers can keep exploring your chosen public destination after the conversation at the dealership ends.",
    "A vehicle consultation table or showroom reception desk works well for shoppers who want to continue browsing on their own phone. Keep the stand visible beside dealer contact details. For a display used across many vehicles, choose a destination that will remain useful when inventory changes.",
    "Use a stable public dealer page when the stand serves the whole showroom. A single vehicle listing can become unavailable after a sale, so confirm that the link fits your intended lifespan. Test the customer view before approving the order.",
    "Does the stand include an Autotrader listing or account?",
    "No. You supply the destination you want customers to open. The stand does not create a dealer listing, publish inventory, or add feedback features to your Autotrader account."
  ],
  "carfax-review-stand": [
    "Link your customer-facing CARFAX destination to the service desk with an NFC CARFAX Review Stand. It provides a simple physical prompt for drivers who want to find your business on their own device.",
    "Position it near the invoice collection area after a service explanation is complete. A customer should be able to distinguish your repair location from other branches. Keep vehicle-specific paperwork separate so the shared stand always points to the business rather than an individual customer's records.",
    "Provide a public CARFAX business page suitable for all visitors. Do not use a private report, account session, or link containing customer information. Check the shop name and address on mobile before sending the URL with your order.",
    "Is a vehicle history report included?",
    "No. This is a physical NFC stand connected to your supplied URL. It does not purchase reports or provide access to private vehicle information; choose a public destination appropriate for your customers."
  ],
  "edmunds-review-stand": [
    "Help buyers revisit your Edmunds dealer destination from the showroom with an NFC Edmunds Review Stand. It connects a vehicle discussion to the public page your dealership wants customers to find.",
    "Use a finance waiting area or sales consultation desk where visitors have a natural pause. Make the display part of your dealer information rather than placing it among documents requiring signatures. For dealer groups, identify the individual store on the Branded design.",
    "Confirm the public Edmunds destination shows the correct dealership, not simply the vehicle make or a regional search. Open it on mobile without a staff session and verify that the information a customer needs is accessible from the first page.",
    "Can I point it to a particular car on Edmunds?",
    "A direct stand can open the URL you provide, but individual inventory pages may expire. For ongoing showroom use, choose a dealer destination that remains relevant after a vehicle is sold."
  ],
  "cars-review-stand": [
    "Connect showroom conversations to your Cars.com dealership page with the NFC Cars.com Review Stand. Buyers can open your supplied destination without typing a dealer name into a search box.",
    "Place it at a reception desk or delivery bay counter where the dealership identity is obvious. If several franchises share one building, keep each stand with the right team. A clear destination helps visitors distinguish the location they visited from another store in the group.",
    "Send the public Cars.com dealer URL and check the address and business name. Avoid staff account links and short-lived search results. Preview the page on a phone to make sure the customer sees the intended dealer rather than unrelated inventory.",
    "Will the stand synchronize our vehicle inventory?",
    "No. It opens your selected page and does not manage inventory or dealership software. Your Cars.com destination remains responsible for the listings and customer actions shown after the tap."
  ],
  "cargurus-review-stand": [
    "Put your CarGurus dealer destination within reach of showroom visitors with an NFC CarGurus Review Stand. It helps shoppers continue researching your dealership using a public link selected by your team.",
    "Set it beside a vehicle enquiry desk where buyers compare options and save useful information. Choose a position visible from the customer's side, with enough space to hold a phone close to the NFC area. Keep different dealership brands clearly separated.",
    "Use the public dealer destination rather than a personalized shopper session or internal stock-management link. Check that it opens the correct location on mobile. If you choose a specific car listing, consider how you will handle that URL after the car sells.",
    "Does tapping make someone eligible to review our dealership?",
    "No. The tap only opens the destination. CarGurus determines what actions are available to each visitor; the stand does not establish a purchase history or bypass account requirements."
  ],
  "repairpal-review-stand": [
    "Help drivers locate your RepairPal destination at the repair counter with an NFC RepairPal Review Stand. It creates a convenient connection between your physical shop and the public page you supply.",
    "Keep the stand near the service advisor's collection point after repair details have been explained. Customers should see it without reaching across tools, keys, or payment equipment. A Branded face can help distinguish your shop from similarly named repair businesses.",
    "Verify that your RepairPal destination is public and belongs to the right workshop. Check the location details from a phone outside your business login. Use a page intended for customers rather than an estimate or account link tied to one vehicle.",
    "Does buying this stand certify my repair shop?",
    "No. The stand is a link access product. It does not create, verify, or change any certification or relationship with RepairPal, and your printed wording should reflect your actual business status."
  ],
  "surecritic-review-stand": [
    "Give service customers a clear way to find your SureCritic business destination with an NFC SureCritic Review Stand. It fits naturally into the final conversation when drivers collect their keys.",
    "Place the stand beside the service completion desk, leaving room for invoices and payment. Customers can open the destination at their own pace after discussing the repair. For a dealership with a separate repair center, confirm which operation the stand represents.",
    "Use your public SureCritic business link and test it from a customer's perspective. Avoid a personal review invitation intended for one recipient. A shared counter stand needs a destination that remains appropriate for everyone who taps it.",
    "Can a shared stand replace individual review invitations?",
    "The stand provides access to your chosen page. If the destination requires a personal invitation or verified service interaction, visitors must still follow that process; a shared URL does not replace it."
  ],
  "bbb-review-stand": [
    "Make your public BBB business profile easier to find with an NFC BBB Review Stand. Visitors can open the business information you provide while speaking with your team at reception or checkout.",
    "This stand fits a consultation desk where customers ask about your company before making a decision. Place it alongside contact details or service information so the purpose is clear. Use your actual business name consistently across the display and the linked profile.",
    "Choose the BBB profile for your specific legal business or branch and check its address. Review the page as a public visitor rather than from an account dashboard. Do not use wording that implies an accreditation or rating you have not received.",
    "Does the BBB stand include accreditation?",
    "No. Purchasing the stand does not confer BBB accreditation, endorsement, or a rating. It simply opens the public destination you supply for your business."
  ],
  "nextdoor-review-stand": [
    "Connect neighborhood customers with your Nextdoor business destination using an NFC Nextdoor Review Stand. It gives local visitors a physical starting point for finding your business online.",
    "Use it at a neighborhood shop counter or community-facing reception desk. Customers who already know your location can identify the business before opening its page. Keep the display near local information rather than mixing it with unrelated promotional QR codes.",
    "Provide the business destination you intend customers to use, not a private neighborhood discussion or staff account link. Test it on mobile and note whether visitors encounter a sign-in step. Confirm the displayed business identity matches the shop where the stand will sit.",
    "Can visitors use it without a Nextdoor account?",
    "They can tap the stand to open its URL. What they can view or do after that depends on Nextdoor's access requirements and the destination you choose; the stand does not provide an account."
  ],
  "homeadvisor-review-stand": [
    "Give homeowners a direct link to your HomeAdvisor business destination with an NFC HomeAdvisor Review Stand. It suits a contractor's office or showroom where customers compare services before starting a project.",
    "Place it on the estimate discussion table after the homeowner has reviewed the scope of work. A stable, visible display is more useful than a link buried in paperwork. Match the stand to the business handling the project, especially when several trades share a showroom.",
    "Verify the current public URL you want customers to open and confirm the company name and service area. If the page redirects, follow it through to its final destination before ordering. Do not supply an internal lead-management dashboard.",
    "Will this stand generate HomeAdvisor leads automatically?",
    "No. It opens your supplied link for people who tap it. The stand does not purchase leads, create a marketplace listing, or enroll your business in a separate service."
  ],
  "thumbtack-review-stand": [
    "Share your Thumbtack professional destination during an in-person consultation with an NFC Thumbtack Review Stand. Customers can find the profile you select without retyping your business details.",
    "Use the stand at a studio reception desk, project consultation table, or customer pickup point. Place it where your business identity is visible so visitors know which professional the destination represents. For shared workspaces, keep each provider's display with their own service area.",
    "Supply a public professional profile that customers can open, rather than a private conversation or quote. Test the URL after signing out and confirm the service description belongs to your business. A shared stand should never expose one customer's enquiry.",
    "Can I connect it to a private quote conversation?",
    "Use a public business destination for a stand shared by customers. Private quotes and message threads may be account-specific and are not suitable as a reusable public link."
  ],
  "houzz-review-stand": [
    "Bring your Houzz professional presence into the showroom with an NFC Houzz Review Stand. It gives clients a convenient way to explore the destination behind your design or renovation business.",
    "A materials library or design consultation table is a useful setting because clients already have a project in mind. Place the stand beside your business card display, leaving samples and drawings easy to handle. The destination should support the discussion happening at that desk.",
    "Choose your public Houzz professional page and verify the company name and project portfolio. If you link to a specific project instead, ensure it is public and relevant to repeated visitors. Avoid private idea collections intended for an individual client.",
    "Should I link to our profile or one project?",
    "Use your professional profile for a general showroom display. A project link can suit a dedicated exhibit, but it narrows what every visitor sees; choose the destination that matches the physical presentation."
  ],
  "porch-review-stand": [
    "Make your Porch business destination accessible from a contractor reception desk with an NFC Porch Review Stand. It supports homeowners who want to revisit your company information after a conversation.",
    "Set the display beside your service-area information or project consultation materials. Customers should be able to reach it while seated or waiting, without interrupting staff. When several businesses share a counter, use the design and placement to identify the contractor clearly.",
    "Check that your chosen Porch URL shows the correct company and territory. Open the full link on a phone before submitting it with your order. Prefer a public business page over search results that may display several unrelated providers.",
    "Can it send customers to a different business in each town?",
    "A direct stand opens one configured URL; it does not select a destination by the visitor's location. Use a separate destination per stand when different offices need different public pages."
  ],
  "airbnb-review-stand": [
    "Connect guests with your chosen Airbnb listing using an NFC Airbnb Review Stand. It gives a rental property a recognizable digital destination at a reception point or in the guest information area.",
    "Place the stand near the welcome book or departure instructions where guests can pause with their phone. If you manage several units, match each stand to the property where it is displayed. A general agency page may be less useful than the listing for that stay.",
    "Supply a public listing URL that identifies the correct property. Avoid reservation confirmations, guest messages, or links containing personal booking details. Test the page as a visitor and confirm the title and photos match the accommodation.",
    "Does tapping the stand let anyone review our Airbnb?",
    "No. Opening a listing is separate from being eligible to review a stay. Guests must use the review process available through their Airbnb booking; the stand does not create a reservation or bypass that process."
  ],
  "agoda-review-stand": [
    "Help hotel guests find your Agoda property destination with an NFC Agoda Review Stand. It brings a familiar booking-platform link into the lobby without requiring visitors to search for the hotel name.",
    "Use a guest services desk or departure information area, keeping the payment counter clear. For properties with similar names in neighboring cities, display the hotel identity prominently. A stand near the concierge can also help guests save the property destination for later.",
    "Provide the public Agoda hotel URL and check the property name and location on mobile. Avoid links from a private booking confirmation or partner dashboard. Follow any redirects to ensure the final page still represents your hotel.",
    "Does the stand collect Agoda reviews itself?",
    "No. It opens the selected destination on the guest's phone. Any review submission happens through Agoda's own available process and account requirements, not through the physical stand."
  ],
  "vrbo-review-stand": [
    "Give vacation-rental guests a direct route to your Vrbo property page with an NFC Vrbo Review Stand. It belongs alongside the practical information guests use during arrival and departure.",
    "Set the stand on an entry console or guest information shelf rather than near water or cooking equipment. Keep the property name visible for guests staying in a managed complex. Each home should point to its own listing when the properties have separate pages.",
    "Choose a public Vrbo property link, not a traveler itinerary or owner account URL. Check the listing photos and address information against the actual accommodation. Testing on a phone helps reveal redirects or access prompts before the stand arrives.",
    "Can one property manager use the same link for every home?",
    "Only if that shared destination is what you want every guest to see. To direct guests to the home they stayed in, configure each stand with that property's own public listing."
  ],
  "hotels-review-stand": [
    "Make your Hotels.com property destination easy to open from the front desk with an NFC Hotels.com Review Stand. Guests can reach the hotel page you select while planning or finishing their visit.",
    "Place it in the lobby information area or beside departure instructions, with room for guests to use their phones away from the queue. If your building contains more than one hotel brand, position the stand at the desk associated with the correct property.",
    "Supply the public hotel listing and verify the city, hotel name, and photos. Do not use a personal booking itinerary. Check the final destination after any redirect, especially if the hotel's name or ownership has recently changed.",
    "Will a tap verify that someone stayed at our hotel?",
    "No. The stand only opens the configured URL. Booking verification and any available review action remain part of the platform's process; a tap does not establish a completed stay."
  ],
  "healthgrades-review-stand": [
    "Help patients find the correct Healthgrades provider destination with an NFC Healthgrades Review Stand. It gives reception a clear link to the public profile selected by your practice.",
    "Use a reception checkout area where patients can choose whether to open the page after their appointment. In a practice with several clinicians, make it clear which provider the stand represents. Keep shared displays separate from paperwork containing patient details.",
    "Check the provider's name, specialty, and location on the public Healthgrades page. A similarly named clinician can lead patients to the wrong profile. Use only a public destination, never an appointment record, patient portal session, or personalized message.",
    "Should each clinician have a separate stand?",
    "If each clinician uses a different public profile, separate stands can make the destination clearer. A direct stand opens one URL, so confirm the provider it represents before placing it at a shared desk."
  ],
  "vitals-review-stand": [
    "Connect a clinic reception desk to your chosen Vitals provider page with an NFC Vitals Review Stand. Patients can find the intended public destination without spelling a clinician's name into search.",
    "Place it where patients finish checking out, with a clear sightline from their side of the desk. For rotating practitioners, keep the display associated with the provider shown on its design. Avoid placing the stand among forms that could suggest it is required for treatment.",
    "Open the Vitals destination and verify the provider identity and practice location. Test it on a phone without staff credentials. If an old practice address appears, resolve the destination choice before ordering rather than directing patients to an ambiguous page.",
    "Does this stand connect to our patient records system?",
    "No. It opens a supplied public URL and does not connect to clinical records. Keep patient-specific information in your existing secure systems rather than using it as the stand's shared destination."
  ],
  "zocdoc-review-stand": [
    "Make your Zocdoc provider destination accessible from the practice reception area with an NFC Zocdoc Review Stand. It helps patients locate the public page associated with the clinician or office they visited.",
    "Use it near the appointment desk after the conversation with staff is complete. A practice with several locations should keep the display matched to the relevant provider and office. Leave the stand easy to reach without leaning across reception equipment.",
    "Choose the public provider destination you intend patients to open. Confirm the clinician, office, and visible appointment information on mobile. Avoid private appointment confirmations or links that work only while your staff account is signed in.",
    "Does tapping create an appointment or a verified review?",
    "No. The patient must complete any booking or feedback process offered by the destination. The stand does not book automatically, confirm eligibility, or send patient information to your practice."
  ],
  "ratemds-review-stand": [
    "Give patients a direct path to your selected RateMDs public profile with an NFC RateMDs Review Stand. It helps distinguish the intended practitioner from similar names in an online search.",
    "Set it in a reception departure area where using a phone is comfortable and optional. For a group practice, consider a separate display for each provider rather than leaving patients to infer the destination. Keep the printed business identity consistent with the linked page.",
    "Verify the practitioner name and location on RateMDs before submitting the link. Review the public page on a mobile browser and check for confusing duplicates. Use a destination appropriate for every visitor to that reception desk.",
    "What if two providers have similar names?",
    "Check the full profile details before ordering, including the practice location. Use the Branded design to identify the intended practice or provider clearly, and test the configured destination when the stand arrives."
  ],
  "caredash-review-stand": [
    "Check your intended CareDash destination before choosing a CareDash Review Stand. This platform-specific design is only useful when you have a working public URL that patients can recognize and access.",
    "Before planning a reception display, open the exact destination on a phone and confirm that it still serves the purpose you need. A platform name printed on a stand should match the page patients reach. If it does not, select a design for your current provider page instead.",
    "Do not assume an old CareDash profile address remains available. Verify the complete link and any redirects before ordering. If you now use your practice website or another directory, the Patient Resources or Custom Stand may be a clearer match for that destination.",
    "What should I choose if my old CareDash link no longer works?",
    "Use a stand that matches a current, working destination, such as Patient Resources or a Custom Stand. Do not order this platform-specific design with an unverified legacy profile URL."
  ],
  "opencare-review-stand": [
    "Connect your dental reception area to a chosen Opencare destination with an NFC Opencare Review Stand. It offers patients a convenient route to the public practice page your team wants them to find.",
    "Place the stand at the checkout desk after the treatment or scheduling conversation. Keep it distinct from consent forms and appointment paperwork. A patient should understand that tapping opens a public destination rather than completing an administrative requirement for the visit.",
    "Check the practice name, location, and accessible actions on the Opencare page you supply. Test from a mobile browser outside your staff account. Avoid patient-specific invitations or private booking links on a stand used by everyone.",
    "Will it link every patient to their own appointment?",
    "No. A shared direct stand opens the same supplied URL for each visitor. Patient-specific appointment access should continue through the practice's normal booking or communication process."
  ],
  "avvo-review-stand": [
    "Help visitors find the intended Avvo attorney profile with an NFC Avvo Review Stand. It connects a reception or consultation space to a public professional destination selected by your office.",
    "Place it at the end of a consultation area where visitors can save the profile privately on their phone. In a multi-attorney firm, identify the professional represented by the stand. Keep the display separate from engagement documents and confidential case materials.",
    "Verify the attorney name, location, and practice information on the public Avvo page. Use a stable profile link rather than a search page showing several professionals. Check the destination without your office's account session before submitting the order.",
    "Can a firm use one stand for several attorneys?",
    "A direct stand points to one URL. If individual attorneys have separate profiles, choose separate stands or an available Multi-Link configuration that clearly labels each public destination."
  ],
  "taskrabbit-review-stand": [
    "Make your Taskrabbit professional destination easy to share in person with an NFC Taskrabbit Review Stand. It suits a service desk or workspace where customers want to find the provider they have met.",
    "Use it at a customer-facing counter or a stable handover point after work is complete. Keep the display associated with the individual or business represented on the linked page. A clear identity is especially helpful when several professionals work from the same premises.",
    "Provide a public professional destination and verify that it opens for a customer. Avoid private task details, chat links, or account dashboards. Test the final URL on a phone so you can see any sign-in or eligibility steps visitors will encounter.",
    "Does the stand create a completed task for review purposes?",
    "No. It only opens the chosen destination. Booking history, payment, and any available feedback process stay within Taskrabbit; tapping does not create or verify a task."
  ],
  "martindale-review-stand": [
    "Connect your law office's reception area to its Martindale destination with an NFC Martindale Review Stand. Visitors can open the professional page you select without searching through similar firm names.",
    "A visitor information table or consultation reception desk gives clients space to use the stand without handling confidential paperwork. If your firm has multiple offices, display the location or professional identity clearly. Choose a destination that suits the people using that particular desk.",
    "Confirm whether your supplied Martindale URL represents the firm or an individual attorney. Check the public page on mobile and verify the office details. Avoid presenting a profile link as evidence of a credential or distinction that the practice has not received.",
    "Does the stand include a professional rating or award?",
    "No. It is a physical way to open your supplied destination. Any professional rating, recognition, or directory status belongs to the platform and is separate from buying the stand."
  ],
  "justia-review-stand": [
    "Give office visitors a direct route to your Justia professional destination with an NFC Justia Review Stand. It helps people find the attorney or firm page that matches their in-person conversation.",
    "Use the stand in a reception information area where prospective clients can save contact details. Keep the printed identity specific enough to distinguish individual attorneys from the firm as a whole. A shared counter should point to a destination relevant to everyone using it.",
    "Choose an accessible public Justia page and confirm the name, office location, and practice description. Check which visitor actions are actually offered on that destination. Do not assume a directory profile includes a public review submission form.",
    "Will every Justia profile have a review form?",
    "The stand does not add features to the page. Inspect your exact public destination before ordering and choose the display based on the information and actions visitors can actually access there."
  ],
  "findlaw-review-stand": [
    "Make your chosen FindLaw attorney or firm destination easier to reach with an NFC FindLaw Review Stand. It creates a useful connection between a law office reception desk and a public professional page.",
    "Position it with general office information, away from confidential documents or signature stations. Visitors should have room to open the destination without feeling rushed. If your firm shares a building with other practices, the Branded design can clarify which office the link represents.",
    "Send the specific public profile you intend visitors to see, not a broad lawyer search. Verify the firm name, location, and current contact details. Test the link from a mobile browser so the first page matches the purpose of the display.",
    "Can it link to our own law firm website instead?",
    "A direct stand opens the URL supplied with the order, but the design should match the destination. For your own website, choose the Website or Custom Stand to make the visitor's next step clear."
  ],
  "lawyers-review-stand": [
    "Share your Lawyers.com professional destination from the reception desk with an NFC Lawyers.com Review Stand. Visitors can locate the public attorney or firm page selected by your office.",
    "Place it in a visitor waiting or departure area with other general business information. An individual attorney's stand should remain associated with that professional's consultations. For a firm-wide display, confirm that the destination represents the practice rather than one unrelated office.",
    "Check the exact Lawyers.com profile, including the name and city, before ordering. Open the URL outside your account to confirm what visitors can view. Use a public page rather than a personalized consultation enquiry or a confidential message thread.",
    "Does using the stand send a legal enquiry automatically?",
    "No. A tap only opens the destination. The visitor chooses whether to use any contact or feedback options offered there; the stand does not submit a form or create a client relationship."
  ],
  "zillow-review-stand": [
    "Connect your real estate office to a selected Zillow professional page with an NFC Zillow Review Stand. It helps clients save the agent destination behind the conversation at an open house or office visit.",
    "Use the stand on an open-house welcome table or at a closing follow-up desk. If it travels between properties, keep the destination focused on the agent rather than a listing that may soon be sold. Make the agent identity visible to visitors entering the space.",
    "Supply the public agent or team profile that matches the display. Check the name and market area, particularly when agents share a surname. Open the destination on mobile to confirm it remains useful outside your own signed-in account.",
    "Should the stand link to my agent profile or today's listing?",
    "An agent profile suits a reusable office or open-house stand. A listing URL is more specific and may stop being useful after the property sells, so choose it only for a display dedicated to that property."
  ],
  "realtor-review-stand": [
    "Give buyers and sellers a convenient route to your Realtor.com destination with an NFC Realtor.com Review Stand. It links an in-person real estate conversation to the professional page you provide.",
    "Place it at an agency reception desk or consultation table where clients review their next steps. Keep it separate from property-specific documents if the stand represents the agent's overall business. A Branded version can identify the agent or team behind the destination.",
    "Verify your public Realtor.com professional URL and check the office and agent details. Avoid a temporary search result or private lead dashboard. Test the page from a phone to confirm that clients can recognize the professional they met.",
    "Can a brokerage order a stand for each agent?",
    "Yes. Supply the correct destination and design details for each stand. When agents have separate public profiles, verify each URL individually instead of reusing the brokerage link by default."
  ],
  "homes-review-stand": [
    "Make your Homes.com professional destination accessible from a real estate consultation desk with an NFC Homes.com Review Stand. Visitors can open the public page you choose without typing a long address.",
    "Use it where prospective clients discuss neighborhoods, properties, or representation. A stable display near your agent information works better for repeat use than a stand tied to a single listing brochure. Keep the business identity clear when several agents share the desk.",
    "Choose the intended public Homes.com agent, office, or property destination and inspect it on mobile. Confirm the name and market area. If you choose a property page, consider whether that link will remain relevant after the listing changes.",
    "Does the stand publish my listings on Homes.com?",
    "No. It opens the link you provide and does not create listings or manage your property data. Your destination account and existing listing arrangements remain responsible for the content visitors see."
  ],
  "fresha-review-stand": [
    "Connect salon reception to your chosen Fresha destination with an NFC Fresha Review Stand. Clients can find the public business page after a treatment without searching for the salon's spelling or location.",
    "Set it beside the checkout desk once the service and aftercare conversation are complete. Keep it away from wet work areas and products that obscure the NFC face. If independent practitioners share reception, identify which business the stand represents.",
    "Provide the public Fresha business destination and verify the salon name and branch. Avoid appointment confirmations intended for one client. Test the page on a phone and confirm the intended information or actions are accessible to a visitor.",
    "Can it also help clients find our booking options?",
    "If your chosen destination displays booking options, clients can use those options after opening it. The stand itself does not manage appointments; choose the link and printed prompt that best match your main purpose."
  ],
  "booksy-review-stand": [
    "Give barber and salon clients a direct route to your Booksy destination with an NFC Booksy Review Stand. It brings your public business page into the final moments of an in-person appointment.",
    "A checkout counter or rebooking desk is a useful place for this stand. Clients should be able to reach it without leaning across styling equipment. For a shop with independent barbers, keep the destination matched to the business or professional named on the display.",
    "Check the public Booksy profile you supply and confirm the business, location, and visible services. Do not use a personal appointment-management link. Test the destination outside your staff login to see the experience a client will receive.",
    "Should I use the shop profile or my individual profile?",
    "Choose the destination that represents the services offered at that stand's location. A shared shop checkout may suit the business profile, while an independent professional's desk may need their own public page."
  ],
  "styleseat-review-stand": [
    "Make your StyleSeat professional destination easy to find from the salon chair or checkout desk with an NFC StyleSeat Review Stand. It gives clients a direct connection to the beauty professional they visited.",
    "Place it at your own station's consultation or payment area, with a clean space for a phone. In a suite shared by several professionals, a clearly identified stand helps clients reach the right person. Avoid positioning it beside another provider's booking materials.",
    "Supply the public StyleSeat page for your professional identity. Check the displayed name and services, then test it from a phone without your business session. A private appointment or payment link is not a suitable shared destination.",
    "Can I take this stand with me to a new salon suite?",
    "The physical stand can move with you. Before using it in the new space, check that its destination and printed business details still match your current professional page and location."
  ],
  "vagaro-review-stand": [
    "Connect a spa or salon visit to your public Vagaro destination with an NFC Vagaro Review Stand. It gives clients a familiar business page to open while finishing their appointment at reception.",
    "Use the stand beside the rebooking area, leaving the payment device and retail display easy to access. For a spa offering several services, choose a location where the whole business is represented. A provider-specific destination belongs near that provider's own checkout point.",
    "Verify the public Vagaro business URL and the correct branch before ordering. Check the customer view on mobile, including the services and actions shown. Avoid an administrator page or a link associated with one client's booking.",
    "Does it replace our Vagaro booking system?",
    "No. The stand provides a physical way to open your chosen destination. Scheduling, availability, payments, and customer feedback remain handled by the services available on that page."
  ],
  "apartments-review-stand": [
    "Bring your Apartments.com property destination to the leasing desk with an NFC Apartments.com Review Stand. Prospective residents can find the community page selected by your team during an in-person visit.",
    "Place it in the tour waiting area or at the end of a leasing consultation. Keep the community name visible, especially when one office manages several buildings. A separate stand at each property can prevent visitors from reaching a neighboring community's page.",
    "Use the public community listing and check the property name, address, and photos. Do not link to a resident's application or account. Preview the page on mobile to ensure it represents the property where the stand will be displayed.",
    "Can residents use it to access their private portal?",
    "This design is intended to match an Apartments.com destination. For a private resident portal, choose an Information or Custom Stand with an appropriate general login URL rather than a link to one resident's account."
  ],
  "trulia-review-stand": [
    "Help property visitors open your selected Trulia destination with an NFC Trulia Review Stand. It gives an office or property display a direct connection to the public real estate page you supply.",
    "Use it beside a property information display where visitors understand which home or community the page represents. If the stand will remain in the office across several listings, select a destination with a suitable lifespan. Keep expired listing brochures and links out of the display.",
    "Verify the exact Trulia URL on a phone, checking the property or professional identity shown. Confirm that it offers the information you intend visitors to see. Do not assume a page has a review form simply because it appears on a real estate platform.",
    "What happens if my property link becomes unavailable?",
    "Visitors may reach an unavailable or changed page. Choose a durable destination where possible and check it when the property's status changes; discuss destination updates before relying on an old listing URL."
  ],
  "rate-your-experience-stand": [
    "Give customers a clear place to share feedback with the Rate Your Experience NFC Stand. Connect it to the survey or feedback destination you choose so a visit can lead to useful comments from customers.",
    "Place it near the end of the customer journey, such as a reception exit or collection counter. Leave enough privacy for someone to respond honestly. Keep the invitation neutral and make the same feedback option available regardless of how satisfied a customer seems.",
    "Provide a working feedback form or public destination that displays well on a phone. Test a complete response using your form's preview or test process. Check who receives submissions and what information the form requests before putting the stand into service.",
    "Does this stand include a survey or review-filtering system?",
    "The direct stand opens the destination you provide; it does not create a survey or route people by rating. Use a feedback flow that gives customers the same opportunity to share their experience."
  ],
  "follow-us-social-media-stand": [
    "Keep your social channels within reach at checkout with the Follow Us on Social Media NFC Stand. It suits businesses that want one clear physical invitation to stay connected after a visit.",
    "Set the display beside a checkout or event welcome desk where customers are already engaging with your brand. Keep the invitation focused on following your business rather than mixing several unrelated actions. A recognizable logo can help customers identify the right profiles once the destination opens.",
    "Choose a public social profile or a link hub that lists your active channels. A direct configuration opens one URL, so use a hub when visitors need a choice. If available for your order, hosted Multi-Link is a separate optional service with its own monthly cost.",
    "Can one tap open all of my social accounts at once?",
    "The stand opens one destination. A link hub can present several social accounts for visitors to choose from, but tapping does not automatically open every account or follow any of them."
  ],
  "menu-and-order-stand": [
    "Put your menu and ordering destination on the table with the Menu and Order NFC Stand. Guests can open the page you select while deciding what to eat, without typing a website address.",
    "Use it at a table, takeaway counter, or pickup waiting area where guests have time to browse. Keep the NFC face reachable and away from spills. If your ordering system requires a table or branch selection, make those instructions clear beside the stand.",
    "Supply the customer-facing menu or ordering URL for the correct restaurant. Test opening the menu, selecting items, and identifying the location before ordering. Avoid a staff dashboard or a checkout link that contains another customer's basket.",
    "Does this stand include an ordering system?",
    "No. It connects guests to your existing menu or ordering page. Item availability, payment, order routing, and kitchen notifications depend on that destination, so choose a system that supports your restaurant's workflow."
  ],
  "patient-resources-stand": [
    "Make practice information easy to access with the Patient Resources NFC Stand. Connect reception to your public instructions, forms page, or resource hub so patients can keep useful information on their own phone.",
    "Place it near general reception information or the departure desk. Patients should be able to tell whether the link contains forms, preparation instructions, or after-visit resources. Keep the display separate from individual records and use plain wording that matches the page's purpose.",
    "Choose a public resource page maintained by your practice. Check that documents are readable on a phone and that any secure forms use your normal approved system. Never configure a shared stand with a patient-specific record, appointment, or signed-in portal session.",
    "Can the stand store or collect patient records?",
    "The stand opens a URL; it is not a patient records system. Use it for general resources or a general secure portal entry point, with authentication and data handling managed by your existing provider."
  ],
  "check-our-information-stand": [
    "Give visitors a dependable starting point for business information with the Check Our Information NFC Stand. It can open the instructions, documents, or information page your team would otherwise explain repeatedly.",
    "Use it in a reception area, event welcome space, or customer waiting zone. Place the stand close to the task the information supports, such as arrival instructions beside check-in. A short nearby explanation helps visitors know what they will find before reaching for their phone.",
    "Choose a mobile-friendly page that your business can keep current at the same URL. Organize the most useful information near the top and test any document links. Avoid files that require your personal login or links that expire after a short time.",
    "Can I update the information without replacing the stand?",
    "If you control the content at the same destination URL, you can update that page while the stand continues opening it. Changing the URL itself is a separate setup question; a stable page is the simplest choice."
  ],
  "explore-our-services-stand": [
    "Turn a waiting or consultation area into a route to your service menu with the Explore Our Services NFC Stand. Customers can browse packages and service details on the destination you provide.",
    "Place it beside a consultation desk or retail display where customers naturally compare options. Keep the page relevant to the services available at that location. For businesses with seasonal packages, a stable service page is easier to maintain than a temporary promotional file.",
    "Provide a services page, package menu, or suitable booking destination. Test that the page explains what is included and how to take the next step. Use a public link that does not require staff access and displays clearly on a phone.",
    "Should I link to services or directly to booking?",
    "Use a service page when customers need to compare options first. Choose a booking destination when the service is already clear and the main next step is selecting an appointment. Match the display to that decision."
  ],
  "connect-with-us-stand": [
    "Give visitors a simple way to keep in touch with the Connect With Us NFC Stand. It opens your chosen contact, messaging, or connection page while your business is still in front of them.",
    "Use it at an event table, sales desk, or reception exit where people ask how to reach you later. Place the stand beside your business identity and keep the invitation specific. A contact-focused destination is most useful when it shows a clear next step on mobile.",
    "Choose a public contact page, supported message link, or connection hub. Test the link from a phone and confirm the recipient details. Avoid private conversation URLs or a personal account session that other visitors cannot access.",
    "Will tapping automatically send us a message?",
    "No. The tap opens your destination. The visitor chooses whether to write, call, or submit contact details using the options on that page; the stand does not send a message on their behalf."
  ],
  "facebook-follow-stand": [
    "Bring your Facebook Page into the checkout experience with an NFC Facebook Follow Stand. Customers can find the page where you share business updates, events, and news after their visit.",
    "Place it beside a community notice display or checkout counter where returning customers already look for updates. Use the same business identity as your public Page. Keep a follow-focused stand distinct from a review prompt so customers understand the invitation at a glance.",
    "Provide your public Facebook Page or professional profile link. Check that it opens the intended account on a phone outside your administrator session. Verify the profile image and name so customers can recognize the page immediately.",
    "Can multiple shop locations use the same Facebook Page link?",
    "Yes, if that Page represents all of those locations. When branches maintain separate Pages, supply the matching URL for each stand and check the business details so visitors find updates relevant to the shop they visited."
  ],
  "instagram-follow-stand": [
    "Connect your in-store experience to your Instagram profile with an NFC Instagram Follow Stand. It gives customers a direct route to the photos, work, and updates behind your business.",
    "Use it beside a finished-look mirror, product display, or checkout point where your visual work is fresh in the customer's mind. Keep the stand close to your brand name and leave space to approach it with a phone. A clear profile identity helps visitors recognize your account.",
    "Supply the public Instagram profile URL you want customers to open. Check the username carefully and test it outside your own account. A profile is generally more reusable than a single post or temporary campaign destination.",
    "Should I link to my Instagram profile or a post?",
    "Choose the profile for a lasting follow invitation. A specific post suits a temporary campaign, but the stand will keep opening that post until its destination changes, so plan for the campaign's end."
  ],
  "tiktok-follow-stand": [
    "Give customers a route from your counter to your TikTok profile with an NFC TikTok Follow Stand. It suits businesses that share demonstrations, creative work, or behind-the-scenes videos with their audience.",
    "Place it where customers encounter the subject of your videos, such as a product demonstration table or checkout area. Keep the invitation about finding your account rather than promising a particular video will appear. The profile should clearly identify the business they are visiting.",
    "Use your public TikTok profile URL and verify the exact handle. Test it on a phone to see the browser or app handoff. Avoid a link to a draft, private video, or creator dashboard that customers cannot open.",
    "Can the stand guarantee more TikTok followers?",
    "No. It makes your selected profile easier to reach. Visitors still decide whether to watch or follow, and your content and their interests determine what happens after the page opens."
  ],
  "youtube-follow-stand": [
    "Put your YouTube channel within reach of customers with an NFC YouTube Follow Stand. It connects a physical demonstration or service conversation to videos visitors can watch later on their own phone.",
    "Use it near a product demonstration area, workshop reception, or educational display. A channel destination works well when you have several useful videos rather than one temporary promotion. Tell visitors what kind of content they can expect, such as tutorials or product walkthroughs.",
    "Provide a public YouTube channel URL and confirm the channel name and image. If you choose a playlist or video, test that it is publicly accessible. Avoid an editing link from your creator account or an unpublished upload.",
    "Should I use a YouTube channel or a playlist link?",
    "Use your channel for a general invitation to discover your videos. A public playlist can suit a demonstration area where visitors need a particular series of tutorials. Test the selected destination and make the display's purpose clear."
  ],
  "linkedin-follow-stand": [
    "Make professional follow-up easier at reception or an event with an NFC LinkedIn Follow Stand. It gives visitors a direct link to the company or professional profile behind the conversation.",
    "Place it on a conference table, recruitment desk, or office welcome counter. Decide whether the display represents an individual or the organization, and make that identity obvious. A company-focused stand is easier to share across staff than one pointing to a single employee.",
    "Supply the public LinkedIn company Page or personal profile URL you intend visitors to open. Check the name and role on mobile. Avoid account-management links, private messages, or a page that depends on your signed-in administrator access.",
    "Can our recruiting team use this stand at several events?",
    "Yes, when the same public destination remains relevant at each event. A company Page can provide a consistent team identity. Before reusing the display, confirm that the page and any printed business details are still current."
  ],
  "x-follow-stand": [
    "Connect customers with your public X profile through an NFC X Follow Stand. It gives a counter or event display a direct destination for the updates your business shares online.",
    "Use it near event information, announcements, or a customer service desk where timely updates are relevant. Keep the account identity easy to recognize and avoid combining several conflicting prompts on the same counter. Visitors should know whose profile they are opening.",
    "Provide the exact public X profile URL and test the handle on a phone. Check the page from outside your own signed-in session. A stable profile link is more useful for ongoing placement than a post tied to a short-lived announcement.",
    "Can I use a campaign post as the destination?",
    "You can choose a public URL that supports your campaign, but the stand continues opening that destination after the campaign ends. For an ongoing follow prompt, use your profile instead of a single post."
  ],
  "snapchat-follow-stand": [
    "Give visitors a direct route to your Snapchat destination with an NFC Snapchat Follow Stand. It suits a branded counter or event space where customers want to find your account from their phone.",
    "Place it in a social engagement area or beside event merchandise, with your business identity clearly visible. Keep the destination relevant to the audience using that location. A stable account link helps returning visitors recognize the same business beyond a single event.",
    "Supply the public Snapchat destination you want visitors to open and test it on a phone. Confirm the account name and any app handoff before ordering. Do not use a private conversation or a temporary invitation that is unsuitable for ongoing public use.",
    "Does this product include a printed Snapcode?",
    "Your custom stand includes NFC and a destination-generated QR code alongside your business details; do not assume that QR is a Snapchat Snapcode. Review the actual artwork option before checkout."
  ],
  "pinterest-follow-stand": [
    "Connect your showroom inspiration to your Pinterest destination with an NFC Pinterest Follow Stand. Customers can find the boards or profile you choose while browsing your products or creative work.",
    "Use it near a design display, craft counter, or styling consultation table. Visitors are more likely to understand the link when it relates to the ideas in front of them. Keep the destination focused on your own public inspiration collection rather than a private client board.",
    "Provide a public Pinterest profile or board URL and check it from a phone outside your account. Confirm the board is visible to visitors. A profile suits a general follow invitation, while a board can support one clearly defined display theme.",
    "Can I link the stand to a private Pinterest board?",
    "A shared customer display should use a destination your intended audience can access. Test visibility before ordering; a private board may not be available to people who tap the stand."
  ],
  "whatsapp-message-stand": [
    "Make it easy for customers to start a WhatsApp conversation with the WhatsApp Message NFC Stand. It opens the message destination you provide so visitors can contact the right business number.",
    "Place it at a service enquiry counter or collection desk where customers ask about follow-up questions. Make clear which business or department receives messages. Use a number your team actively manages so the destination remains useful after the customer leaves.",
    "Supply a tested public WhatsApp message link for the intended business number. Check the recipient and any prepared text on a phone before ordering. Avoid a private chat history URL or a number that staff cannot consistently monitor.",
    "Should I use a staff member's number or a shared business number?",
    "Choose a business number your team can consistently monitor and maintain. A personal staff number may become unsuitable when responsibilities change. Verify the recipient shown by the message link before ordering and whenever your contact arrangements change."
  ],
  "telegram-message-stand": [
    "Connect visitors to your Telegram contact or public destination with the Telegram Message NFC Stand. It provides a clear starting point for a conversation or community link chosen by your business.",
    "Use it at an event support desk or customer enquiry area where Telegram is a relevant contact option. Identify whether visitors are opening a business contact, channel, or group. That distinction helps customers understand what they will see before tapping.",
    "Provide a stable Telegram destination and confirm the username or invite behavior on mobile. For ongoing public placement, check that the link will remain available. Avoid exposing a private group or using an invitation that expires unexpectedly.",
    "Should I link to a contact, channel, or group?",
    "Use a business contact for enquiries, a channel for updates, or a suitable group for community participation. Match the printed invitation to the actual destination so visitors understand whether they are messaging or joining."
  ],
  "book-your-next-visit-stand": [
    "Make rebooking a clear next step with the Book Your Next Visit NFC Stand. Customers can open your existing booking page while they are still at reception, checkout, or a consultation desk.",
    "Place it where staff discuss the next appointment, leaving space for customers to check dates on their phone. Keep the display associated with the correct provider or location. A rebooking prompt is most useful after the service has been explained and the customer knows what to select.",
    "Provide a public booking URL for the appropriate branch, professional, or service. Test the customer journey through choosing a service and viewing availability. Do not use an administrator calendar or a link tied to one customer's existing appointment.",
    "Does the stand manage availability or take deposits?",
    "Those features belong to your booking destination. The stand opens the page you provide; appointment availability, confirmations, cancellation rules, and any deposits are handled by your existing booking system."
  ],
  "view-our-menu-stand": [
    "Let guests browse your menu on their phone with the View Our Menu NFC Stand. It gives a table or counter a direct connection to the food, drinks, or service menu you maintain online.",
    "Place the stand where people decide what to order, such as a cafe table, bar seating area, or waiting counter. Keep it visible without blocking plates or payment equipment. For different dayparts, choose a destination that clearly distinguishes the menus currently available.",
    "Supply a mobile-friendly menu page or accessible document. Test readability, prices, and any location-specific items before ordering. If you update the menu regularly, keeping the same page URL lets the stand continue reaching your latest published content.",
    "Can I change dishes and prices after the stand arrives?",
    "Yes, when you control the menu content at the same destination URL. Update that page or document without changing its address. If the address changes, check your stand's destination setup before relying on the new menu."
  ],
  "visit-our-website-stand": [
    "Turn a physical visit into a direct route to your website with the Visit Our Website NFC Stand. Customers can open the page you choose from a showroom, reception desk, or event table.",
    "Set it beside your business information where people naturally ask for more details. Choose a page that matches the display's purpose: a homepage for general discovery or a focused landing page for a specific service. Keep nearby wording consistent with that destination.",
    "Provide a complete, working website URL and test it on a phone. Check readability, navigation, and the next action you want visitors to take. A stable page on a domain you control is easier to maintain than a temporary campaign link.",
    "Should I use my homepage or a landing page?",
    "Use the homepage when visitors need an overview of your business. A focused landing page is better when the stand supports one action, such as exploring a service, checking event details, or making an enquiry."
  ],
  "custom-direct-stand": [
    "Build a counter display around your own business and destination with the Custom NFC Stand. Choose the available design options to connect your logo, message, and customer action in one physical stand.",
    "Start with the action you want visitors to understand, then place the stand where that action makes sense. An enquiry prompt belongs near consultations; a menu link belongs where guests choose food. Keep the main message short enough to read before someone reaches for their phone.",
    "Prepare a working destination URL and clear brand assets for the options shown in the configurator. Check the mobile destination before reviewing your artwork. For Branded orders, inspect the business name, logo, and preview carefully before approving the purchase.",
    "What should I prepare for a custom stand order?",
    "Have your destination link, business name, and a clear logo ready, plus any content requested by the selected design. Use the configurator's actual preview and available fields to confirm what will appear on your stand."
  ]
};

export const productBuyingGuides: Record<string, ProductBuyingGuide> = Object.fromEntries(
  Object.entries(entries).map(([slug, [introduction, placement, destination, question, answer]]) => [
    slug, { introduction, placement, destination, question, answer }
  ])
);
