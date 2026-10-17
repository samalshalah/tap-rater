import type { BusinessUseGuide } from "@/lib/business-use-guide";

// Each industry owns its copy. The storefront supplies only the shared design comparison.
export const industryBusinessGuides: Record<string, BusinessUseGuide> = {
  automotive: {
    headline: "NFC & QR Stands for Dealerships & Auto Shops",
    seoTitle: "NFC & QR Stands for Dealerships & Auto Repair Shops",
    seoDescription: "Connect drivers to Google reviews, dealership profiles, and service information. Explore automotive NFC stands, Branded + QR designs, and counter placement tips.",
    introduction: "Make the next step easy for drivers at your dealership, repair shop, or service center. A Tap Rater stand opens an existing online destination from a sales desk or service counter, helping customers find the right branch without typing a business name. Choose a review profile or useful dealership information, then match the stand to that action. Standard provides NFC; Branded adds your business identity and a printed QR code for customers who prefer scanning.",
    recommendationsTitle: "Recommended Stands for Automotive Businesses",
    placementTitle: "Where to Place Stands in Your Dealership or Shop",
    howItWorksTitle: "How Your Automotive Stand Works",
    faqTitle: "Automotive Stand FAQs",
    recommendations: [
      { productSlug: "google-review-stand", goal: "Open your branch’s Google review page", reason: "Help customers find the review destination for the shop that serviced their vehicle. Keep the choice to review separate from payment, warranty discussions, and any request for a particular rating.", placement: "At the vehicle collection or service checkout desk." },
      { productSlug: "dealerrater-review-stand", goal: "Connect shoppers with your DealerRater profile", reason: "Give customers a clear route to the dealership profile you already maintain. Check the public destination and its available actions before configuring the stand for your showroom.", placement: "On a sales consultant’s desk or delivery counter." },
      { productSlug: "check-our-information-stand", goal: "Share useful dealership information", reason: "Point drivers to a public page with opening hours, service details, or aftercare information. A stable branch information page can serve visitors throughout their ownership experience.", placement: "Beside service reception or in the customer lounge." }
    ],
    placements: [
      { title: "Service collection desk", productSlug: "google-review-stand", body: "Let drivers open your repair shop’s Google review page after collecting their keys. Place the stand beside the service advisor’s checkout area, clear of card terminals and repair paperwork. Use the serviced branch’s review link and keep feedback optional for every customer." },
      { title: "Showroom and delivery area", productSlug: "dealerrater-review-stand", body: "Give vehicle buyers a direct route to your dealership’s DealerRater profile at the sales desk or handover counter. Verify that the page identifies your dealership and offers the actions you want customers to find. Keep the stand facing the customer with room for a phone to approach." },
      { title: "Waiting lounge", productSlug: "check-our-information-stand", body: "Help drivers waiting for a service find your opening hours, maintenance information, and contact options on a public branch page. Place the stand beside lounge seating or service brochures. Individual repair orders and vehicle records should stay in your existing private customer systems." }
    ],
    steps: [
      { title: "Choose the desk and action", body: "Decide whether the stand belongs at service collection, a sales desk, or the waiting area. Select a product whose invitation matches the destination. Compare Standard and Branded + QR options on its product page before choosing quantities for multiple departments." },
      { title: "Check the branch destination", body: "Open the proposed link on a phone outside your staff account. Confirm the dealership name, address, and available actions. For a Branded order, review the logo and branch details in the design preview so visitors recognize the location they have just visited." },
      { title: "Test after installation", body: "Place the stand on a clear surface and try the guest journey yourself. Test NFC and, where included, the printed QR. Let service advisors know which page opens, and check the destination again whenever a branch profile or website address changes." }
    ],
    faqs: [
      { question: "Should an auto shop choose Google or DealerRater?", answer: "Choose the destination your business actually maintains. Google can suit a local repair shop’s review page, while a dealership may also use a DealerRater profile. You do not need both on the same desk. Start with the profile that matches the customer action you want to make available." },
      { question: "Can each dealership branch have its own link?", answer: "Yes. Configure each stand with the destination for its intended branch. Check the address on the destination page and record where each stand will be installed. A service department and a sales department may need different links even when they share the same building and business branding." },
      { question: "Will a stand automatically collect a review?", answer: "No. It opens the destination you provide; the customer decides whether to leave a review and what to say. The review platform may ask them to sign in. Make the opportunity available consistently and do not promise incentives or a particular rating as part of using the stand." },
      { question: "Can I share service information instead of a review link?", answer: "Yes. Choose an information stand and supply a public page with your service details, hours, or contact options. Tap Rater does not manage repair bookings or vehicle records. If the page includes a booking link, your existing provider continues to handle scheduling and customer information." },
      { question: "What if a driver prefers scanning to NFC?", answer: "Choose Branded + QR to offer both options on the stand. Standard is NFC-only. A printed QR gives visitors another way to reach the destination using their phone camera. Confirm the available design and current price on the product page before ordering stands for your showroom or service desks." }
    ]
  },
  "hotel-travel": {
    headline: "NFC & QR Stands for Hotels & Guest Accommodation",
    seoTitle: "NFC & QR Stands for Hotels & Guest Accommodation",
    seoDescription: "Help hotel guests find property information, Google reviews, and Tripadvisor profiles. Compare NFC stands, Branded + QR options, and front desk placement ideas.",
    introduction: "Give hotel guests a convenient route to useful property information and the review profiles they recognize. Tap Rater stands connect your reception desk, concierge area, or checkout counter to an existing public page. Choose one clear purpose for each location so arrivals see practical information and departing guests can find a review destination. Standard stands support NFC tapping; Branded designs add your property name, logo, and printed QR code for guests who prefer their phone camera.",
    recommendationsTitle: "Recommended Stands for Hotels and Hosts",
    placementTitle: "Where to Place Stands Around Your Property",
    howItWorksTitle: "How Your Hotel Stand Works",
    faqTitle: "Hotel and Accommodation Stand FAQs",
    recommendations: [
      { productSlug: "check-our-information-stand", goal: "Share your public guest information", reason: "Open a mobile page covering facilities, breakfast times, transport, or contact options. Your team maintains the information on its existing website, keeping the physical invitation simple.", placement: "At reception or beside the concierge desk." },
      { productSlug: "google-review-stand", goal: "Make your property’s review page accessible", reason: "Let departing guests reach the correct hotel’s Google review destination. The stand offers the link without creating a review or promising a rating on the guest’s behalf.", placement: "At a clear, reachable spot beside checkout." },
      { productSlug: "tripadvisor-review-stand", goal: "Open your Tripadvisor property profile", reason: "Connect travelers to the public listing you already use. Confirm the property and available review actions from a guest’s phone before choosing this destination.", placement: "On the reception counter or guest departure desk." }
    ],
    placements: [
      { title: "Arrival and reception", productSlug: "check-our-information-stand", body: "Give arriving guests a mobile guide to breakfast times, facilities, transport, and reception contact details while they wait to check in. Keep this public page current as seasonal hours change. Room access codes and individual reservation details belong in your private guest communications." },
      { title: "Concierge and shared spaces", productSlug: "tripadvisor-review-stand", body: "Make your property’s Tripadvisor profile available beside the concierge or guest information desk. Travelers can open the correct listing to see its public information and available review options. Check the property name and address, especially when neighboring hotels have similar names." },
      { title: "Departure counter", productSlug: "google-review-stand", body: "Offer departing guests a direct route to your hotel’s Google review page after checkout. Place the stand on the guest side of reception, leaving space for luggage tags and payment equipment. Make the invitation available consistently and let guests decide whether and when to review." }
    ],
    steps: [
      { title: "Choose the guest moment", body: "Start with arrival information or departure reviews, depending on your property’s needs. Select a stand that describes that action. For a small guesthouse, one reception stand may be enough; a larger property can use separate destinations at different desks." },
      { title: "Prepare a public mobile destination", body: "Test the information page or property profile without a staff login. Check the property address and language of the destination. If you choose Branded, confirm the property name and logo in the preview before approving the design and completing payment." },
      { title: "Introduce the stand to reception staff", body: "Demonstrate a tap and, for a Branded stand, a QR scan from the guest side of the counter. Explain what the link opens so staff can help visitors. Include a destination check when your team updates seasonal facility hours or property information." }
    ],
    faqs: [
      { question: "Can the stand replace a printed guest information booklet?", answer: "It can link to a public digital guide containing the information you choose to publish. The guide itself lives on your website or existing provider. Keep essential instructions available through your usual guest channels as well, and avoid publishing private room or reservation details through a publicly accessible stand." },
      { question: "Can overseas guests use the same stand?", answer: "The stand opens your destination on their phone. NFC requires a compatible device; a Branded stand also provides a printed QR code. Language, connectivity, and any account requirements depend on the guest’s device and destination website. Consider a mobile page with clear language choices if your property serves international travelers." },
      { question: "Should I link to Google or Tripadvisor?", answer: "Use the public property profile that supports your guest communication strategy and that your team actively maintains. Verify the exact listing rather than a search results page. A stand does not bypass a platform’s review eligibility or sign-in requirements, and guests still decide whether to share their experience." },
      { question: "Can several properties share the same stand design?", answer: "You can use consistent branding while configuring different destination links for each property. Check every address and profile before ordering. Keep the stands organized by property during installation, particularly when the designs look similar, so guests do not reach information or a review page for another location." },
      { question: "Is hotel information hosting included with the stand?", answer: "A direct stand opens one link you supply and does not include a new hotel website or booking system. Optional hosted Multi-Link provides an editable page with several destinations for a separate monthly charge. Your existing website and reservation services remain responsible for their own content and operations." }
    ]
  },
  "healthcare-dental": {
    headline: "NFC & QR Stands for Dental & Healthcare Practices",
    seoTitle: "NFC & QR Stands for Dental & Healthcare Practices",
    seoDescription: "Connect visitors to patient resources, practice information, and service pages. Explore healthcare NFC stands, Branded + QR designs, and reception placement tips.",
    introduction: "Help visitors find your practice’s public information without searching through similar clinic names. Tap Rater stands open an existing patient resource page, service overview, or practice website from a reception counter. Choose a destination that answers routine questions and is appropriate for anyone in the waiting room to access. Standard offers NFC tapping; Branded adds the practice name, logo, and a printed QR code. Your existing systems continue to handle appointments, records, and private communication.",
    recommendationsTitle: "Recommended Stands for Practices and Clinics",
    placementTitle: "Where to Place Stands in Your Practice",
    howItWorksTitle: "How Your Practice Stand Works",
    faqTitle: "Healthcare and Dental Stand FAQs",
    recommendations: [
      { productSlug: "patient-resources-stand", goal: "Make public patient resources easier to find", reason: "Open your practice’s general resource page with preparation information or useful public links. Choose material intended for all visitors rather than a document tied to a particular patient.", placement: "At reception, where staff can explain the destination." },
      { productSlug: "check-our-information-stand", goal: "Share location and contact information", reason: "Point visitors to the correct office’s hours, directions, accessibility information, and contact options. This is especially helpful when your organization operates several similar-looking practice websites.", placement: "Near the reception exit or information desk." },
      { productSlug: "explore-our-services-stand", goal: "Introduce the services your practice offers", reason: "Let visitors browse the service information your practice has already published. The stand supplies access to that page; it does not provide clinical guidance or assess an individual’s care needs.", placement: "In a quiet, reachable part of the waiting area." }
    ],
    placements: [
      { title: "Reception counter", productSlug: "patient-resources-stand", body: "Help patients find your practice’s public preparation instructions and general resources from reception. Position the stand where visitors can reach it without leaning across staff equipment. Explain that it opens information; it does not check them in or display their personal records." },
      { title: "Waiting area", productSlug: "explore-our-services-stand", body: "Let visitors browse your dental or healthcare practice’s published service information while waiting. Use a mobile page with readable descriptions for the services offered at this office. Keep the stand accessible and the content general, with individual care questions directed to your practice team." },
      { title: "Departure and information point", productSlug: "check-our-information-stand", body: "Make it easier for visitors to find this clinic’s directions, opening hours, and contact details before their next visit. Place the stand near the reception exit or information desk. Confirm that the destination identifies the correct office when your practice operates several locations." }
    ],
    steps: [
      { title: "Select a public information task", body: "Choose a resource, location, or service page that your team is comfortable making available at reception. Match the stand wording to that destination. Check that it does not promise a function, such as check-in or appointment confirmation, that the linked page does not provide." },
      { title: "Review the destination with your team", body: "Open the page from a visitor’s perspective and verify the practice name, office address, and mobile readability. Keep patient-specific links in your existing communication systems. Review the Branded design’s practice details before approval if you want a printed QR alongside NFC." },
      { title: "Test the visitor experience", body: "Try the stand from the public side of the desk and confirm that the destination opens correctly. Show reception staff how to describe the link. Recheck it whenever your practice changes websites, resource providers, locations, or the structure of its public information pages." }
    ],
    faqs: [
      { question: "Does the stand act as a patient portal?", answer: "No. A stand opens a destination URL; it is not a patient portal, clinical system, or medical record service. Your existing providers handle authentication and private information. For a shared reception stand, choose a public practice resource rather than a link containing an individual patient’s details or session information." },
      { question: "Can I link to appointment information?", answer: "You can link to your practice’s public appointment information or existing booking page. The destination provider handles availability, submissions, and confirmations. Make the stand’s purpose clear to visitors, and test the entire mobile journey before ordering so they understand whether they are reading information or making a request." },
      { question: "Which design works for a reception desk?", answer: "Standard provides a ready-made NFC design. Branded adds your practice name, logo, and printed QR code for visitors who prefer scanning. Choose the available option on the product page and place it where the invitation is visible. Staff assistance remains useful for visitors who do not use a compatible phone." },
      { question: "Can each clinic location have different resources?", answer: "Yes. Configure stands with the correct location’s destination, even when the practices share a brand. Check the address, phone number, and service information on each linked page. Keep a simple installation record so stands are not accidentally moved between offices with different resource or appointment links." },
      { question: "Do I need a new website or subscription?", answer: "You can use an existing public page with a direct stand, without a Tap Rater hosted subscription. Optional Multi-Link is available for several destinations on one editable page with a separate monthly charge. It does not replace your practice website, booking provider, or systems used for private patient communication." }
    ]
  },
  "home-services": {
    headline: "NFC & QR Stands for Contractors & Home Services",
    seoTitle: "NFC & QR Stands for Contractors & Home Services",
    seoDescription: "Help homeowners explore your services, find business information, and open Google reviews. Compare NFC stands for showrooms, trade events, and service counters.",
    introduction: "Turn a showroom conversation or trade event visit into a clear next step for homeowners. Tap Rater stands connect your physical display to your existing service information, project pages, or Google review destination. Choose a public link that explains what you do and the areas you serve, then place it where customers already stop to ask questions. Standard stands use NFC; Branded designs add your business name, logo, and printed QR code for a scan option.",
    recommendationsTitle: "Recommended Stands for Home Service Businesses",
    placementTitle: "Where Contractors Can Use NFC Stands",
    howItWorksTitle: "How Your Home Services Stand Works",
    faqTitle: "Contractor and Home Services Stand FAQs",
    recommendations: [
      { productSlug: "explore-our-services-stand", goal: "Show homeowners what you offer", reason: "Open your public service page with the work you undertake, service areas, and next-step information. Let prospects browse the details after a conversation instead of relying on a remembered business name.", placement: "At a showroom consultation table or exhibition booth." },
      { productSlug: "google-review-stand", goal: "Connect customers to your Google review page", reason: "Make your business’s review destination available after a completed customer interaction. Use the profile that represents your company and leave the choice of rating and comments with the customer.", placement: "At a reception or completed-project handover desk." },
      { productSlug: "check-our-information-stand", goal: "Share contact and project information", reason: "Send visitors to a stable page containing your public contact details, opening hours, or project gallery. Keep customer-specific quotes and private project documents in your usual communication channels.", placement: "Beside samples, brochures, or a service counter." }
    ],
    placements: [
      { title: "Showroom consultation tables", productSlug: "explore-our-services-stand", body: "Help homeowners explore your installation, repair, or renovation services while discussing samples at a consultation table. Link to a public service page that explains the work you undertake and the areas you cover. An enquiry or quote form, if included, stays with your existing website provider." },
      { title: "Trade shows and local events", productSlug: "check-our-information-stand", body: "Give visitors at your home-improvement booth a page they can revisit for contact details, service areas, and completed-project examples. Choose a stable business information URL rather than an event-only promotion. Test it at the venue before welcoming homeowners to the display." },
      { title: "Reception and handover desks", productSlug: "google-review-stand", body: "Make your Google review destination available when a customer finishes a project discussion or collects completion documents. Keep the stand at a clear handover or reception desk and separate the invitation from invoices and warranty decisions. Customers choose their own rating and comments." }
    ],
    steps: [
      { title: "Choose one homeowner action", body: "Decide whether visitors need a service overview, project information, or your review destination. Match the stand to that purpose and the place it will sit. Start with the location that receives the most relevant in-person questions rather than duplicating every digital channel." },
      { title: "Prepare the right public page", body: "Check that your destination describes your service area and provides a clear way to contact the business. Test it without being signed into your website editor. For Branded designs, confirm the company name and logo in the preview before approving the order." },
      { title: "Demonstrate it during conversations", body: "Show your team what opens when a customer taps or scans. Keep the stand facing visitors, with room for a phone to approach it. Review the destination after a website redesign or service-area change so an old link does not interrupt a promising enquiry." }
    ],
    faqs: [
      { question: "Can the stand open a quote request form?", answer: "An information or service stand can point to your existing public enquiry page. Your website or form provider handles the submission and follow-up. Choose a general form intended for new enquiries, rather than a private estimate or a link containing a previous customer’s project details or personal information." },
      { question: "Is it useful for a contractor without a showroom?", answer: "It can be useful at trade shows, consultation venues, or another stable tabletop setting where you meet customers. Think about the physical placement first. A stand needs a visible, reachable surface; it is not a substitute for every contact method used by technicians working across different homes." },
      { question: "Can I show a portfolio of completed projects?", answer: "Yes. Link to a public gallery or portfolio page you maintain, using images and project details you have permission to publish. Your website controls the gallery and its updates. Keep the destination focused enough that homeowners can understand your services without navigating through unrelated pages on a small screen." },
      { question: "Will the stand create Google reviews automatically?", answer: "No. It provides access to the review destination for your business. Customers decide whether to sign in, write a review, or leave a rating. The stand does not guarantee reviews, ratings, or enquiries, and should not be used to offer rewards in exchange for a particular response." },
      { question: "Can my service links change without new printed copy?", answer: "Content at the same destination URL can be maintained through your website. A direct stand opens the link configured for it, so changing the actual address is a separate consideration. If you regularly need several editable destinations, compare optional hosted Multi-Link and its monthly charge before choosing your setup." }
    ]
  },
  legal: {
    headline: "NFC & QR Stands for Law Firms & Legal Offices",
    seoTitle: "NFC & QR Stands for Law Firms & Legal Offices",
    seoDescription: "Share public firm information, practice areas, and professional profiles from reception. Explore law office NFC stands, Branded + QR designs, and setup guidance.",
    introduction: "Give visitors a straightforward way to find your firm’s public information while they are at reception or meeting your team at an event. Tap Rater stands open an existing website, practice-area overview, or professional profile from a phone. Choose a destination that is appropriate for general visitors and clearly identifies the office they are visiting. Standard offers NFC; Branded adds your firm name, logo, and a printed QR code. Private client communication stays with your existing systems.",
    recommendationsTitle: "Recommended Stands for Law Firms",
    placementTitle: "Where to Place Stands in a Legal Office",
    howItWorksTitle: "How Your Law Office Stand Works",
    faqTitle: "Law Firm Stand FAQs",
    recommendations: [
      { productSlug: "check-our-information-stand", goal: "Share public office information", reason: "Open a page with your office address, contact details, and visitor information. Choose a firm-controlled destination that makes it easy to identify the right branch and understand the next available step.", placement: "At reception or the visitor information desk." },
      { productSlug: "explore-our-services-stand", goal: "Introduce your practice areas", reason: "Help visitors find the public descriptions your firm has prepared for its services. The stand opens the page; it does not provide legal advice, assess a matter, or establish a professional relationship.", placement: "In a reception waiting area or public event display." },
      { productSlug: "linkedin-follow-stand", goal: "Connect visitors with your professional profile", reason: "Direct event attendees and professional contacts to the firm’s LinkedIn page. Use the public profile your team keeps current so the stand supports the introduction already taking place in person.", placement: "On a networking table or seminar registration desk." }
    ],
    placements: [
      { title: "Reception desk", productSlug: "check-our-information-stand", body: "Help visitors find your law office’s address, opening hours, and contact options from the public side of reception. Link to the appropriate office page, especially if the firm has several branches. Keep the stand distinct from any arrival registration or confidential client-intake process." },
      { title: "Waiting and consultation areas", productSlug: "explore-our-services-stand", body: "Give visitors a route to the practice-area descriptions your firm publishes, such as estate planning, family law, or commercial services. Place the stand beside general firm literature. Your team’s existing consultation and intake processes continue to handle questions about an individual matter." },
      { title: "Seminars and professional events", productSlug: "linkedin-follow-stand", body: "Connect seminar attendees and professional contacts to the firm’s LinkedIn updates from a registration or networking table. Use the public firm profile your team maintains and make the destination clear on the display. Visitors choose whether to follow after opening the page." }
    ],
    steps: [
      { title: "Define the public destination", body: "Choose office information, practice areas, or a professional profile according to the setting. Use wording that accurately describes what opens. Keep this page separate from any process your firm uses for confidential intake, engagement decisions, or individual client communication." },
      { title: "Review the link and design", body: "Ask the person responsible for your public website to confirm the destination and office details. Test the page without a staff login. If ordering Branded, review the firm name and approved logo in the preview before completing the design approval and payment steps." },
      { title: "Check the reception experience", body: "Test NFC and any included QR code from the visitor side of the counter. Explain the destination to reception staff so they can describe it accurately. Revisit the link when the firm changes offices, public profiles, or its website navigation." }
    ],
    faqs: [
      { question: "Can visitors send confidential documents through the stand?", answer: "The stand itself does not collect or protect documents; it opens the destination you supply. Use your firm’s established systems for confidential communication. A public reception stand is best linked to general information, with any private intake or document-handling process reviewed and managed by your existing providers and team." },
      { question: "Can the stand link to a consultation booking page?", answer: "You can choose a public information page that includes your existing consultation booking process. The scheduling provider handles available times and submitted details. Ensure visitors understand what a booking request means and test the destination carefully; tapping a stand alone does not confirm a meeting or create an engagement." },
      { question: "Should the link represent an attorney or the whole firm?", answer: "Match the link to the stand’s location and purpose. A shared reception counter usually needs firm or office information, while a professional event may call for an individual public profile. Confirm the intended identity in the design and destination so visitors are not surprised by the page they reach." },
      { question: "Can multiple offices use consistent branding?", answer: "Yes. Branded designs can use the firm’s identity while individual stands open different office destinations. Check each branch address and public contact information before ordering. Keep an installation record when distributing similar-looking stands, especially if the offices have separate websites, scheduling links, or professional directory pages." },
      { question: "What ongoing service does a direct stand require?", answer: "A direct stand opens one supplied URL without a Tap Rater hosted subscription. Your firm still maintains the destination page and any services behind it. Optional hosted Multi-Link offers several editable destinations for a separate monthly charge; it is a link page, not a legal practice management or client portal system." }
    ]
  },
  "real-estate": {
    headline: "NFC & QR Stands for Real Estate Agents & Open Houses",
    seoTitle: "NFC & QR Stands for Real Estate Agents & Open Houses",
    seoDescription: "Connect open house visitors to property information, agent profiles, and Instagram. Compare real estate NFC stands, Branded + QR options, and placement ideas.",
    introduction: "Help open house visitors and office guests find the property information they want to take away. Tap Rater stands connect a tabletop display to your existing public property page, agent profile, or social account. Choose a destination that stays useful after the conversation ends, and make sure the stand’s identity matches the agent or office hosting the visit. Standard supports NFC tapping; Branded adds your name, logo, and printed QR so visitors can also scan.",
    recommendationsTitle: "Recommended Stands for Real Estate Professionals",
    placementTitle: "Where to Place Real Estate Stands",
    howItWorksTitle: "How Your Real Estate Stand Works",
    faqTitle: "Real Estate Stand FAQs",
    recommendations: [
      { productSlug: "check-our-information-stand", goal: "Share public property and office information", reason: "Open a property overview or agent website that visitors can revisit after a tour. Use a stable public destination and keep the available listing information current through your existing website.", placement: "On the welcome table at an open house." },
      { productSlug: "zillow-review-stand", goal: "Open your Zillow professional profile", reason: "Give visitors a route to the profile you already maintain. Verify that the supplied URL identifies the right professional or business and shows the public information you intend to share.", placement: "At your office reception or client meeting table." },
      { productSlug: "instagram-follow-stand", goal: "Help visitors follow your property updates", reason: "Connect guests to your public Instagram profile for listings, neighborhood features, and updates your team publishes. The stand opens the account; visitors decide whether to follow.", placement: "Beside brochures or a clearly identified agent display." }
    ],
    placements: [
      { title: "Open house welcome table", productSlug: "check-our-information-stand", body: "Let visitors open a mobile property overview while collecting a brochure at the welcome table. Include the public listing details and agent contact options you want them to revisit after the tour. Use a stable listings page if the stand moves between properties, and recheck the destination before each open house." },
      { title: "Agency reception", productSlug: "zillow-review-stand", body: "Make your Zillow professional profile easy to find when clients meet you at the agency. Confirm that the destination identifies the intended agent or team and displays the public information you want visitors to explore. Label shared reception displays clearly when several agents use the same office." },
      { title: "Property displays and local events", productSlug: "instagram-follow-stand", body: "Keep a neighborhood or property conversation going through the Instagram profile where you publish listings and local updates. Place the stand beside your agent display or brochures. A profile URL stays useful longer than a single property post, but still needs checking when account details change." }
    ],
    steps: [
      { title: "Choose a lasting visitor destination", body: "Decide whether the stand should open one property, your broader website, or a professional profile. Consider how long the destination will remain useful. A stable listings page may suit a stand used repeatedly, while a property-specific URL needs careful management as the listing changes." },
      { title: "Confirm identity and content", body: "Test the public link on a phone and confirm the agent, office, and property details. Check that photos and descriptions are appropriate to share. For a Branded design, review the business name and logo so the physical stand and online destination clearly belong together." },
      { title: "Test before every event", body: "Set up the stand where a visitor can reach it without moving brochures or other materials. Try NFC and the printed QR if included. Make the link check part of your open house preparation, especially when you change properties or update a website’s listing addresses." }
    ],
    faqs: [
      { question: "Can I use the same stand at different open houses?", answer: "A direct stand opens its configured URL, so a stable page on your website can be useful across events when you maintain the content there. Do not assume a new property address automatically changes the stand’s link. Plan the destination before ordering and review it each time the stand moves." },
      { question: "Does tapping the stand register a lead?", answer: "Opening a link does not automatically register a visitor or submit contact details. If your destination includes a form, your existing website or form provider manages that process. Make the purpose of any sign-up clear and keep the stand’s wording consistent with what a visitor actually sees." },
      { question: "Can visitors open a listing without following my social account?", answer: "Yes, if the stand points directly to a public property or website page that allows it. A social profile may have different viewing or sign-in requirements. Choose a destination based on the information visitors need, and test it from a phone that is not signed into your own accounts." },
      { question: "Which design suits an open house?", answer: "Branded + QR offers your identity with both NFC and a printed scanning option, which can be useful for visitors approaching a welcome table. Standard is NFC-only. Check the product’s available options and place the stand within reach rather than expecting guests to interact with it from across a room." },
      { question: "Can one stand offer listings, contact details, and social links?", answer: "Optional hosted Multi-Link provides several destinations on an editable page for a separate monthly charge. A direct stand instead opens one supplied URL, which could be your existing website. Compare the two approaches based on who maintains your links and how often your open house information changes." }
    ]
  },
  "beauty-salon-wellness": {
    headline: "NFC & QR Stands for Salons, Spas & Beauty Businesses",
    seoTitle: "NFC & QR Stands for Salons, Spas & Beauty Businesses",
    seoDescription: "Help salon clients explore services, discover your Instagram portfolio, and find Google reviews. Compare NFC stands, Branded + QR designs, and reception tips.",
    introduction: "Keep the connection going after an appointment at your salon, spa, barbershop, or beauty studio. Tap Rater stands open your existing service page, Instagram profile, or Google review destination from a reception desk. Give each stand a clear role so clients know whether they are browsing treatments, viewing your work, or sharing their experience. Standard designs offer NFC; Branded adds your business identity and a printed QR code for clients who prefer scanning with their phone.",
    recommendationsTitle: "Recommended Stands for Salons and Beauty Studios",
    placementTitle: "Where to Place Stands in Your Salon or Spa",
    howItWorksTitle: "How Your Salon Stand Works",
    faqTitle: "Salon, Spa, and Beauty Stand FAQs",
    recommendations: [
      { productSlug: "instagram-follow-stand", goal: "Share your latest work and inspiration", reason: "Open your public Instagram portfolio so clients can explore styles and updates after their visit. Use a profile your team actively maintains and show work you have permission to share.", placement: "At checkout or beside the retail product display." },
      { productSlug: "explore-our-services-stand", goal: "Make your service information easy to browse", reason: "Link to your existing service menu with descriptions, prices, or a route to booking. Your website or booking provider remains responsible for availability and appointment confirmations.", placement: "At reception or in the waiting area." },
      { productSlug: "google-review-stand", goal: "Open your salon’s Google review destination", reason: "Give clients a convenient way to find the correct location’s review page. Leave the timing, wording, and rating up to them rather than making feedback part of a discount or reward.", placement: "Beside checkout after the appointment is complete." }
    ],
    placements: [
      { title: "Reception and waiting area", productSlug: "explore-our-services-stand", body: "Let salon and spa clients browse your current treatment menu, prices, and available service information while waiting. Link to the page for that location, with a clear route to your existing booking provider if offered. The provider continues to manage appointments and confirmations." },
      { title: "Checkout counter", productSlug: "google-review-stand", body: "Make your salon’s Google review page available once the appointment is complete. Leave enough space beside checkout for a phone to reach the stand, separate from payment and tipping instructions. Offer the same optional invitation to all clients without connecting feedback to a discount." },
      { title: "Retail display or portfolio area", productSlug: "instagram-follow-stand", body: "Help clients discover your latest styles, finished work, and salon updates on Instagram while browsing aftercare products. Place the stand beside the retail display or portfolio, away from wet treatment surfaces. Use the salon’s maintained public profile so clients can choose whether to follow." }
    ],
    steps: [
      { title: "Choose the client action", body: "Pick service browsing, social connection, or reviews as the first use. Match the product to the point in the visit where that action makes sense. One well-placed stand can be easier for staff to explain than a collection of unrelated links at reception." },
      { title: "Check the salon and provider details", body: "Open the destination as a client would and verify the location, service menu, and public profile. If booking is available, confirm that it leads to the right team or provider. Review your logo and business name in the Branded design preview before approval." },
      { title: "Make the stand part of reception setup", body: "Test a tap and any included QR scan from the client side of the desk. Show staff which page opens and how to describe it briefly. Recheck the destination when your booking provider, team structure, service menu, or social profile address changes." }
    ],
    faqs: [
      { question: "Can clients book their next appointment from a stand?", answer: "A service page can include a link to your existing booking provider. The provider handles available times, deposits, cancellations, and confirmations; the stand does not manage those functions. Choose a destination that clearly identifies the salon location and service provider so clients can take the next step without guessing." },
      { question: "Can separate stylists use different destinations?", answer: "Yes. You can configure stands for different public profiles or service pages. Decide whether a shared reception stand should represent the whole salon or a specific provider. Use clear branding and placement, and check the destination whenever a team member’s booking address or public profile changes." },
      { question: "Should I choose Instagram or a Google Review stand first?", answer: "Choose based on the conversation you want to support. Instagram suits showing your portfolio and keeping clients connected with updates. Google suits making the review destination accessible after a visit. Neither action happens automatically; clients decide whether to follow, sign in, or submit feedback when the page opens." },
      { question: "Can the stand match my salon branding?", answer: "Choose Branded where available to add your business name, logo, and a printed QR code alongside NFC. Review the design preview before payment to confirm the details. Standard offers a ready-made NFC-only design. Current options and prices appear on the product page so you can compare them before ordering." },
      { question: "Can I combine my service menu and social profiles?", answer: "You can link directly to an existing website that already offers those choices, or compare optional hosted Multi-Link for an editable page with several destinations. Multi-Link has a separate monthly charge. Your booking platform continues to handle appointments, while the stand and link page help clients reach it." }
    ]
  },
  "ecommerce-online-brand": {
    headline: "NFC & QR Stands for Online Brands & Pop-Up Shops",
    seoTitle: "NFC & QR Stands for Online Brands & Pop-Up Shops",
    seoDescription: "Bring your online brand to markets and pop-ups with NFC stands for store information, Instagram, and TikTok. Compare Branded + QR options and event setup tips.",
    introduction: "Connect an in-person product discovery with the online brand you have built. Tap Rater stands help shoppers at pop-ups, markets, and showrooms open your existing store information or social profiles on their phones. Choose a destination they can revisit after the event, rather than making them remember an account name. Standard uses NFC tapping; Branded adds your logo, business name, and printed QR code. Your ecommerce platform continues to manage shopping, payments, shipping, and customer accounts.",
    recommendationsTitle: "Recommended Stands for Online Brands",
    placementTitle: "Where to Place Stands at Pop-Ups and Markets",
    howItWorksTitle: "How Your Brand’s NFC Stand Works",
    faqTitle: "Online Brand and Pop-Up Stand FAQs",
    recommendations: [
      { productSlug: "check-our-information-stand", goal: "Open your brand’s public store information", reason: "Send shoppers to a useful website page with product information, store links, or care guidance. Choose a stable destination that remains helpful when the event is over.", placement: "Beside your main product display or information table." },
      { productSlug: "instagram-follow-stand", goal: "Connect visitors to your Instagram brand page", reason: "Give shoppers a route to product photography, launches, and updates you publish. This supports an ongoing connection without requiring visitors to search through similarly named accounts.", placement: "At the checkout or packing counter." },
      { productSlug: "tiktok-follow-stand", goal: "Share your demonstrations and brand stories", reason: "Open the TikTok profile where you publish product videos or behind-the-scenes content. Check how the public profile appears on a phone before using it as the event destination.", placement: "Near a product demonstration or discovery display." }
    ],
    placements: [
      { title: "Product discovery table", productSlug: "check-our-information-stand", body: "Connect a pop-up display to your online brand’s product information, care guidance, or store page. Choose a destination that remains useful after the event and when individual items sell out. Keep it beside the relevant products so shoppers understand what they will find before tapping." },
      { title: "Checkout and packing station", productSlug: "instagram-follow-stand", body: "Give customers waiting for gift wrapping or packing a way to find your brand’s launches and product photography on Instagram. Place the stand on the shopper’s side of the counter with room for bags and receipts. Make clear that opening the profile is optional and separate from paying for the order." },
      { title: "Demonstration area", productSlug: "tiktok-follow-stand", body: "Let shoppers revisit the product demonstrations and behind-the-scenes videos you share on TikTok after leaving your booth. Place the stand next to the demonstration table and test the public profile on a phone. The profile should support the explanation your team gives at the event." }
    ],
    steps: [
      { title: "Choose what happens after discovery", body: "Decide whether visitors should explore your website or find a social profile. Choose the stand that matches that next step. Avoid a destination tied to one shopping cart or a temporary session; the same public link should work for different visitors throughout the event." },
      { title: "Review the mobile brand experience", body: "Test your link on a phone without using a store administrator login. Confirm the brand name, page loading, and navigation back to relevant products. If you choose Branded, approve the business details and logo in the design preview before payment." },
      { title: "Include a link test in event setup", body: "After arranging the display, try the stand from the shopper’s side of the table. Check NFC and the printed QR if included. Make sure staff know the destination and recheck it before the next pop-up, especially after a store redesign or social account change." }
    ],
    faqs: [
      { question: "Does Tap Rater process online orders from the stand?", answer: "No. The stand opens your supplied destination, and your ecommerce platform handles products, carts, payments, shipping, and customer accounts. Choose a public store or information page that works for new visitors. A stand is a way to reach that experience, not a replacement for your online checkout." },
      { question: "Can shoppers use the link after the pop-up ends?", answer: "They can revisit a public page through their browser history or other ways they save it. Choose a destination you intend to maintain after the event, such as your main store information or social profile. Avoid building the experience around a temporary promotion that will leave visitors at an expired page." },
      { question: "Can one stand connect to multiple social channels?", answer: "A direct stand opens one destination. If you want to offer several channels and a store link together, you can use an existing page on your own website or optional hosted Multi-Link for a separate monthly charge. Pick the approach that fits how your team maintains its campaign and store links." },
      { question: "Will tapping automatically subscribe someone to updates?", answer: "No. Opening a website or social profile does not automatically subscribe a visitor or submit their contact information. Any newsletter form belongs to your existing provider, and a social follow is the visitor’s choice. Describe the destination clearly rather than implying that tapping completes a sign-up." },
      { question: "Which design should I take to a market?", answer: "Branded + QR gives shoppers both a tap and a camera-scan option while displaying your business identity. Standard is NFC-only. Compare available designs on the product page and plan for a reachable tabletop position. Check the venue connection before relying on any online destination as your only source of product information." }
    ]
  },
  "retail-local-business": {
    headline: "NFC & QR Stands for Retail Stores & Local Shops",
    seoTitle: "NFC & QR Stands for Retail Stores & Local Shops",
    seoDescription: "Help shoppers find Google reviews, store information, and Instagram updates. Explore retail NFC stands, Branded + QR designs, and practical checkout placement tips.",
    introduction: "Make your shop’s online information easy to reach while customers are already at the counter. Tap Rater stands open your store’s review page, public information, or social profile with a phone. Choose one clear action for each setting, from service questions at a help desk to updates at checkout. Standard stands provide NFC tapping; Branded adds your store name, logo, and a printed QR code. Your existing website and systems remain responsible for sales and customer services.",
    recommendationsTitle: "Recommended Stands for Retail and Local Businesses",
    placementTitle: "Where to Place Stands in Your Shop",
    howItWorksTitle: "How Your Retail Stand Works",
    faqTitle: "Retail and Local Business Stand FAQs",
    recommendations: [
      { productSlug: "google-review-stand", goal: "Make your store’s Google review page easy to find", reason: "Offer shoppers a route to the review destination for the branch they visited. Keep feedback optional and separate from discounts, returns decisions, or any request for a particular rating.", placement: "Beside checkout, clear of the payment terminal." },
      { productSlug: "check-our-information-stand", goal: "Answer routine store information questions", reason: "Link to a public page with hours, contact details, services, or collection information. Keep those details up to date on your existing website so shoppers can revisit them later.", placement: "At the service counter or collection desk." },
      { productSlug: "instagram-follow-stand", goal: "Share new arrivals and store updates", reason: "Open the Instagram profile you use for product launches and shop news. A visible account destination helps shoppers find the correct store without remembering its exact social handle.", placement: "Near a new-arrivals display or packing area." }
    ],
    placements: [
      { title: "Checkout counter", productSlug: "google-review-stand", body: "Offer shoppers a direct route to this store’s Google review page after their purchase. Place the stand beside checkout with space for bags and the card terminal. For a chain or local business with several branches, verify that the link opens the location the shopper actually visited." },
      { title: "Service and collection desks", productSlug: "check-our-information-stand", body: "Help shoppers find store hours, collection instructions, and public returns information while waiting at the service desk. Keep the destination focused on this branch’s processes. Staff and your existing order systems still handle individual collections, refunds, and private order details." },
      { title: "Seasonal and new-arrivals displays", productSlug: "instagram-follow-stand", body: "Connect a seasonal collection or new-arrivals display to the shop’s Instagram updates. A stable store profile can stay useful as featured products change. Position the stand where customers can reach it without moving merchandise, and check that the account represents the right store." }
    ],
    steps: [
      { title: "Match the stand to the counter", body: "Choose reviews for a completed visit, information for a service desk, or a social profile for product discovery. Start with one clear invitation. If you have multiple checkout lanes, decide whether each needs the same destination or a different customer action." },
      { title: "Verify the store location", body: "Open the link as a shopper and check the branch name, address, and public information. Test how it works without a staff account. Review your store identity in the Branded preview if you want a logo and printed QR alongside the NFC option." },
      { title: "Keep the display and link current", body: "Try the finished stand from the customer side of the counter and demonstrate it to the team. Recheck the destination when opening hours, website addresses, or social handles change. A brief link check during a seasonal display refresh helps keep the experience understandable." }
    ],
    faqs: [
      { question: "Can each store branch open a different review page?", answer: "Yes. Configure each stand with the destination for the correct location, then verify the name and address shown on the page. Keep stands organized by branch when distributing them. Similar branding does not mean the links are interchangeable, particularly when individual shops have separate Google profiles or public service pages." },
      { question: "Can I use a stand for collection or returns information?", answer: "An information stand can open a public page explaining your store’s processes. Your own systems and staff continue to handle individual orders, refunds, and returns. Avoid using a customer-specific order link as the shared destination, and make clear whether the page provides instructions or offers an actual service request form." },
      { question: "Does a Google Review stand guarantee more positive ratings?", answer: "No. It makes the review destination easier to reach, but customers decide whether to leave a review and what rating to give. Offer the option consistently and do not tie it to rewards or a favorable outcome. The platform may also require the shopper to sign in before submitting." },
      { question: "Can shoppers scan instead of using NFC?", answer: "Branded + QR includes a printed QR code as well as NFC, while Standard uses NFC only. Choose an available design on the product page based on the experience you want at the counter. Position the stand within comfortable reach and let customers choose the connection method their phone supports." },
      { question: "Can a stand show several store links at once?", answer: "A direct stand opens one URL, such as your existing store information page. Optional hosted Multi-Link offers an editable page with several destinations for a separate monthly charge. It can provide choices for store information and social profiles, while your existing ecommerce or service providers handle any transactions behind those links." }
    ]
  }
};
